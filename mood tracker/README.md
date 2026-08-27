# Daily Mood Tracker — تقویم ثبت حال روزانه

A simple, offline mood tracker with a Persian (Jalali/Shamsi) calendar.
Data is saved in your browser's `localStorage`, so everything reappears
the next time you open the page.

## How to run

Just open `index.html` in any modern browser (double-click it).
No server, no build tools, no internet needed (the Persian font loads
from Google Fonts when online, and falls back to system fonts offline).

## Features

- Jalali calendar with month navigation and a "Today" button
- Click any day → pick 1 of 5 emoji moods + write an optional note → Save
- Saved days show their mood emoji/color right on the calendar
- Only today + the past 5 days are editable (future days are locked)
- First visit asks for your name; the header greets you by name
  (Good morning / afternoon / evening, by local time)
- Light / Dark / Auto themes (Auto switches around sunset ~18:00);
  toggle button in the header
- Persian / English interface toggle (also flips RTL/LTR)
- Export backup as JSON / Import a backup back in
- To-do list page (`todo.html`): add / delete / favorite / check-off
  notes — button in the footer, Persian only, same theme system
- Smooth, GPU-friendly animations (disabled when the OS asks for
  reduced motion)
- Works offline (PWA) and updates with a single refresh when online

## File structure (for future editing)

```
index.html            Main page skeleton; loads all CSS/JS (+ pre-paint theme script)
todo.html             To-do list page (Persian only, same theme system)
css/
  variables.css       Colors, fonts, radius — EDIT THIS to change the theme
                      (contains both light and dark palettes)
  base.css            Reset + typography + reduced-motion guard
  layout.css          Header, container, footer, modal shell, toast position
  components.css      Calendar grid, buttons, modal content, legend
  todo.css            To-do page styles (list items, add form, empty state)
js/
  jalali.js           Gregorian <-> Jalali conversion (leave as-is)
  moods.js            Mood emojis/levels — EDIT to add/change moods
  i18n.js             ALL fa/en text strings — EDIT to change wording or add languages
  storage.js          localStorage save/load + export/import logic
  theme.js            Light/Dark/Auto theme manager (sunset estimate)
  calendar.js         Renders the month grid (+ editable-day restrictions)
  app.js              Wires everything together (events, modal, greeting, name dialog)
  todo.js             To-do list logic (add/delete/favorite/check, rendering)
sw.js                 Service worker: network-first caching (offline support
                      + updates with a single refresh)
manifest.json         PWA manifest
```

## Common customizations

| I want to...                        | Edit this |
| ----------------------------------- | --------- |
| Change colors / theme               | `css/variables.css` |
| Change mood emojis or count         | `js/moods.js` (+ `--mood-N-*` colors in variables.css) |
| Change texts / add a language       | `js/i18n.js` |
| Move data to another browser/device | Use Export in the app, then Import there |

## Data details

- Mood storage key: `moodTracker.v1`
- Entries are keyed by zero-padded Jalali date: `"1404-06-03": { "mood": 2, "note": "...", "updatedAt": ... }`
- Import **merges** entries into existing data (nothing is overwritten except matching days).
- To-do storage key: `todoTracker.v1` (separate on purpose — to-do items
  are not part of the mood backup file). Item shape:
  `{ "id": "...", "text": "...", "done": false, "fav": false, "createdAt": 1690000000000 }`

## PWA / updates

- `sw.js` uses a **network-first** strategy for same-origin files, so a
  single refresh always loads the newest code when online; the cache is
  only a fallback for offline use.
- Cross-origin files (Google Fonts) are cache-first (they never change).
- When a new version activates in the background, a toast
  («به‌روزرسانی جدید نصب شد ✨») appears on both pages.
- To ship an update: edit files, bump `CACHE_VERSION` in `sw.js`, deploy.
  Users get it with one refresh.
