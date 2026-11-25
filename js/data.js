// All fake data for the prototype. Edit freely; app.js clones it on load and on "Reset demo".

const USER_NAME = 'cps613_a4';

// The prototype's "today", so Recent and dates stay stable whenever it is opened.
const DEMO_TODAY = '2026-11-25';

// size is GB on disk; playtime is hours; dates are YYYY-MM-DD (null = never).
const GAMES = [
  { id: 620,     title: 'Portal 2', dev: 'Valve', installed: false, size: 12.4, playtime: 0, lastPlayed: null, added: '2026-11-23', ach: [0, 51], tags: ['Puzzle', 'Co-op', 'Story Rich'] },
  { id: 489830,  title: 'The Elder Scrolls V: Skyrim Special Edition', short: 'Skyrim', dev: 'Bethesda Game Studios', installed: true, size: 14.8, playtime: 142.5, lastPlayed: '2026-11-24', added: '2024-12-20', ach: [41, 75], tags: ['RPG', 'Open World', 'Story Rich'],
    dlc: [
      { id: 211720,  title: 'Dawnguard', owned: true, installed: true, size: 0.9 },
      { id: 213650,  title: 'Hearthfire', owned: true, installed: true, size: 0.2 },
      { id: 211722,  title: 'Dragonborn', owned: true, installed: true, size: 0.7 },
      { id: 1746860, title: 'Skyrim Anniversary Upgrade', owned: false },
    ] },
  { id: 413150,  title: 'Stardew Valley', dev: 'ConcernedApe', installed: true, size: 0.6, playtime: 88.3, lastPlayed: '2026-11-22', added: '2023-03-02', ach: [27, 49], tags: ['Farming', 'Co-op', 'Relaxing'] },
  { id: 730,     title: 'Counter-Strike 2', dev: 'Valve', installed: true, size: 34.6, playtime: 210.4, lastPlayed: '2026-11-20', added: '2022-06-11', ach: [1, 1], tags: ['FPS', 'Multiplayer'] },
  { id: 367520,  title: 'Hollow Knight', dev: 'Team Cherry', installed: true, size: 9.1, playtime: 36.7, lastPlayed: '2026-11-18', added: '2025-02-14', ach: [31, 63], tags: ['Metroidvania', 'Platformer'] },
  { id: 1145360, title: 'Hades', dev: 'Supergiant Games', installed: true, size: 15.0, playtime: 47.9, lastPlayed: '2026-11-16', added: '2025-07-04', ach: [28, 49], tags: ['Roguelike', 'Story Rich'] },
  { id: 220,     title: 'Half-Life 2', dev: 'Valve', installed: true, size: 6.5, playtime: 14.2, lastPlayed: '2026-11-12', added: '2021-11-26', ach: [18, 33], tags: ['FPS', 'Story Rich', 'Classic'] },
  { id: 1086940, title: "Baldur's Gate 3", dev: 'Larian Studios', installed: true, size: 122.0, playtime: 95.6, lastPlayed: '2026-11-10', added: '2025-12-24', ach: [19, 54], tags: ['RPG', 'Co-op', 'Story Rich'] },
  { id: 105600,  title: 'Terraria', dev: 'Re-Logic', installed: true, size: 0.5, playtime: 61.0, lastPlayed: '2026-10-30', added: '2022-01-08', ach: [44, 115], tags: ['Sandbox', 'Co-op'] },
  { id: 292030,  title: 'The Witcher 3: Wild Hunt', dev: 'CD PROJEKT RED', installed: true, size: 51.2, playtime: 73.4, lastPlayed: '2026-10-21', added: '2024-11-29', ach: [22, 78], tags: ['RPG', 'Open World', 'Story Rich'] },
  { id: 504230,  title: 'Celeste', dev: 'Maddy Makes Games', installed: false, size: 1.2, playtime: 0, lastPlayed: null, added: '2026-08-02', ach: [0, 32], tags: ['Platformer', 'Story Rich'] },
  { id: 1091500, title: 'Cyberpunk 2077', dev: 'CD PROJEKT RED', installed: false, size: 70.0, playtime: 31.2, lastPlayed: '2026-06-14', added: '2025-11-28', ach: [12, 57], tags: ['RPG', 'Open World'] },
  { id: 1245620, title: 'ELDEN RING', dev: 'FromSoftware', installed: false, size: 60.0, playtime: 54.3, lastPlayed: '2026-04-02', added: '2025-03-01', ach: [17, 42], tags: ['RPG', 'Souls-like'] },
  { id: 892970,  title: 'Valheim', dev: 'Iron Gate AB', installed: false, size: 1.6, playtime: 12.7, lastPlayed: '2026-03-19', added: '2026-02-20', ach: [10, 41], tags: ['Survival', 'Co-op'] },
  { id: 1174180, title: 'Red Dead Redemption 2', dev: 'Rockstar Games', installed: false, size: 120.0, playtime: 22.8, lastPlayed: '2026-02-10', added: '2025-11-28', ach: [9, 51], tags: ['Open World', 'Story Rich'] },
  { id: 550,     title: 'Left 4 Dead 2', dev: 'Valve', installed: false, size: 13.0, playtime: 18.5, lastPlayed: '2025-12-28', added: '2021-11-26', ach: [26, 70], tags: ['FPS', 'Co-op'] },
  { id: 440,     title: 'Team Fortress 2', dev: 'Valve', installed: false, size: 26.0, playtime: 9.4, lastPlayed: '2025-11-02', added: '2021-11-26', ach: [23, 520], tags: ['FPS', 'Multiplayer'] },
  { id: 400,     title: 'Portal', dev: 'Valve', installed: false, size: 4.8, playtime: 6.1, lastPlayed: '2025-09-14', added: '2021-11-26', ach: [15, 15], tags: ['Puzzle', 'Classic'] },
  { id: 570,     title: 'Dota 2', dev: 'Valve', installed: false, size: 45.0, playtime: 3.2, lastPlayed: '2025-05-02', added: '2021-11-26', ach: [0, 0], tags: ['MOBA', 'Multiplayer'] },
  { id: 264710,  title: 'Subnautica', dev: 'Unknown Worlds', installed: false, size: 7.3, playtime: 0, lastPlayed: null, added: '2026-05-30', ach: [0, 26], tags: ['Survival', 'Open World'] },
];

// free and total are GB. Installing takes space from the chosen drive; uninstalling gives it back.
const DRIVES = [
  { key: 'C', name: 'Local Disk (C:)', free: 214.6, total: 476.3 },
  { key: 'D', name: 'Games (D:)', free: 3.1, total: 931.5 },
];

// Normal collections list game ids. Auto collections have a rule and update by themselves.
const COLLECTIONS = [
  { id: 'fav',      name: 'Favourites', games: [489830, 413150, 367520, 1145360, 220] },
  { id: 'coop',     name: 'Co-op Night', games: [413150, 105600, 550, 892970, 620] },
  { id: 'unplayed', name: 'Unplayed', auto: 'Games you have never played', rule: g => g.playtime === 0 && !g.lastPlayed },
  { id: 'story',    name: 'Story Rich', auto: 'Games tagged Story Rich', rule: g => g.tags.includes('Story Rich') },
];

const WHATS_NEW = [
  { id: 413150, text: 'Patch notes: small fixes for multiplayer farms' },
  { id: 730, text: 'Map update: two maps added to Premier' },
  { id: 489830, text: 'Small update: stability fixes' },
];
