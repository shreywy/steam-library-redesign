'use strict';

const STUB = 'This feature is under development in this prototype.';
const DL_SECONDS = 8;          // simulated download length
const LAUNCH_MS = 1600;        // "Launching..." state
const UNINSTALL_MS = 1800;     // uninstall progress bar

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const win = $('#steam-window');
const mainEl = $('#main');
const listEl = $('#game-list');
const searchEl = $('#search');
const modalRoot = $('#modal-root');
const menuRoot = $('#menu-root');

// ---------- state ----------

let S;
function freshState() {
  return {
    games: structuredClone(GAMES),
    drives: structuredClone(DRIVES),
    filter: 'all',
    search: '',
    route: { view: 'home' },
    back: [], fwd: [],
    download: null,       // { id, done: 0..1, paused, drive, shortcut }
    justFinished: null,   // id shown as "ready" in the downloads bar for a few seconds
    launching: null,      // id
    running: null,        // { id, start }
    uninstalling: null,   // id
    shortcuts: [],        // desktop shortcuts (game ids)
    whatsNewOpen: false,
  };
}

// Every timeout/interval goes through here so Reset can stop all of them.
const timers = new Set();
const after = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const every = (ms, fn) => { const t = setInterval(fn, ms); timers.add(t); return t; };
const stopTimer = t => { clearTimeout(t); timers.delete(t); };

const G = id => S.games.find(g => g.id === id);
const shortName = g => g.short || g.title;
const drive = key => S.drives.find(d => d.key === key);
const gb = n => n >= 100 ? `${Math.round(n)} GB` : `${n.toFixed(1)} GB`;

function parseDate(s) {
  if (!s) return null;
  if (s.length === 10) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  return new Date(s);
}
const TODAY = parseDate(DEMO_TODAY);
const RECENT_CUTOFF = TODAY.getTime() - 14 * 864e5;
const recency = g => Math.max(parseDate(g.lastPlayed)?.getTime() || 0, parseDate(g.added).getTime());
const isRecent = g => recency(g) >= RECENT_CUTOFF;

