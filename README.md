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
- Desktop: three-column layout — Year Counter panel (left),
  calendar (center), To-Do panel (right); panel heights match
- Year Counter: one circle per day of the current Jalali year
  (starts Nowruz, 366 in leap years); passed days turn blue;
  footer shows days passed / days left
- To-Do panel: add / edit / delete / favorite / check-off
- Birthdays page (`todo.html`, opened from the 🥳 footer button):
  add name + birth date (Jalali/Shamsi day · month · year dropdowns,
  stored as the equivalent Gregorian date), cards show name, Jalali
  date, and days remaining
- Mobile (≤540px): fixed bottom Navigation Bar with 5 sections —
  Birthdays (link), Dashboard, Home, Year Counter, To-Do (views
  switched inside index.html, hash-routed, back-button friendly).
  The Birthdays page gets the same bottom Navigation Bar on mobile
  (it replaces the header back button there)
- Dashboard is an embedded view of index.html now
  (`dashboard.html` redirects to `index.html#dashboard`)
- Click any day → pick 1 of 5 emoji moods + write an optional note → Save
- Saved days show their mood emoji/color right on the calendar
- Only today + the past 5 days are editable (future days are locked)
- First visit asks for your name; the header greets you by name
  (Good morning / afternoon / evening, by local time)
- Light / Dark / Auto themes (Auto switches around sunset ~18:00);
  toggle button in the header
- Persian / English interface toggle (also flips RTL/LTR)
- Dashboard page (`dashboard.html`, opened from the header button):
  profile (name / age / interests), mood of today, notes count,
  % of tasks done, 30-day average mood (out of 10), a Weekly Report
  mood chart (Saturday → Friday), and Backup/Restore
- Daily visit streak badge in the header (miss a full day → resets)
- Export backup as JSON / Import a backup back in (Dashboard view)
- Smooth, GPU-friendly animations (disabled when the OS asks for
  reduced motion)
- Works offline (PWA) and updates with a single refresh when online

## File structure (for future editing)

```
index.html            Main page: 3-column home (year counter | calendar |
                      to-do panel), embedded dashboard view, mobile views,
                      bottom navigation bar; loads all CSS/JS
todo.html             Birthdays page (repurposed former to-do page; Persian
                      only, same theme system)
dashboard.html        Thin redirect → index.html#dashboard (old links keep
                      working)
css/
  variables.css       Colors, fonts, radius — EDIT THIS to change the theme
                      (contains both light and dark palettes)
  base.css            Reset + typography + reduced-motion guard
  layout.css          Header, container, footer, modal shell, toast position
  components.css      Calendar grid, buttons, modal content, legend
  todo.css            To-do styles (list items, add form, empty state, edit)
  dashboard.css       Dashboard styles (profile, stats, weekly chart)
  birthdays.css       Birthdays page styles (form, cards, badges)
  home.css            Home 3-column grid, year counter panel, mobile views,
                      bottom navigation bar
js/
  jalali.js           Gregorian <-> Jalali conversion (leave as-is)
  moods.js            Mood emojis/levels — EDIT to add/change moods
  i18n.js             ALL fa/en text strings — EDIT to change wording or add languages
  storage.js          localStorage save/load + export/import logic
  theme.js            Light/Dark/Auto theme manager (sunset estimate)
  theme-init.js       Pre-paint theme resolver (inline-free, no flash on load)
  pwa.js              SHARED online glue: analytics, SW registration, update toast
  calendar.js         Renders the month grid (+ editable-day restrictions)
  app.js              Wires everything together (events, modal, greeting, name dialog)
  todo.js             To-do panel logic (add/edit/delete/favorite/check)
  dashboard.js        Dashboard view logic (profile, stats, weekly report, backup)
  yearcounter.js      Year Counter panel logic (Jalali day dots + stats)
  views.js            Mobile view switching + hash routing (#home/#year/#todo/#dashboard)
  birthdays.js        Birthdays page logic (add/edit/delete, remaining days)
  streak.js           Daily-visit streak counter (header badge)
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
- Birthdays storage key: `birthdaysTracker.v1`. Item shape:
  `{ "id": "...", "name": "...", "dateISO": "1995-06-14", "createdAt": 1690000000000 }`
  (Gregorian ISO date — entered through the Jalali day/month/year
  dropdowns and converted internally; the remaining-days badge counts
  to the next occurrence; Feb 29 rolls to Mar 1 in non-leap years)
- Dashboard profile + streak live in `moodTracker.v1` settings:
  `userName`, `userAge`, `userInterests`, `streakCount`, `lastVisitDate`

## PWA / online code (maintenance guide)

All online/PWA glue lives in **one shared file, `js/pwa.js`**, loaded as the
last script on every page. It contains the only copies of:
- Google Analytics bootstrap (change `GA_ID` there, or set it to `""`)
- Service worker registration
- The "new version installed" toast (i18n-aware, FA + EN)

The pre-paint theme resolver lives in `js/theme-init.js` and is loaded
synchronously in `<head>` before the CSS on every page (no flash on load).
No page contains inline scripts anymore — edit the shared files instead.

`sw.js` keeps a **network-first** strategy for same-origin files, so a
single refresh always loads the newest code when online; the cache is
only a fallback for offline use. Cross-origin files (Google Fonts) are
cache-first (they never change).

**To ship an update:** edit files, add any new files to `PRECACHE_URLS`
in `sw.js`, bump `CACHE_VERSION`, deploy. Users get it with one refresh,
and a toast appears when the new version activates.
