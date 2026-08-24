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
- Persian / English interface toggle (also flips RTL/LTR)
- Export backup as JSON / Import a backup back in

## File structure (for future editing)

```
index.html            Page skeleton; loads all CSS/JS
css/
  variables.css       Colors, fonts, radius — EDIT THIS to change the theme
  base.css            Reset + typography
  layout.css          Header, container, modal shell, toast position
  components.css      Calendar grid, buttons, modal content, legend
js/
  jalali.js           Gregorian <-> Jalali conversion (leave as-is)
  moods.js            Mood emojis/levels — EDIT to add/change moods
  i18n.js             ALL fa/en text strings — EDIT to change wording or add languages
  storage.js          localStorage save/load + export/import logic
  calendar.js         Renders the month grid
  app.js              Wires everything together (events, modal, language switch)
```

## Common customizations

| I want to...                        | Edit this |
| ----------------------------------- | --------- |
| Change colors / theme               | `css/variables.css` |
| Change mood emojis or count         | `js/moods.js` (+ `--mood-N-*` colors in variables.css) |
| Change texts / add a language       | `js/i18n.js` |
| Move data to another browser/device | Use Export in the app, then Import there |

## Data details

- Storage key: `moodTracker.v1`
- Entries are keyed by zero-padded Jalali date: `"1404-06-03": { "mood": 2, "note": "...", "updatedAt": ... }`
- Import **merges** entries into existing data (nothing is overwritten except matching days).
