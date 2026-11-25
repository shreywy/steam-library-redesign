# Steam Library redesign: medium-fidelity prototype

CPS613 (Human-Computer Interaction), Fall 2026, Group 25. Assignment 4.

**Live prototype:** https://shreywy.github.io/steam-library-redesign/

Plain HTML, CSS and JavaScript. No frameworks and no build step, so it runs from any static host or by opening `index.html`. Best viewed in a desktop browser at 1280×720 or larger.

## What to try

The three test tasks from A3 work end to end:

1. **Install and play Portal 2.** Open Portal 2 from Library Home, the sidebar, or search. Press INSTALL, pick a drive, wait for the download, then press PLAY.
2. **Show only installed games.** Use the All / Installed / Recent toggle at the top of the sidebar.
3. **Check Skyrim's DLC, then uninstall it.** Open Skyrim, press Owned DLC, go back, then press Uninstall and confirm.

Reset the demo at any time from **Steam > Reset demo** or with **Ctrl+Alt+0**. State is kept in memory only, so a page refresh also resets it.

## Screens

| Screen | How to get there |
| --- | --- |
| Windows 11 desktop | The page itself. Minimize Steam to see the wallpaper, desktop icons and taskbar. |
| Library Home | Starting screen, Home in the sidebar, or LIBRARY in the nav. Recent Games, Collections and one collapsed What's New row. |
| Filtered list (All / Installed / Recent) | Sidebar toggle. Shows a grid and a count, e.g. "Installed (9)". |
| Empty search result | Type a name that matches nothing. Has a Clear filters button. |
| Collection | Click a collection card on Library Home. Two are Auto collections that update by themselves. |
| Game page | Click any game art or sidebar entry. Play/Install, Owned DLC, Properties, Uninstall, Store Page. |
| Install dialog | INSTALL on any game that is not installed. Drive choice, space check, shortcut options. |
| Download in progress | After confirming an install. Progress, speed, time left and Pause on the game page and in the downloads bar. |
| Launching / game running | PLAY on an installed game. Back to Library and Stop game. |
| Owned DLC | Owned DLC button on a game page. Lists each add-on as Owned or Not owned. |
| Uninstall confirmation and progress | Uninstall button on an installed game. |
| Menus and stubs | Steam, View, Friends, Games, Help menus; Friends & Chat, Settings, Downloads, Big Picture, Notifications. Unbuilt features show "This feature is under development in this prototype." |
| Steam still running | Close the Steam window. Reopen it from the taskbar. |

STORE, COMMUNITY and every game's Store Page link open the real Steam pages in a new tab.

## Keyboard

- Esc closes a dialog or menu (or clears the search box).
- Enter confirms the install dialog. In the uninstall dialog Cancel has focus, so Enter cancels; Tab to Uninstall to confirm.
- Enter in the search box opens the first match.
- Alt+Left / Alt+Right go back and forward.
- Ctrl+Alt+0 resets the demo.

## 1. Changes from our low-fidelity Figma prototype

Every problem from the A3 cognitive walkthrough (Tables 3 to 5) is addressed.

