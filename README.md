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
- Birthdays view (embedded in index.html like the other views;
  opened from the footer button or the 🎂 bottom-nav item):
  add name + birth date (Jalali/Shamsi day · month · year dropdowns,
  stored as the equivalent Gregorian date), cards show name, Jalali
  date, and days remaining
- Mobile (≤540px): floating rounded bottom Navigation Bar with
  5 sections — Birthdays, Dashboard, Home, Year Counter, To-Do
  (all views switched inside index.html, hash-routed,
  back-button friendly); modern stroke SVG icons inherit the
  active-tab color
- Dashboard is an embedded view of index.html
- Click any day → pick 1 of 5 emoji moods + write an optional note → Save
- Saved days show their mood emoji/color right on the calendar
- Only today + the past 5 days are editable (future days are locked)
- First visit asks for your name; the header greets you by name
  (Good morning / afternoon / evening, by local time)
- Light / Dark / Auto themes (Auto switches around sunset ~18:00);
  switcher lives in the Dashboard's Themes section
- Persian / English interface toggle (also flips RTL/LTR)
- Dashboard view (opened from the header button; includes a
  desktop back button — mobile uses the bottom nav):
  profile (name / age / interests), mood of today, notes count,
  % of tasks done, 30-day average mood (out of 10), a Weekly Report
  mood chart (Saturday → Friday), and a Themes section
  (Light / Dark / Automatic)
- Daily visit streak badge in the header, next to the language
  switcher (miss a full day → resets)
- Smooth, GPU-friendly animations (disabled when the OS asks for
  reduced motion)
- Works offline (PWA) and updates with a single refresh when online
- **Account & cloud sync (optional):** email+password or Google login;
  data syncs to Supabase across devices with offline-first
  last-write-wins merging (see the section below). Logged-out usage is
  unchanged — everything still works purely on localStorage

## File structure (for future editing)

```
index.html            Main page: 3-column home (year counter | calendar |
                      to-do panel), embedded dashboard view, mobile views,
                      bottom navigation bar; loads all CSS/JS
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
  storage.js          localStorage save/load logic
  theme.js            Light/Dark/Auto theme manager + Themes section
                      buttons (sunset estimate)
  theme-init.js       Pre-paint theme resolver (inline-free, no flash on load)
  pwa.js              SHARED online glue: analytics, SW registration, update toast
  calendar.js         Renders the month grid (+ editable-day restrictions)
  app.js              Wires everything together (events, modal, greeting, name dialog)
  todo.js             To-do panel logic (add/edit/delete/favorite/check)
  dashboard.js        Dashboard view logic (profile, stats, weekly report)
  yearcounter.js      Year Counter panel logic (Jalali day dots + stats)
  views.js            Mobile view switching + hash routing (#home/#year/#todo/#dashboard)
  birthdays.js        Birthdays view logic (add/edit/delete, remaining days;
                      embedded in index.html, FA + EN via i18n.js)
  streak.js           Daily-visit streak counter (header badge)
  vendor/supabase.js  Vendored supabase-js v2 (UMD build, no CDN needed)
  supabase.js         Supabase URL + anon key + the one shared client
  sync.js             Offline-first snapshot-diff sync engine
                      (push diff → pull → merge, last-write-wins)
  auth.js             Account UI + session management (login button,
                      user chip menu, auth modal) on Supabase Auth
sw.js                 Service worker: network-first caching (offline support
                      + updates with a single refresh)
manifest.json         PWA manifest
supabase-schema.sql   Supabase tables + RLS + triggers (run once in the
                      Supabase SQL Editor — see the sync section below)
tests/sync.test.js    Node smoke test for the sync engine
                      (run: node tests/sync.test.js)
```

## Common customizations

| I want to...                        | Edit this |
| ----------------------------------- | --------- |
| Change colors / theme               | `css/variables.css` |
| Change mood emojis or count         | `js/moods.js` (+ `--mood-N-*` colors in variables.css) |
| Change texts / add a language       | `js/i18n.js` |
| Move data to another browser/device | Copy the `moodTracker.v1` localStorage value (DevTools → Application → Local Storage) |
| Change Supabase project / keys      | `js/supabase.js` |
| Change the database schema          | `supabase-schema.sql` (+ table names in `js/sync.js`) |

## Data details

- Mood storage key: `moodTracker.v1`
- Entries are keyed by zero-padded Jalali date: `"1404-06-03": { "mood": 2, "note": "...", "updatedAt": ... }`
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
- Sync bookkeeping key: `syncSnapshot.v1` (a mirror of the last synced
  state; safe to delete — the next sync just re-pushes everything)
- To-do / birthday items carry an `updatedAt` epoch-ms stamp; settings
  carry `settingsUpdatedAt` (+ `streakUpdatedAt` for the streak keys).
  These drive the sync's last-write-wins conflict resolution.

## Accounts & cloud sync (Supabase)

The app is offline-first: **localStorage stays the source of truth** and
everything works with no account. Logging in adds cloud sync on top:

- **Sync model:** every local change marks a diff against a stored
  snapshot (`syncSnapshot.v1`); ~2s after the last change the diff is
  pushed (upserts + soft deletes). Pulls merge server rows with
  **last-write-wins by `updatedAt`/`client_updated_at`** (epoch ms), so
  offline edits sync safely. Sync triggers: sign-in, `online` event,
  tab focus/visibility (throttled 30s), and the manual "Sync now" item
  in the user menu. No realtime.
- **Sign out keeps local data.** Email confirmation is expected to be
  OFF, so signup signs you in right away.
- **Setup (once):**
  1. Supabase Dashboard → SQL Editor → paste `supabase-schema.sql` →
     Run (idempotent; creates 5 RLS tables + triggers).
  2. Authentication → Providers → Google → enable with your Google
     OAuth client (redirect URI:
     `https://<project>.supabase.co/auth/v1/callback`).
  3. Authentication → URL Configuration → Site URL + Redirect URLs →
     add your Netlify domain. Until then the Google button shows a
     friendly error; email/password works regardless.
- **Config:** the project URL + anon key live at the top of
  `js/supabase.js`. If the vendored library ever fails to load, auth UI
  hides and the app keeps running exactly as before.

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