function fmtDate(s) {
  const d = parseDate(s);
  if (!d) return 'Never';
  if (s.length > 10) return 'Today';
  if (d.getTime() === TODAY.getTime()) return 'Today';
  if (d.getTime() === TODAY.getTime() - 864e5) return 'Yesterday';
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== TODAY.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}
const fmtHours = h => h === 0 ? 'None yet' : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h.toFixed(1)} hrs`;

function status(g) {
  if (S.running?.id === g.id) return 'running';
  if (S.launching === g.id) return 'launching';
  if (S.download?.id === g.id) return S.download.paused ? 'paused' : 'downloading';
  if (S.uninstalling === g.id) return 'uninstalling';
  return g.installed ? 'installed' : 'not-installed';
}
const STATUS_TEXT = {
  running: 'Running', launching: 'Launching…', downloading: 'Downloading', paused: 'Download paused',
  uninstalling: 'Uninstalling…', installed: 'Installed', 'not-installed': 'Not installed',
};

function listGames(filter = S.filter, q = S.search) {
  q = q.trim().toLowerCase();
  let list = S.games.filter(g => filter === 'installed' ? g.installed : filter === 'recent' ? isRecent(g) : true);
  if (q) list = list.filter(g => g.title.toLowerCase().includes(q) || (g.short || '').toLowerCase().includes(q));
  return filter === 'recent'
    ? list.sort((a, b) => recency(b) - recency(a))
    : list.sort((a, b) => a.title.localeCompare(b.title));
}
const collectionGames = c => c.rule ? S.games.filter(c.rule) : c.games.map(G);

// ---------- small html helpers ----------

const ICON = {
  play: '<svg viewBox="0 0 24 24" class="fill"><path d="M7 4.5v15l13-7.5z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M6.5 10L12 15.5 17.5 10M4 20h16"/></svg>',
  pause: '<svg viewBox="0 0 24 24" class="fill"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',
  resume: '<svg viewBox="0 0 24 24" class="fill"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" class="fill"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>',
  dlc: '<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};

// Game art with a gradient fallback if the image is missing.
const art = (g, kind, cls = '') =>
  `<span class="art art-${kind} ${cls}"><img src="assets/${g.id}_${kind}.jpg" alt="" draggable="false" onerror="this.parentNode.classList.add('noimg')"><span class="art-fallback">${esc(shortName(g))}</span></span>`;

function tile(g, i, sub) {
  const st = status(g);
  return `<button class="tile ${g.installed ? '' : 'not-installed'}" data-action="open" data-id="${g.id}" style="--i:${Math.min(i, 14)}" title="${esc(g.title)}">
    ${art(g, 'library')}
    ${st === 'downloading' || st === 'paused' ? `<span class="tile-badge">${st === 'paused' ? 'Paused' : 'Downloading'}</span>` : ''}
    ${st === 'running' ? '<span class="tile-badge running">Running</span>' : ''}
    <span class="tile-title">${esc(g.title)}</span>
    <span class="tile-sub">${sub ?? STATUS_TEXT[st]}</span>
  </button>`;
}

const FILTER_NAME = { all: 'All Games', installed: 'Installed', recent: 'Recent' };

// ---------- rendering ----------

function render({ enter = false, animateList = false } = {}) {
  renderSidebar(animateList);
  renderMain(enter);
  renderDownloads();
  renderDesktop();
  $('#nav-back').disabled = !S.back.length;
  $('#nav-fwd').disabled = !S.fwd.length;
}

function renderSidebar(animate) {
  $$('.filter-toggle button').forEach(b => {
    const on = b.dataset.f === S.filter;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  $('.home-row').classList.toggle('on', S.route.view === 'home');
  if (searchEl.value !== S.search) searchEl.value = S.search;

  const list = listGames();
  const label = FILTER_NAME[S.filter];
  $('#list-head').innerHTML = S.search.trim()
    ? `${esc(label)} <span class="count">(${list.length})</span> <span class="list-q">matching “${esc(S.search.trim())}”</span>`
    : `${esc(label)} <span class="count">(${list.length})</span>`;

  if (!list.length) {
    listEl.innerHTML = emptyState('side');
    return;
  }
  const sel = S.route.id;
  listEl.innerHTML = list.map((g, i) => {
    const st = status(g);
    const right = st === 'downloading' || st === 'paused' ? `<span class="li-pct" data-dl-pct>${Math.floor(S.download.done * 100)}%</span>`
      : st === 'running' ? '<span class="li-run">Running</span>' : '';
    return `<button class="li ${g.installed ? '' : 'not-installed'} ${st} ${g.id === sel ? 'sel' : ''} ${animate ? 'anim' : ''}" style="--i:${Math.min(i, 16)}" data-action="open" data-id="${g.id}">
      <span class="li-icon">${art(g, 'header')}</span><span class="li-name">${esc(g.title)}</span>${right}
    </button>`;
  }).join('');
}

function emptyState(where) {
  const q = S.search.trim();
  const msg = q ? `No ${S.filter === 'all' ? '' : FILTER_NAME[S.filter].toLowerCase() + ' '}games match “${esc(q)}”.`
    : `No ${FILTER_NAME[S.filter].toLowerCase()} games.`;
  return `<div class="empty ${where}">
    <p>${msg}</p>
    <button class="btn" data-action="clear-filters">Clear filters</button>
  </div>`;
}

function renderMain(enter) {
  let r = S.route;
  // a "running" screen for a game that has stopped falls back to its page
  if (r.view === 'running' && S.running?.id !== r.id) r = S.route = { view: 'game', id: r.id };
  const html = r.view === 'home' ? homeView()
    : r.view === 'list' ? listView()
    : r.view === 'collection' ? collectionView(r.cid)
    : r.view === 'dlc' ? dlcView(G(r.id))
    : r.view === 'running' ? runningView(G(r.id))
    : gameView(G(r.id));
  const keepScroll = !enter;
  const y = mainEl.scrollTop;
  mainEl.innerHTML = `<div class="view ${enter ? 'enter' : ''}">${html}</div>`;
  mainEl.scrollTop = keepScroll ? y : 0;
}

function homeView() {
  const recent = [...S.games].filter(isRecent).sort((a, b) => recency(b) - recency(a)).slice(0, 6);
  const sub = g => {
    if (!g.lastPlayed) return `${g.installed ? 'Installed' : 'Not installed'} · Added ${fmtDate(g.added)}`;
    return `${STATUS_TEXT[status(g)]} · Played ${fmtDate(g.lastPlayed)}`;
  };
  return `
    <h1 class="page-title">Library Home</h1>
    <section class="whats-new ${S.whatsNewOpen ? 'open' : ''}">
      <button class="wn-row" data-action="whats-new" aria-expanded="${S.whatsNewOpen}">
        <span class="wn-chev">${ICON.chevron}</span>
        <span class="wn-label">What's New</span>
        <span class="wn-sum">${WHATS_NEW.length} updates from your games</span>
      </button>
      <div class="wn-body"><div>
        ${WHATS_NEW.map(n => `<button class="wn-item" data-action="stub" data-name="Update notes">
          <span class="wn-thumb">${art(G(n.id), 'header')}</span>
          <span><strong>${esc(shortName(G(n.id)))}</strong><span>${esc(n.text)}</span></span>
        </button>`).join('')}
      </div></div>
    </section>

    <section class="shelf">
      <div class="shelf-head"><h2>Recent Games</h2><button class="link-btn" data-action="filter" data-f="recent">See all</button></div>
      <div class="shelf-row">${recent.map((g, i) => tile(g, i, sub(g))).join('')}</div>
    </section>

    <section class="shelf">
      <div class="shelf-head"><h2>Collections</h2></div>
      <div class="collections">${COLLECTIONS.map((c, i) => {
        const gs = collectionGames(c);
        return `<button class="coll" data-action="collection" data-cid="${c.id}" style="--i:${i}">
          <span class="coll-art">${gs.slice(0, 3).map(g => art(g, 'library')).join('') || '<span class="coll-empty">Empty</span>'}</span>
          <span class="coll-name">${esc(c.name)} ${c.auto ? '<span class="auto-tag">Auto</span>' : ''}</span>
          <span class="coll-count">${gs.length} game${gs.length === 1 ? '' : 's'}</span>
        </button>`;
      }).join('')}</div>
    </section>`;
}

function gridOf(games) {
  return games.length ? `<div class="grid">${games.map((g, i) => tile(g, i)).join('')}</div>` : emptyState('big');
}

function listView() {
  const list = listGames();
  return `<div class="list-title"><h1 class="page-title">${FILTER_NAME[S.filter]} <span class="count">(${list.length})</span></h1>
    ${S.search.trim() ? `<span class="list-q">matching “${esc(S.search.trim())}”</span>` : ''}</div>
    ${gridOf(list)}`;
}

function collectionView(cid) {
  const c = COLLECTIONS.find(c => c.id === cid);
  const gs = collectionGames(c);
  return `<div class="list-title"><h1 class="page-title">${esc(c.name)} <span class="count">(${gs.length})</span></h1>
    ${c.auto ? `<span class="auto-tag big">Auto</span><span class="list-q">${esc(c.auto)}. Updates by itself.</span>` : ''}</div>
    ${gs.length ? gridOf(gs) : '<div class="empty big"><p>This collection is empty right now.</p></div>'}`;
}

function hero(g) {
  return `<div class="hero">
    <div class="hero-bg" style="background-image:url('assets/${g.id}_header.jpg')"></div>
    <div class="hero-content">
      ${art(g, 'header', 'hero-art')}
      <div class="hero-text"><h1>${esc(g.title)}</h1><div class="hero-dev">${esc(g.dev)}</div></div>
    </div>
  </div>`;
}

function primaryArea(g) {
  const st = status(g);
  if (st === 'downloading' || st === 'paused') {
    const d = S.download;
    return `<div class="dl-panel ${st}">
      <div class="dl-top"><span class="dl-label">${st === 'paused' ? 'Paused' : 'Downloading'}</span><span class="dl-pct" data-dl-pct>${Math.floor(d.done * 100)}%</span></div>
      <div class="bar"><div class="bar-fill" data-dl-bar style="width:${d.done * 100}%"></div></div>
      <div class="dl-bottom"><span class="dl-meta" data-dl-meta>${dlMeta()}</span>
        <button class="btn small" data-action="pause">${st === 'paused' ? ICON.resume + ' Resume' : ICON.pause + ' Pause'}</button></div>
    </div>`;
  }
  if (st === 'running') return `<button class="btn-main stop" data-action="stop" data-id="${g.id}">${ICON.stop} STOP</button>`;
  if (st === 'launching') return `<button class="btn-main play launching" disabled><span class="spinner"></span> LAUNCHING…</button>`;
  if (st === 'uninstalling') return `<button class="btn-main" disabled>UNINSTALLING…</button>`;
  if (g.installed) return `<button class="btn-main play ${S.justFinished === g.id ? 'pop' : ''}" data-action="play" data-id="${g.id}">${ICON.play} PLAY</button>`;
  return `<button class="btn-main install" data-action="install" data-id="${g.id}">${ICON.download} INSTALL</button>`;
}

function gameView(g) {
  const st = status(g);
  const busy = st !== 'installed';
  const owned = (g.dlc || []).filter(d => d.owned).length;
  const statusLine = {
    'not-installed': `<span class="dot grey"></span>Not installed · Needs ${gb(g.size)} of disk space`,
    installed: `<span class="dot green"></span>Installed on ${esc(drive(g.drive || 'C').name)} · ${gb(g.size)}`,
    running: `<span class="dot green"></span>Running now`,
    launching: `<span class="dot green"></span>Starting ${esc(shortName(g))}…`,
    downloading: `<span class="dot blue"></span>Downloading to ${esc(drive(S.download?.drive || 'C').name)}. Play becomes available when the download finishes.`,
    paused: `<span class="dot blue"></span>Download paused. Press Resume to continue.`,
    uninstalling: `<span class="dot grey"></span>Removing files…`,
  }[st];
  const [got, total] = g.ach;
  return `<div class="game-page ${g.installed ? '' : 'not-installed'}">
    ${hero(g)}
    <div class="actionbar">
      <div class="primary-area">${primaryArea(g)}</div>
      <div class="secondary">
        <button class="btn" data-action="dlc" data-id="${g.id}">${ICON.dlc} Owned DLC${g.dlc ? ` <span class="pill">${owned}</span>` : ''}</button>
        <button class="btn" data-action="stub" data-name="Properties">${ICON.gear} Properties</button>
        ${g.installed && !busy ? `<button class="btn danger-outline" data-action="uninstall" data-id="${g.id}">${ICON.trash} Uninstall</button>` : ''}
      </div>
      <a class="store-link" href="https://store.steampowered.com/app/${g.id}" target="_blank" rel="noopener">Store Page ${ICON.ext}</a>
    </div>
    <div class="status-line">${statusLine}</div>
    <div class="stats">
      <div class="stat"><span class="stat-k">Play time</span><span class="stat-v">${fmtHours(g.playtime)}</span></div>
      <div class="stat"><span class="stat-k">Last played</span><span class="stat-v">${fmtDate(g.lastPlayed)}</span></div>
      <div class="stat"><span class="stat-k">Achievements</span><span class="stat-v">${total ? `${got} / ${total}` : 'None'}</span>
        ${total ? `<span class="bar thin"><span class="bar-fill" style="width:${(got / total) * 100}%"></span></span>` : ''}</div>
      <div class="stat"><span class="stat-k">Size</span><span class="stat-v">${gb(g.size)}</span></div>
    </div>
  </div>`;
}

function dlcView(g) {
  const dlc = g.dlc || [];
  const owned = dlc.filter(d => d.owned).length;
  return `<div class="dlc-page">
    <button class="btn back-btn" data-action="open" data-id="${g.id}">${ICON.back} Back to ${esc(shortName(g))}</button>
    <div class="dlc-head">
      ${art(g, 'header', 'dlc-head-art')}
      <div><h1 class="page-title">Owned DLC</h1>
      <p class="muted">${esc(g.title)} · ${dlc.length ? `You own ${owned} of ${dlc.length} add-ons` : 'No add-ons'}</p></div>
    </div>
    ${dlc.length ? `<ul class="dlc-list">${dlc.map((d, i) => `<li class="dlc-row ${d.owned ? 'owned' : 'missing'}" style="--i:${i}">
        <span class="dlc-name">${esc(d.title)}</span>
        ${d.owned
          ? `<span class="dlc-status ok">${ICON.check} Owned${g.installed ? ' · Installed with the game' : ''}</span>`
          : `<span class="dlc-status no">${ICON.lock} Not owned</span>
             <a class="store-link small" href="https://store.steampowered.com/app/${d.id}" target="_blank" rel="noopener">View in Store ${ICON.ext}</a>`}
      </li>`).join('')}</ul>`
      : `<div class="empty big"><p>There is no DLC for ${esc(g.title)} in your library.</p></div>`}
  </div>`;
}

function runningView(g) {
  return `<div class="running-page">
    <div class="running-bg" style="background-image:url('assets/${g.id}_header.jpg')"></div>
    <div class="running-card">
      ${art(g, 'header', 'running-art')}
      <span class="run-badge"><span class="dot green pulse"></span>Running</span>
      <h1>${esc(g.title)} is running</h1>
      <p class="muted">The game opened in its own window. Session time <span data-run-clock>${runClock()}</span></p>
      <div class="running-actions">
        <button class="btn big" data-action="open" data-id="${g.id}" data-focus>${ICON.back} Back to Library</button>
        <button class="btn big stop-outline" data-action="stop" data-id="${g.id}">${ICON.stop} Stop game</button>
      </div>
    </div>
  </div>`;
}

function runClock() {
  if (!S.running) return '0:00';
  const s = Math.floor((Date.now() - S.running.start) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function dlMeta() {
  const d = S.download, g = G(d.id);
  if (d.paused) return `${gb(g.size * d.done)} of ${gb(g.size)} · Paused`;
  const speed = (g.size / DL_SECONDS) * (1 + 0.06 * Math.sin(Date.now() / 600));
  const left = Math.ceil((1 - d.done) * DL_SECONDS);
  return `${gb(g.size * d.done)} of ${gb(g.size)} · ${speed.toFixed(1)} GB/s · 0:${String(left).padStart(2, '0')} left`;
}

function renderDownloads() {
  const el = $('#downloads');
  const d = S.download;
  if (d) {
    const g = G(d.id);
    el.innerHTML = `<button class="dl-mini" data-action="open" data-id="${g.id}" title="Open ${esc(g.title)}">
        <span class="dl-mini-top"><span class="dl-label">${d.paused ? 'Paused' : 'Downloading'}</span>
        <span class="dl-mini-name">${esc(shortName(g))}</span><span data-dl-pct>${Math.floor(d.done * 100)}%</span></span>
        <span class="bar thin"><span class="bar-fill" data-dl-bar style="width:${d.done * 100}%"></span></span>
      </button>
      <button class="icon-btn" data-action="pause" aria-label="${d.paused ? 'Resume download' : 'Pause download'}" title="${d.paused ? 'Resume' : 'Pause'}">${d.paused ? ICON.resume : ICON.pause}</button>`;
  } else if (S.justFinished) {
    const g = G(S.justFinished);
    el.innerHTML = `<button class="dl-mini done" data-action="open" data-id="${g.id}">${ICON.check} ${esc(shortName(g))} is ready to play</button>`;
  } else {
    el.innerHTML = `<button class="dl-mini idle" data-action="stub" data-name="Downloads">${ICON.download} Manage Downloads</button>`;
  }
}

// Cheap per-tick update so the bar animates smoothly without re-rendering the page.
function updateDownloadUI() {
  const d = S.download;
  if (!d) return;
  $$('[data-dl-bar]').forEach(e => e.style.width = `${d.done * 100}%`);
  $$('[data-dl-pct]').forEach(e => e.textContent = `${Math.floor(d.done * 100)}%`);
  $$('[data-dl-meta]').forEach(e => e.textContent = dlMeta());
}

function renderDesktop() {
  const icons = [
    `<button class="desk-icon" data-action="stub" data-name="Recycle Bin"><span class="bin-icon"></span><span>Recycle Bin</span></button>`,
    `<button class="desk-icon" data-action="taskbar-open"><span class="steam-icon big"></span><span>Steam</span></button>`,
    ...S.shortcuts.map(id => `<button class="desk-icon" data-action="desk-game" data-id="${id}" title="Double-click to play">
      <span class="desk-art">${art(G(id), 'library')}</span><span>${esc(shortName(G(id)))}</span></button>`),
  ];
  $('#desktop-icons').innerHTML = icons.join('');
}

// ---------- navigation ----------

const sameRoute = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function nav(route, { push = true } = {}) {
  closeMenus();
  if (sameRoute(route, S.route)) { render(); return; }
  if (push) { S.back.push(S.route); S.fwd = []; if (S.back.length > 50) S.back.shift(); }
  S.route = route;
  render({ enter: true });
  mainEl.focus({ preventScroll: true });
}

function goBack() {
  if (!S.back.length) return;
  S.fwd.push(S.route);
  S.route = S.back.pop();
  render({ enter: true });
}
function goForward() {
  if (!S.fwd.length) return;
  S.back.push(S.route);
  S.route = S.fwd.pop();
  render({ enter: true });
}

function setFilter(f) {
  S.filter = f;
  if (S.route.view === 'list') { render({ enter: true, animateList: true }); return; }
  S.back.push(S.route); S.fwd = [];
  S.route = { view: 'list' };
  render({ enter: true, animateList: true });
}

let searchTimer;
function onSearch() {
  S.search = searchEl.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    renderSidebar(true);
    if (S.route.view === 'list') renderMain(false);
  }, 60);
}

function clearFilters() {
  S.search = '';
  S.filter = 'all';
  searchEl.value = '';
  render({ animateList: true, enter: S.route.view === 'list' });
  searchEl.focus();
  toast('Filters cleared', `Showing all ${S.games.length} games.`);
}

// ---------- task 1: install, download, play ----------

function askInstall(id) {
  const g = G(id);
  if (!g || g.installed || S.download?.id === id) return;
  if (S.download) {
    toast('Another download is running', `Wait for ${shortName(G(S.download.id))} to finish, then install ${shortName(g)}.`);
    return;
  }
  const driveRow = d => {
    const used = (d.total - d.free) / d.total * 100;
    const ok = d.free >= g.size;
    return `<label class="drive ${ok ? '' : 'short'}">
      <input type="radio" name="drive" value="${d.key}" ${d.key === 'C' ? 'checked' : ''}>
      <span class="drive-body">
        <span class="drive-top"><strong>${esc(d.name)}</strong><span>${gb(d.free)} free of ${gb(d.total)}</span></span>
        <span class="bar thin drive-bar"><span class="bar-fill" style="width:${used}%"></span></span>
      </span>
    </label>`;
  };
  openModal(`
    <h2 id="m-title">Install ${esc(g.title)}</h2>
    <div class="install-summary">${art(g, 'header')}<div>
      <div class="kv"><span>Disk space required</span><strong>${gb(g.size)}</strong></div>
      <div class="kv"><span>Estimated download time</span><strong>Under a minute</strong></div>
    </div></div>
    <fieldset class="drives"><legend>Install location</legend>${S.drives.map(driveRow).join('')}</fieldset>
    <p class="field-error" id="drive-error" role="alert" hidden></p>
    <label class="check"><input type="checkbox" id="opt-desktop" checked> Create desktop shortcut</label>
    <label class="check"><input type="checkbox" id="opt-start" checked> Create Start menu shortcut</label>
    <div class="modal-actions">
      <button class="btn" data-m="cancel">Cancel</button>
      <button class="btn primary" data-m="confirm" data-focus>${ICON.download} Install</button>
    </div>`, {
    confirm: () => {
      const key = $('input[name="drive"]:checked', modalRoot).value;
      if (drive(key).free < g.size) return;
      const shortcut = $('#opt-desktop', modalRoot).checked;
      closeModal(true);
      startDownload(id, key, shortcut);
    },
    change: () => {
      const d = drive($('input[name="drive"]:checked', modalRoot).value);
      const ok = d.free >= g.size;
      const err = $('#drive-error', modalRoot);
      err.hidden = ok;
      err.textContent = ok ? '' : `Not enough space on ${d.name}. ${g.title} needs ${gb(g.size)} but only ${gb(d.free)} is free. Choose another drive.`;
      $('[data-m="confirm"]', modalRoot).disabled = !ok;
    },
  });
}

function startDownload(id, driveKey, shortcut) {
  if (S.download) return;
  S.download = { id, done: 0, paused: false, drive: driveKey, shortcut };
  S.justFinished = null;
  S.dlTimer = every(100, tickDownload);
  render();
  toast('Download started', `${G(id).title} · ${gb(G(id).size)} to ${drive(driveKey).name}`);
}

function tickDownload() {
  const d = S.download;
  if (!d || d.paused) return;
  d.done = Math.min(1, d.done + 0.1 / DL_SECONDS);
  if (d.done >= 1) finishDownload(); else updateDownloadUI();
}

function togglePause() {
  if (!S.download) return;
  S.download.paused = !S.download.paused;
  render();
}

function finishDownload() {
  const d = S.download, g = G(d.id);
  stopTimer(S.dlTimer);
  g.installed = true;
  g.drive = d.drive;
  drive(d.drive).free -= g.size;
  if (d.shortcut && !S.shortcuts.includes(g.id)) S.shortcuts.push(g.id);
  S.download = null;
  S.justFinished = g.id;
  after(5000, () => { if (S.justFinished === g.id) { S.justFinished = null; renderDownloads(); } });
  render();
  toast(`${g.title} is ready to play`, `Installed on ${drive(d.drive).name}${d.shortcut ? ' with a desktop shortcut' : ''}. Press PLAY to start.`, 'success');
}

function play(id) {
  const g = G(id);
  if (!g?.installed || S.launching || S.uninstalling === id) return;
  if (S.running) {
    if (S.running.id === id) { nav({ view: 'running', id }); return; }
    toast(`${shortName(G(S.running.id))} is already running`, 'Stop it before starting another game.');
    return;
  }
  S.launching = id;
  S.justFinished = null;
  render();
  after(LAUNCH_MS, () => {
    S.launching = null;
    S.running = { id, start: Date.now() };
    g.lastPlayed = new Date().toISOString();
    S.runTimer = every(1000, () => $$('[data-run-clock]').forEach(e => e.textContent = runClock()));
    nav({ view: 'running', id });
  });
}

function stopGame() {
  if (!S.running) return;
  const g = G(S.running.id);
  const mins = Math.max(1, Math.round((Date.now() - S.running.start) / 60000));
  g.playtime += mins / 60;
  stopTimer(S.runTimer);
  S.running = null;
  if (S.route.view === 'running') { S.route = { view: 'game', id: g.id }; render({ enter: true }); } else render();
  toast(`${g.title} closed`, `You played for ${mins} min. Play time updated.`);
}

// ---------- task 3: DLC and uninstall ----------

function askUninstall(id) {
  const g = G(id);
  if (!g?.installed || S.uninstalling || S.download?.id === id) return;
  if (S.running?.id === id || S.launching === id) { toast(`${shortName(g)} is running`, 'Stop the game before uninstalling it.'); return; }
  const dlcOwned = (g.dlc || []).filter(d => d.owned).length;
  openModal(`
    <h2 id="m-title">Uninstall ${esc(g.title)}?</h2>
    <div class="uninstall-body">
      ${art(g, 'header')}
      <div>
        <p>This removes the game files from <strong>${esc(drive(g.drive || 'C').name)}</strong> and frees <strong>${gb(g.size)}</strong>.</p>
        <p class="muted">${esc(shortName(g))}${dlcOwned ? ` and your ${dlcOwned} DLC stay` : ' stays'} in your Library. You can install it again any time.</p>
      </div>
    </div>
    <div class="uninstall-progress" hidden>
      <p>Uninstalling ${esc(shortName(g))}…</p>
      <div class="bar"><div class="bar-fill timed"></div></div>
    </div>
    <div class="modal-actions">
      <button class="btn" data-m="cancel" data-focus>Cancel</button>
      <button class="btn danger" data-m="confirm">${ICON.trash} Uninstall</button>
    </div>`, {
    confirm: () => runUninstall(id),
  });
}

function runUninstall(id) {
  if (S.uninstalling) return;
  const g = G(id);
  S.uninstalling = id;
  M.locked = true;
  $('.uninstall-body', modalRoot).hidden = true;
  $('.modal-actions', modalRoot).hidden = true;
  $('.uninstall-progress', modalRoot).hidden = false;
  $('#m-title', modalRoot).textContent = `Uninstalling ${g.title}`;
  const fill = $('.bar-fill.timed', modalRoot);
  fill.style.transitionDuration = `${UNINSTALL_MS - 200}ms`;
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = '100%'; }));
  render();
  after(UNINSTALL_MS, () => {
    g.installed = false;
    drive(g.drive || 'C').free += g.size;
    S.shortcuts = S.shortcuts.filter(x => x !== id);
    S.uninstalling = null;
    M.locked = false;
    closeModal(true);
    render({ animateList: S.filter === 'installed' });
    toast(`${shortName(g)} was uninstalled`, `${gb(g.size)} freed on ${drive(g.drive || 'C').name}. It is still in your Library.`, 'success');
  });
}

// ---------- modal ----------

let M = null; // { handlers, prev, locked }
function openModal(html, handlers = {}) {
  if (M) return false;
  closeMenus();
  const prev = document.activeElement;
  modalRoot.innerHTML = `<div class="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">${html}</div></div>`;
  M = { handlers, prev, locked: false };
  const bd = modalRoot.firstElementChild;
  requestAnimationFrame(() => bd.classList.add('show'));
  ($('[data-focus]', modalRoot) || $('button', modalRoot)).focus();
  return true;
}

function closeModal(force) {
  if (!M || (M.locked && !force)) return;
  const bd = modalRoot.firstElementChild;
  const prev = M.prev;
  M = null;
  bd.classList.remove('show');
  after(200, () => { if (!M && modalRoot.firstElementChild === bd) modalRoot.innerHTML = ''; });
  if (prev && document.contains(prev)) prev.focus(); else mainEl.focus({ preventScroll: true });
}

modalRoot.addEventListener('click', e => {
  if (!M) return;
  const b = e.target.closest('[data-m]');
  if (b) {
    if (b.disabled) return;
    if (b.dataset.m === 'cancel') closeModal();
    else M.handlers[b.dataset.m]?.();
  } else if (e.target.classList.contains('backdrop') && !M.locked) closeModal();
});
modalRoot.addEventListener('change', () => M?.handlers.change?.());

// ---------- menus ----------

const MENUS = {
  steam: [['Change Account…', 'stub', 'Change Account'], ['Go Offline…', 'stub', 'Offline mode'], ['Settings', 'stub', 'Settings'], ['-'], ['Reset demo', 'reset', '', 'Ctrl+Alt+0'], ['-'], ['Exit', 'close']],
  view: [['Library', 'home'], ['Store', 'ext', 'https://store.steampowered.com/'], ['Community', 'ext', 'https://steamcommunity.com/'], ['-'], ['Downloads', 'stub', 'Downloads'], ['Big Picture Mode', 'stub', 'Big Picture Mode'], ['Small Mode', 'stub', 'Small Mode']],
  friends: [['View Friends List', 'stub', 'Friends'], ['Add a Friend…', 'stub', 'Friends'], ['Change Status', 'stub', 'Friends']],
  games: [['View Games Library', 'home'], ['Add a Non-Steam Game…', 'stub', 'Add a Game'], ['Activate a Product…', 'stub', 'Activate a Product']],
  help: [['Steam Support', 'stub', 'Steam Support'], ['Keyboard shortcuts', 'shortcuts'], ['About Steam', 'stub', 'About Steam']],
};

let openMenuKey = null;
function openMenu(key, btn) {
  if (openMenuKey === key) { closeMenus(); return; }
  closeMenus();
  openMenuKey = key;
  btn.classList.add('open');
  const r = btn.getBoundingClientRect();
  menuRoot.innerHTML = `<div class="dropdown" role="menu" style="left:${r.left}px;top:${r.bottom + 2}px">${MENUS[key].map(([label, action, arg = '', hint = '']) =>
    label === '-' ? '<hr>' : `<button role="menuitem" data-action="${action}" data-name="${esc(arg)}" data-url="${esc(arg)}">${esc(label)}${hint ? `<kbd>${hint}</kbd>` : ''}</button>`).join('')}</div>`;
  $('.dropdown button', menuRoot)?.focus({ preventScroll: true });
}
function closeMenus() {
  if (!openMenuKey) return;
  openMenuKey = null;
  menuRoot.innerHTML = '';
  $$('.menu-btn.open').forEach(b => b.classList.remove('open'));
}

// ---------- window + desktop ----------

const isHidden = () => win.classList.contains('minimized') || win.classList.contains('closed');
function showWindow() {
  win.classList.remove('minimized', 'closed');
  $('#tb-steam').classList.add('active');
}
function minimizeWindow() {
  closeMenus();
  win.classList.add('minimized');
  $('#tb-steam').classList.remove('active');
}
function closeWindow() {
  closeMenus();
  win.classList.add('closed');
  $('#tb-steam').classList.remove('active');
  toast('Steam is still running', 'Steam keeps running in the background. Click the Steam icon on the taskbar to open it again.', 'windows');
}

let lastDeskClick = { id: null, t: 0 };
function deskGame(id) {
  // desktop icons open on double-click, like Windows
  const now = Date.now();
  if (lastDeskClick.id !== id || now - lastDeskClick.t > 450) { lastDeskClick = { id, t: now }; return; }
  lastDeskClick = { id: null, t: 0 };
  showWindow();
  nav({ view: 'game', id });
  play(id);
}

// ---------- toasts ----------

function toast(title, body = '', kind = '') {
  const box = $('#toasts');
  const existing = $$('.toast', box).find(t => t.dataset.key === title + body);
  if (existing) { clearTimeout(existing._t); existing._t = setTimeout(() => dropToast(existing), 4000); return; }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.dataset.key = title + body;
  t.setAttribute('role', 'status');
  t.innerHTML = `<strong>${esc(title)}</strong>${body ? `<span>${esc(body)}</span>` : ''}`;
  if (kind === 'windows') { t.style.cursor = 'pointer'; t.addEventListener('click', () => { showWindow(); dropToast(t); }); }
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  t._t = setTimeout(() => dropToast(t), kind === 'windows' ? 6000 : 4000);
  const all = $$('.toast', box);
  if (all.length > 3) dropToast(all[0]);
}
function dropToast(t) {
  clearTimeout(t._t);
  t.classList.remove('show');
  setTimeout(() => t.remove(), 220);
}

// ---------- reset ----------

function resetDemo() {
  timers.forEach(t => clearTimeout(t));
  timers.clear();
  if (M) { M.locked = false; closeModal(true); }
  closeMenus();
  S = freshState();
  showWindow();
  win.classList.remove('maximized');
  render({ enter: true, animateList: true });
  toast('Demo reset', 'Everything is back to the starting state.');
}

// ---------- events ----------

const ACTIONS = {
  home: () => nav({ view: 'home' }),
  open: el => nav({ view: 'game', id: +el.dataset.id }),
  filter: el => setFilter(el.dataset.f),
  collection: el => nav({ view: 'collection', cid: el.dataset.cid }),
  'clear-filters': clearFilters,
  'whats-new': () => {
    S.whatsNewOpen = !S.whatsNewOpen;
    const sec = $('.whats-new', mainEl);
    sec.classList.toggle('open', S.whatsNewOpen);
    $('.wn-row', sec).setAttribute('aria-expanded', S.whatsNewOpen);
  },
  install: el => askInstall(+el.dataset.id),
  pause: togglePause,
  play: el => play(+el.dataset.id),
  stop: stopGame,
  dlc: el => nav({ view: 'dlc', id: +el.dataset.id }),
  uninstall: el => askUninstall(+el.dataset.id),
  back: goBack,
  forward: goForward,
  stub: el => toast(el.dataset.name || 'Coming soon', STUB),
  ext: el => window.open(el.dataset.url, '_blank', 'noopener'),
  reset: resetDemo,
  shortcuts: () => toast('Keyboard shortcuts', 'Esc closes dialogs, Enter confirms, Ctrl+Alt+0 resets the demo.'),
  minimize: minimizeWindow,
  maximize: () => win.classList.toggle('maximized'),
  close: closeWindow,
  'taskbar-steam': () => isHidden() ? showWindow() : minimizeWindow(),
  'taskbar-open': () => showWindow(),
  'desk-game': el => deskGame(+el.dataset.id),
};

document.addEventListener('click', e => {
  const menuBtn = e.target.closest('[data-menu]');
  if (menuBtn) { openMenu(menuBtn.dataset.menu, menuBtn); return; }
  const el = e.target.closest('[data-action]');
  if (openMenuKey && !e.target.closest('.dropdown')) closeMenus();
  if (!el || el.disabled) return;
  if (el.closest('.dropdown')) closeMenus();
  ACTIONS[el.dataset.action]?.(el, e);
});

// hovering across the menubar while a menu is open switches menus, like a real menubar
$('.menubar').addEventListener('mouseover', e => {
  const b = e.target.closest('[data-menu]');
  if (b && openMenuKey && openMenuKey !== b.dataset.menu) openMenu(b.dataset.menu, b);
});

$('#titlebar').addEventListener('dblclick', e => {
  if (!e.target.closest('button')) win.classList.toggle('maximized');
});

searchEl.addEventListener('input', onSearch);
searchEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const first = listGames()[0];
    if (first) nav({ view: 'game', id: first.id });
  } else if (e.key === 'Escape' && searchEl.value) {
    e.stopPropagation();
    searchEl.value = '';
    onSearch();
  }
});

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.altKey && (e.code === 'Digit0' || e.code === 'Numpad0')) {
    e.preventDefault();
    resetDemo();
    return;
  }
  if (M) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    else if (e.key === 'Enter' && !['BUTTON', 'A'].includes(e.target.tagName)) {
      e.preventDefault();
      $('[data-m="confirm"]', modalRoot)?.click();
    } else if (e.key === 'Tab') {
      const f = $$('button:not([disabled]):not([hidden] *), input:not([disabled])', modalRoot).filter(x => x.offsetParent);
      if (!f.length) { e.preventDefault(); return; }
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
    return;
  }
  if (openMenuKey) {
    if (e.key === 'Escape') { e.preventDefault(); const b = $(`[data-menu="${openMenuKey}"]`); closeMenus(); b.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = $$('.dropdown button', menuRoot);
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
    return;
  }
  if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
  if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
});

// ---------- boot ----------

function tickClock() {
  const now = new Date();
  $('#clock-time').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  $('#clock-date').textContent = now.toLocaleDateString('en-US');
}
tickClock();
setInterval(tickClock, 1000);

$('.account-name').textContent = USER_NAME;
$('.profile-link').textContent = USER_NAME;
S = freshState();
showWindow();
render({ enter: true });