| A3 problem (participants) | What we changed | Why |
| --- | --- | --- |
| Manage options hidden in a dropdown (P3, P5) | Removed the Manage dropdown. Owned DLC, Properties and Uninstall are now a row of labelled buttons next to Play. Uninstall only appears when the game is installed. | Visibility. P3 suggested this exact change: "This could just be on the screen if there is space." |
| No confirmation before uninstalling (P1, P2, P4) | Uninstall opens a dialog that names the game, the drive and the space freed, and says the game and its DLC stay in the Library. Cancel has focus by default. Confirming shows a progress bar, then a toast. | Error prevention. A misclick or a stray Enter can no longer remove a game. |
| Filter labels small or slow to spot (P2, P6) | The All / Installed / Recent toggle uses 15 px semibold labels on 38 px tall buttons, and the selected option is filled light blue with a glow. The list heading shows the filter name and a count. | Visibility and feedback. The current state is obvious at a glance. |
| Unclear how to return from Owned DLC (P1, P5) | A large "Back to Skyrim" button sits at the top left of the DLC view. The nav back arrow and Alt+Left also work. | Navigation. The way out is the first thing on the screen. |
| Library nav does not return to Home (P2) | LIBRARY in the nav and Home at the top of the sidebar always go to Library Home. | Consistency. Same link, same place, every time. |
| Library Home game art not clickable (P2) | Every piece of game art (tiles, collection cards, sidebar icons, desktop shortcuts) opens the game. Tiles lift and glow on hover so they read as clickable. | Matches what Steam users already expect. |
| "Finish Installation" button at 60% (P4) | No action button is shown while downloading. The page shows a progress bar, size downloaded, speed, time left and Pause. The green PLAY button appears only at 100%, with a toast saying the game is ready. | Clear feedback about download state. |
| Looked for the filter bar where current Steam has it (P6) | Added a compact search bar above the game list, like current Steam, but smaller. | P6's suggestion. Familiar place, less space. |

Other changes from the low-fi version:

- Real look and data. The grey boxes are replaced by Steam's dark navy style, real game art, and 20 games with play time, last played, size and achievements. A3 warned that participants compared our prototype with the real client, so the medium-fi version is close to it visually while keeping our layout.
- Errors and defaults for installing. The install dialog defaults to C: with enough space, shows free space per drive, and checks "Create desktop shortcut". Picking the nearly full D: drive shows an error and disables Install. Only one download runs at a time, and trying a second one explains why.
- The game actually "runs". PLAY shows a short Launching state, then a "Portal 2 is running" screen with a session timer, Back to Library and Stop game. Stopping updates play time and last played.
- Empty states. A search with no matches says so and offers Clear filters, in both the sidebar and the main grid.
- Horizontal breadth. Menus, Store, Community, profile, Friends & Chat, Big Picture and Downloads exist and respond, so the prototype feels complete even where a feature is a stub.
- A Windows 11 desktop around the window, with minimize, maximize and close, so testers see Steam the way they normally would.

## 2. What HTML/CSS made hard or limited

- **Not a real installer.** Downloads, launching and uninstalling are timers. The download is compressed to 8 seconds, so the shown speed (about 1.5 GB/s) is unrealistically high. We kept the numbers consistent with each other instead of faking a realistic speed that would not match the time left.
- **The game does not open.** A web page cannot start a real program, so "running" is a screen inside Steam rather than a separate game window.
- **No real Windows behaviour.** The desktop, taskbar and window are drawn with CSS. The window cannot be dragged or resized, and Start, Search and File Explorer are stubs.
- **No persistence.** State lives in memory, so refreshing the page resets everything. This is fine (even useful) for test sessions, but a tester cannot leave and come back.
- **Fonts.** Steam uses Motiva Sans, which we cannot ship, so the prototype uses Segoe UI. Valve's logo is replaced by a plain "STEAM" wordmark and a neutral app icon.
- **Images from Steam's CDN.** Art is stored in `assets/` so the prototype works offline, but only for games in the data file. If an image is missing, a dark gradient tile with the title is shown instead.
- **Browser differences.** The bloom wallpaper is an approximation built from CSS gradients and blur. Some styles (`:has()`, `backdrop-filter`) need a current Chrome, Edge, Firefox or Safari.
- **Screen size.** The layout is built for desktop screens. Below about 1000 px wide the window gets cramped, and it is not meant for phones.

## Files

```
index.html      page shell: desktop, Steam window, taskbar
css/style.css   all styling and animations (respects prefers-reduced-motion)
js/data.js      all fake data: games, DLC, drives, collections, What's New
js/app.js       rendering, navigation and the three task flows
assets/         game art (library_600x900 and header per app ID)
```

## Credits

Game artwork from Steam, owned by the respective publishers. Used here for a non-commercial course prototype. This project is not affiliated with Valve or Steam.
