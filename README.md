# Daily Mood Tracker — تقویم ثبت حال روزانه

A simple, offline mood tracker with a Persian (Jalali/Shamsi) calendar.
Data is saved in your browser's `localStorage`, so everything reappears
the next time you open the page.

## How to run

Just open `index.html` in any modern browser (double-click it).
No server, no build tools, no internet needed (the Vazirmatn variable
font is self-hosted in `fonts/` and precached by the service worker,
so typography works fully offline).

## Features

- Jalali calendar with month navigation and a "Today" button
- Desktop: three-column layout — Year Counter panel (left),
  calendar (center), To-Do panel (right); panel heights match.
  Desktop navigation is the footer pill row; the bottom nav is a
  mobile/tablet affordance only
- Year Counter: one circle per day of the current Jalali year
  (starts Nowruz, 366 in leap years); passed days turn blue;
  footer shows days passed / days left
- To-Do panel: add / edit / delete / favorite / check-off
- Birthdays view (embedded in index.html like the other views;
  opened from the footer button or the 🎂 bottom-nav item):
  add name + birth date (Jalali/Shamsi day · month · year dropdowns,
  stored as the equivalent Gregorian date), cards show name, Jalali
  date, and days remaining
- Mobile (≤600px): floating rounded bottom Navigation Bar with
  5 sections — Birthdays, Dashboard, Home, Year Counter, To-Do
  (all views switched inside index.html, hash-routed,
  back-button friendly); modern stroke SVG icons inherit the
  active-tab color, and the active tab also carries a gradient rail
  so the state is never color-only
- Two responsive breakpoints (540px / 1100px) with a single layout
  that reflows between them
- Dashboard is an embedded view of index.html
- Click any day → pick a mood → Save (the note field is always visible)
- Saved days are tinted with their mood color and show the mood emoji
  under the day number
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
  fonts.css           @font-face for the self-hosted Vazirmatn variable font
  base.css            Reset + typography + reduced-motion guard
  layout.css          Header, container, footer, modal shell, toast position
  components.css      Calendar grid, buttons, modal content, legend
  todo.css            To-do styles (list items, add form, empty state, edit)
  dashboard.css       Dashboard styles (profile, stats, weekly chart)
  birthdays.css       Birthdays page styles (form, cards, badges)
  home.css            Home 3-column grid, year counter panel, mobile views,
                      bottom navigation bar
fonts/
  Vazirmatn-Variable.woff2
                      Self-hosted Vazirmatn variable font (wght 100-900,
                      Arabic + Latin, ~111 KB; SIL OFL license in OFL.txt)
  OFL.txt             Font license (must ship with the font)
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
  site-settings.js    DB-backed global settings (theme + SEO) — loaded
                      synchronously right after css/variables.css;
                      applies cached overrides with no flash + one REST
                      fetch, validates every value before applying
  base64url.js        UTF-8-safe base64 + base64url (btoa() throws on
                      non-latin1, and the site name is Persian)
  settings-sign.js    Fingerprint of a settings state so the admin panel can
                      tell whether the live settings still match the newest
                      stored version. Not authentication, not encryption.
sw.js                 Service worker: network-first caching (offline support
                      + updates with a single refresh); /admin/ AND
                      /.netlify/functions/ are excluded from every cache on
                      purpose (v17)
manifest.json         PWA manifest
netlify.toml          Netlify config: functions directory + no-store headers
                      for ALL THREE function endpoints (no build command — the
                      site stays plain static files)
package.json          Declares the ONE dependency the analytics function needs
                      (google-auth-library). There is no site build step.
netlify/functions/
  ga-report.js        GA4 Data API proxy (Phase 6). Holds the service-account
                      credentials in Netlify env vars, verifies the Supabase
                      session + admin role server-side, returns normalized
                      numbers. See the Analytics section below.
  admin-users.js      User-directory proxy (Phase 7). Holds
                      SUPABASE_SERVICE_ROLE_KEY in Netlify env vars, verifies
                      the Supabase session + admin role server-side, queries
                      the Auth Admin API + aggregate counts, and strips every
                      sensitive auth field before responding. See the User
                      management section below.
  admin-versions.js   Settings version history + restore (Phase 8). Needs NO
                      service-role key: it forwards the caller's own token to
                      is_admin(), validates every stored snapshot before
                      applying it, and performs the 5-step restore. See the
                      Version history section below.
  _lib/
    settings-payload.js  The snapshot validator shared by the function (a
                      faithful port of the validator family in
                      js/site-settings.js). Bundled into the function by
                      esbuild, so it ships inside the deployed artifact.
supabase-schema.sql   Supabase tables + RLS + triggers (run once in the
                      Supabase SQL Editor — see the sync section below)
supabase-admin.sql    Admin bootstrap: admin_users + is_admin() + the
                      site_settings table + RLS + seed defaults + security
                      hardening (key whitelist, value-size guard, column
                      revoke) — re-run it in the Supabase SQL Editor to
                      apply the fixes from the security audit
supabase-versions.sql Settings version history (Phase 8): settings_versions +
                      settings_version_seq + admin_audit_log + the snapshot,
                      immutability and size-guard triggers. Run AFTER
                      supabase-admin.sql — see the Version history section
                      below. Settings only; NOT a database backup.
_headers              Netlify security headers: nosniff / X-Frame-Options
                      DENY / Referrer-Policy / Permissions-Policy for the
                      whole site; strict CSP + Cache-Control: no-store for
                      /admin/* (see README › Security)
robots.txt            Disallows /admin/ from crawlers (the panel also has
                      <meta name="robots" content="noindex, nofollow">)
.gitignore            Prevents .env / key files / tool state from ever
                      being committed if a git repo is initialized
admin/
  index.html          Admin Panel page (no manifest, no SW, no GA;
                      robots noindex — stays out of the public app)
  css/                Admin-only theme (blue / midnight blue) + components
  js/                 admin-theme-init.js (pre-paint, external so the CSP
                      can stay script-src 'self'), admin-icons.js (extended
                      Lucide set), admin-defaults.js (defaults + field
                      defs), admin-api.js (all Supabase access admin-
                      appearance.js / admin-content.js (section editors +
                      live preview), admin-analytics.js (Phase 6 GA4
                      dashboard), admin-users.js (Phase 7 user directory),
                      admin-auth.js (login + membership boot), admin-app.js
                      (shell, router, dashboard/system fallbacks)
tests/sync.test.js    Node smoke test for the sync engine
                      (run: node tests/sync.test.js)
tests/site-settings.test.js  Validation-matrix test for js/site-settings.js
                      (run: node tests/site-settings.test.js)
tests/security-scan.js       Secret/pattern scan helper
                      (run: node tests/security-scan.js)
tests/rls-guard.test.js      RLS regression guard over the two SQL files
                      (run: node tests/rls-guard.test.js)
tests/analytics.test.js       GA4 proxy security/behaviour harness
                      (run: node tests/analytics.test.js)
tests/admin-users.test.js     User-directory proxy security/behaviour harness
                      (run: node tests/admin-users.test.js)
tests/direct-requests.test.js  DevTools-style anonymous probes against the
                      live REST API — write-safe by construction, skips
                      without network (run: node tests/direct-requests.test.js)
tests/performance.test.js  Payload/critical-path budget guard, measured from
                      disk + index.html load order (run: node tests/performance.test.js)
tests/pwa.test.js     manifest/sw.js/pwa.js contract guard — icon sizes,
                      cache versioning, "never cache private data"
                      (run: node tests/pwa.test.js)
tests/sw-routing.test.js  Executes sw.js's real per-request routing decisions
                      to prove private URLs are never intercepted
                      (run: node tests/sw-routing.test.js)
tests/rls-verify.sql  Server-side verification SQL for the Supabase SQL
                      Editor (the authoritative post-migration check)
```

## Common customizations

| I want to...                        | Edit this |
| ----------------------------------- | --------- |
| Change colors / theme               | `css/variables.css` |
| Change mood emojis or count         | `js/moods.js` (+ `--mood-N-*` colors in variables.css) |
| Change texts / add a language       | `js/i18n.js` |
| Move data to another browser/device | Copy the `moodTracker.v1` localStorage value (DevTools → Application → Local Storage) |
| Change Supabase project / keys      | `js/supabase.js` |
| Site name / theme colors / SEO (no code) | `/admin/` panel (or the `site_settings` table) |
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

## Admin Panel (`/admin/`)

A secure, database-backed settings panel at `/admin/index.html` (stays out
of the PWA cache and GA; `robots noindex`). Global site settings —
appearance (light/dark palettes, radius, glass, shadows, gradient,
animations), mood chip colors, general (site name FA/EN, description,
logo) and SEO (meta, canonical, robots, Open Graph, Twitter card, JSON-LD,
sitemap) — live in a `site_settings` table (key → JSONB) and are enforced
by Supabase RLS.

- **Who is admin?** The `admin_users` table + a `public.is_admin()`
  SECURITY DEFINER helper (avoids RLS recursion). RLS policies make
  `site_settings` public READ (the website applies theme/SEO even signed
  out) and admin-only WRITE; `admin_users` is admin-only.
- **The public site integration** is `js/site-settings.js`: loaded
  synchronously right after `css/variables.css`, it applies a 30-min
  sessionStorage cache immediately (no flash on repeat visits) + starts a
  single REST fetch. Values are injected as CSS custom-property overrides
  in a `<style>` after `variables.css` — so `variables.css` stays the safe
  default config, and an invalid stored value can never break the website
  (every token is validated: color regex, numeric clamps, booleans).
  If Supabase is unavailable the site silently keeps the defaults.
- **Security:** only the public anon key is used (no service-role key);
  existing per-user isolation on profiles / mood_entries / todos /
  birthdays / streaks is untouched. Login: email+password or Google
  (Supabase Auth); a signed-in non-admin gets a "Access denied" screen
  with no details leaked. Driver errors are mapped to short safe messages.
- **Sections:** Dashboard (session/connection/settings rows), Appearance
  (palettes + UI options with live preview), Mood Colors (with chips
  preview), General, SEO, Users (read-only account card + grant/revoke
  admins by UUID), Versions (settings history, diff and restore), Analytics
  (read-only; GA4 Data API reporting needs a secure backend — a Netlify
  Function holding the private key — never a browser key) and System
  (connection test, JSON previews, docs).
- **Setup (once):**
  1. Run `supabase-schema.sql` (sync setup) — supabase-admin.sql builds
     on it (auth + the `set_updated_at` trigger function).
  2. Supabase Dashboard → SQL Editor → paste `supabase-admin.sql` → Run
     (idempotent; safe seeds use `on conflict do nothing`, so re-running
     never clobbers saved settings).
  3. **Bootstrap the first admin (cannot be done from the panel —
     chicken-and-egg):** sign in to the website once, then run in the SQL
     editor:
     ```sql
     insert into public.admin_users (user_id)
     select id from auth.users where email = 'YOUR-EMAIL@example.com'
     on conflict (user_id) do nothing;
     ```
  4. Paste `supabase-versions.sql` → Run (Phase 8: version history +
     audit log). It depends on `is_admin()` and `site_settings` from
     step 2, so it must come after. Also idempotent. Until it is run, the
     Versions section shows a message naming this file instead of an
     error.
  5. Optional (Google sign-in for `/admin/`): Authentication → URL
     Configuration → Redirect URLs → add `https://YOUR-SITE/admin/**`.
- **Live preview** uses scoped CSS variables on mockup elements only —
  it never re-themes the admin page itself. Saving validates every field
  first; "Load defaults" restores the `variables.css` defaults (still
  nothing is saved until "Save changes").
- **Keep in sync:** `AdminDefaults` (admin/js/admin-defaults.js) and
  `SiteSettings.defaults` (js/site-settings.js) mirror `css/variables.css`
  and the `supabase-admin.sql` seeds. The admin panel is LTR/English on
  purpose (owner tool); the public site keeps RTL FA/EN behavior.

## Analytics dashboard (Phase 6 — admin only)

`/admin/ → Analytics` shows real GA4 numbers, fetched **server-side**. The
browser never sees a Google credential.

### Architecture

```
GA4 property
   ↑  service-account credentials (Netlify env vars ONLY)
netlify/functions/ga-report.js        ← the only code holding a secret
   ↑  Authorization: Bearer <supabase access token>
/admin/ → Analytics (admin/js/admin-analytics.js → AdminAPI.fetchAnalytics)
```

**How authorization works.** The function does not trust the frontend at all.
It takes the caller's Supabase access token and forwards it to PostgREST to call
`public.is_admin()` — the same `SECURITY DEFINER` helper the RLS policies use.
PostgREST validates the JWT signature and expiry, and the database decides the
answer. A non-admin gets `403` no matter what the browser claims (there is even
a regression test that spoofing admin flags in the body, query string, or
headers cannot bypass it). **No `service_role` key exists anywhere**, and the
public anon key is used only as the PostgREST API key header — it grants
nothing on its own.

### Required environment variables

Set these in **Netlify → Site settings → Environment variables**, then redeploy.
They are never written to the repo (`.gitignore` blocks `.env` and key files).

| Variable | Value |
|---|---|
| `GA_SERVICE_ACCOUNT_EMAIL` | the service account's `...@....iam.gserviceaccount.com` address |
| `GA_PRIVATE_KEY` | the service account's private key (PEM, include the BEGIN/END lines) |
| `GA4_PROPERTY_ID` | the **numeric** GA4 property id (GA4 → Admin → Property settings) |
| `SUPABASE_URL` | `https://pcgdhkczkyxhpybmrcuf.supabase.co` |
| `SUPABASE_ANON_KEY` | the same public anon key used in `js/supabase.js` |

Netlify stores multi-line values with literal `\n`; the function restores real
newlines automatically, so pasting the key as-is works.

### Google / GA4 setup (one time)

1. **Google Cloud Console → APIs & Services → Library** → enable the
   **Google Analytics Data API**.
2. **IAM & Admin → Service Accounts** → create a service account
   (e.g. `ga-reader`). No project-level IAM role is needed.
3. Open it → **Keys → Add key → Create new key → JSON**. Keep this file out of
   the repo. From it use `client_email` → `GA_SERVICE_ACCOUNT_EMAIL` and
   `private_key` → `GA_PRIVATE_KEY`.
4. **GA4 → Admin → Property access management** → add the service-account email
   as **Viewer**. Without this the API returns 403 (the dashboard explains this).
5. Copy the numeric **property id** into `GA4_PROPERTY_ID`.
6. Deploy, then open `/admin/ → Analytics`. To check the wiring without pulling
   data, hit the endpoint with an admin token and `?probe=1` — it reports which
   variables are missing **by name only**.

### Behaviour notes

- **Charts lag by design.** GA4 daily reports are not final for the current day,
  so the presets end **yesterday**; the panel says so. `Today` is offered
  separately and shows a partial day.
- **Reports:** users/views over time, top pages, devices, countries,
  browser & OS, top events, traffic sources, plus 7 KPI cards
  (users, new users, sessions, views, events, engaged sessions, engagement time).
- **Comparison** against the previous equal-length period is opt-in per view and
  is dropped silently when unavailable — it never blocks the main render.
- **States:** loading skeletons, empty range, per-block degradation
  (a single failing report does not blank the page), rate-limit, setup-required
  and network errors, each with a safe error code and a Retry button.
- **`Last updated`** comes from the server's `generatedAt` timestamp.

### Tests

```
node tests/analytics.test.js   # 68 checks: auth, ranges, failures, leaks, UI
```

Covers unauthenticated → 401, non-admin → 403 (including 9 flag-spoofing
variants), admin → 200, invalid/future/reversed ranges → 400, GA4 429/403/500
handling, missing credentials without leakage, no `service_role`/private key in
frontend files, service-worker exclusion, and that the dashboard module renders
without a `ReferenceError`.

## User management (Phase 7 — admin only)

`/admin/ → Users` is a private user directory: list, search, status filter,
sorting, pagination and a per-user detail view with mood / todo / birthday
counts. Accounts and emails live in `auth.users`, which the browser cannot read,
so this too is served **server-side**.

### Architecture

```
Supabase Auth Admin API   +   public.profiles / mood_entries / todos /
                              birthdays / streaks  (aggregate counts only)
        ↑  SUPABASE_SERVICE_ROLE_KEY (Netlify env var ONLY)
netlify/functions/admin-users.js       ← the only code holding the key
        ↑  Authorization: Bearer <supabase access token>
/admin/ → Users (admin/js/admin-users.js → AdminAPI.fetchUsers)
```

**How authorization works.** Identical model to the analytics proxy: the
caller's Supabase access token is forwarded to PostgREST to call
`public.is_admin()`, so the **database** decides. The service-role client is
constructed **only after** that check passes, so a non-admin never causes a
privileged request. Server-side authorization is authoritative — client flags in
the body, query string or headers are ignored, and there is a regression test
proving it.

**Why a service key is needed here.** Every user-owned table is gated on
`auth.uid() = user_id` and `supabase-schema.sql` contains no `is_admin()`
reference at all — an admin cannot read another user's rows through the anon key.
Listing accounts therefore genuinely requires the Admin API, which is why the
key stays server-side and is never sent to the browser or written to the repo.

### What is shown (and what is not)

Shown: user id, email, display name, created date, account status
(active / never signed in / unconfirmed / blocked), last sign-in **only when
Supabase actually provides it**, admin flag and grant date, and counts of mood
entries, todos and birthdays (excluding soft-deleted rows), plus streak.

Not shown, by construction: `encrypted_password`, recovery/confirmation tokens,
`identities`, `app_metadata`, phone numbers, the raw `user_metadata` blob, and
`profiles.settings`. The projection is an allow-list, and tests assert each of
those fields is absent from the response.

### Admin management

Grant and revoke continue to use the existing RLS-protected `admin_users` path
(`AdminAPI.grantAdmin` / `revokeAdmin`) — unchanged, and still enforced by the
database. Two lock-out guards apply in the UI:

- you cannot revoke **your own** admin access;
- you cannot revoke the **last remaining** administrator.

Both guards are conveniences; the `self-delete` lockout guard in
`supabase-admin.sql` remains the real backstop.

**No destructive account operations were added.** There is no delete-user,
disable-account or reset-password action, because the existing architecture does
not support them safely (the Auth Admin API needs the service key, and adding
account destruction would enlarge the blast radius well beyond this phase).

### Graceful degradation

If `SUPABASE_SERVICE_ROLE_KEY` is not set, the endpoint answers `CONFIG_ERROR`
and the section falls back to the admin-membership view (list admins, grant by
UUID, revoke) — that path uses RLS, not the service key, so admin access can
still be managed before the key is configured.

### Additional environment variable

| Variable | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project settings → API → `service_role` secret. **Server-side only.** Also required by `SUPABASE_URL` / `SUPABASE_ANON_KEY` above. |

Set it in **Netlify → Site settings → Environment variables**, then redeploy. To
check the wiring without loading any data, call the endpoint with an admin token
and `?probe=1` — it reports which variables are missing **by name only**, never
by value.

### Behaviour notes

- **Search** matches email, display name or user id (case-insensitive) and is
  debounced; **status** filters by all / active / admins / unconfirmed / never
  signed in; **sorting** covers created, last sign-in, email, moods, todos,
  birthdays and streak. Unrecognised sort or status values fall back safely
  instead of widening the result set.
- **Pagination** is applied server-side (25 per page, capped at 100). Totals in
  the strip describe the whole set, not the current page.
- **Bounded scan.** The Auth Admin API is paged and capped; if the cap is hit the
  panel says the totals are partial rather than implying they are exact.
- **States:** loading skeleton, empty, error with a safe code and Retry, and a
  details view with a "Back to list" action.
- **Confirmation** is required before granting or revoking admin access.
- All server strings are HTML-escaped in the UI; user-supplied names and emails
  cannot inject markup.

### Tests

```
node tests/admin-users.test.js   # 149 checks: authz, inputs, leaks, UI states
```

Covers unauthenticated → 401 (with no upstream call and no config disclosure),
non-admin → 403 with no privileged call, an `is_admin` failure or network error
failing **closed** (503, never an accidental allow), admin → 200 with correct
joins, 8 flag-spoofing variants denied, invalid/malicious user ids (SQL
injection, path traversal, null bytes, malformed UUIDs) → 400, unknown valid
UUID → 404, paging clamped, missing service key reported **by name**, upstream
500/429 handled with no body or key leakage, `no-store` headers, no credential in
frontend files, and the UI rendering every state without throwing.

## Version history & restore (Phase 8 — admin only)

A private **Versions** section in the admin panel records every change to the
site settings, lets you read what changed, and puts any earlier state back.

### What is versioned

The **application settings only** — the 7 `site_settings` groups that the public
website applies: `general`, `appearance.light`, `appearance.dark`,
`moodColors.light`, `moodColors.dark`, `ui` and `seo`. That is the theme, the
mood colours, the UI options and the SEO/meta configuration.

This is deliberately **not** a database backup. It does not copy `profiles`,
`mood_entries`, `todos`, `birthdays` or `streaks`, and it adds no infrastructure
for doing so. See [Backups](#backups) below for what a real backup needs.

### Why a snapshot cannot be missing or forged

Snapshots are written by a **trigger on `site_settings`**, not by the admin
panel. Any write that reaches the table — from the admin UI, from a direct
PostgREST call, or from a restore performed by the server function — produces a
version row. There is no code path that changes the live settings without
leaving a version behind.

The trigger is **statement-level** (`for each statement`, with transition
tables). One write statement therefore produces exactly one version, recording
the state *after* the whole statement — never a half-applied mix of old and new
groups.

### Why history cannot be rewritten

`settings_versions` has **no UPDATE and no DELETE policy**. Under RLS that is a
hard block for `anon` and `authenticated` alike. `admin_audit_log` additionally
carries a `BEFORE DELETE` trigger that raises, so history survives even a future
policy mistake. There is deliberately no way to "fix" history from the panel.

Version numbers come from a single-row counter (`settings_version_seq`) that
only advances when a version row is actually kept — not from a `serial`, whose
sequence burns a number on a rolled-back transaction. Version ids are therefore
**contiguous**, and a missing number is real evidence of tampering.

### What a version records

| Field | Meaning |
|---|---|
| `version_id` | Contiguous number, newest = highest |
| `created_at` | When the change landed |
| `created_by` | The admin who made it (`auth.uid()`) |
| `description` | Free text for checkpoints (≤ 200 chars) |
| `trigger_source` | `manual` / `auto` / `restore_before` / `restore_after` |
| `changed_keys` | Which settings groups the statement touched |
| `parent_version_id` | For a restore, the version it restored from |
| `snapshot_sha256` | SHA-256 of the snapshot, for integrity comparison |
| `snapshot` | The full validated settings state (≤ 256 KB) |

### The Admin UI (`/admin/#versions`)

- **List** — newest first, with date/time, creator, description, source badge and
  the settings groups each version touched.
- **Filters** — source (`Checkpoints` / `Automatic` / `Restores`), free-text
  search over description / id / creator, and sortable columns with paging.
- **Details** — every field of the selected version, plus a **field-level diff**
  against what is live right now, and a badge saying whether the version still
  matches the live site.
- **Save a version now** — an explicit named checkpoint of the current settings.
- **Restore** — always behind a confirmation naming the exact version id, how
  many settings will change, and the fact that it is reversible.

### How a restore works (server-side, 5 steps)

All five steps run inside `netlify/functions/admin-versions.js`; the browser
never writes settings itself.

1. **Verify** the caller is an authenticated admin — the caller's own Supabase
   access token is forwarded to `public.is_admin()` and the **database** decides.
   Until that returns true, the function performs no read and no write.
2. **Validate** the stored snapshot against the same validator family
   `js/site-settings.js` uses on read. The snapshot is *not* trusted: unknown
   keys are dropped, colours must match the CSS colour grammar, URLs must be
   http(s) or site-relative, numbers are clamped, booleans must be booleans, text
   is length-capped and stripped of control characters, and the JSON-LD field
   must parse. What comes out is a brand-new object with no path back to the
   stored structure — so a snapshot can never inject HTML, JS, CSS or a script
   tag into the live site.
3. **Save the current state as a new version** (`restore_before`) — the undo
   point. Because the trigger records the state *after* each statement, this
   write's version *is* the pre-restore state.
4. **Restore** the selected version in **one** statement (`restore_after`), so
   history never shows an intermediate state.
5. **Record the action** in the audit log and re-read the table to confirm the
   stored bytes match what was restored.

A restore that would change nothing is short-circuited: it is still audited, but
creates no version rows.

### Audit log

`admin_audit_log` is append-only and records **who did what to which target**,
with a small metadata object: settings writes, checkpoints, restores, restore
no-ops and admin grant/revoke operations. It never records passwords, tokens,
private keys, service credentials, request bodies or settings values. The writer
(`log_admin_action`) is `SECURITY DEFINER` and re-checks `is_admin()` itself, so
a non-admin session cannot write to the log even if a policy is later loosened.

### Environment variables

**None.** Phase 8 adds no new secrets. `admin-versions.js` uses only
`SUPABASE_URL` and `SUPABASE_ANON_KEY` (already required by Phases 6–7) and the
caller's own token — it never needs `SUPABASE_SERVICE_ROLE_KEY`. Reading other
admins' display names would require the Auth Admin API, so the UI falls back to
a short id for anyone but the current user; that trade was made deliberately.

### Behaviour notes

- A missing migration degrades to an explicit message naming
  `supabase-versions.sql`, not a generic error — the operator cannot fix what
  they cannot identify.
- Unauthenticated → `401`, non-admin → `403`, unreachable database → `503`
  `AUTH_UNAVAILABLE`. All fail closed.
- Every failure is a stable machine-readable code (`MIGRATION_REQUIRED`,
  `INVALID_VERSION_ID`, `VERSION_NOT_FOUND`, `INVALID_SNAPSHOT`,
  `CONFIRMATION_REQUIRED`, `NOTHING_TO_SNAPSHOT`, `RESTORE_FAILED`).
- All responses are `Cache-Control: no-store` and never echo upstream bodies.
- Restoring is reversible: the `undoVersionId` returned by a restore is the
  version you would restore to get back.

### Tests

```
node tests/admin-versions.test.js   # 248 checks: function authz, restore, UI
node tests/versions-guard.test.js   #  73 checks: the migration's guarantees
```

`admin-versions.test.js` covers unauthenticated → 401 with zero upstream calls,
non-admin → 403 with no privileged read **and no write**, a rejected token → 403
vs an unreachable admin check → 503, admin list/detail/checkpoint/restore, 11
malicious version ids → 400, paging and sort clamped so a raw value never
reaches the query string, the full tamper battery (an unknown group is dropped
and reported, CSS and `javascript:` colours refused, bad JSON-LD refused, numbers
clamped, control characters stripped, non-object snapshots refused), the 5-step
restore ordering, the undo point holding the *pre*-restore values, a refused
write → 502 with no RLS internals leaked, a failed audit not breaking the
operator's action, `no-store` headers, a frontend leak scan proving no
credential reaches the browser, and the UI rendering all 9 states without
throwing.

`versions-guard.test.js` asserts the database contract statically: scope honesty,
immutability, RLS coverage, the statement-level trigger, gap-free version numbers,
the size and length bounds, that **every** `trigger_source` value the CHECK
allows is actually reachable in practice, that the audit table has no
credential-shaped column, that the migration is idempotent, and that it contains
no dynamic SQL.

Both suites are regression-proven: removing the admin check, removing the
snapshot validation, exposing `snapshot` in the list, downgrading the trigger to
row-level, adding a DELETE policy, and breaking a preview asset path each make
the relevant suite fail.

## Backups

There are two different things people mean by "backup" here, and they need
different answers.

### 1. Settings history (what Phase 8 builds)

Version history covers the application settings — theme, mood colours, UI options,
general identity and SEO. Restore is one click and reversible. This is the
day-to-day "I changed the theme and don't like it" workflow. It lives entirely in
this repo (`supabase-versions.sql` + `netlify/functions/admin-versions.js`) and
needs no external service.

### 2. Full database backup (documented, NOT built here)

Version history is **not** a substitute for a database backup. User data
(`profiles`, `mood_entries`, `todos`, `birthdays`, `streaks`) is not versioned,
and a bad migration, an accidental mass-delete or a lost Supabase project would
take it with it.

A real database backup needs infrastructure this repository does not have, so it
is **deliberately not implemented**. Doing it properly means either:

- **Supabase point-in-time recovery (PITR)** — a paid-plan feature. Enable it in
  the Supabase dashboard under *Database → Backups*. This is the recommended
  option: it is continuous, requires no code, and restores to any moment. Nothing
  in this repo needs to change.
- **Scheduled `pg_dump`** — connect with the database connection string from
  *Project Settings → Database*, dump to a file, and ship it somewhere durable
  (S3, Backblaze B2, Google Drive). This needs a scheduler and a destination you
  own; putting it in a Netlify Function would be fragile (execution time limits,
  no persistent disk, and the connection string would become another secret to
  rotate). Prefer a small cron job on a machine you control.

Also worth exporting by hand, since they live in dashboards rather than the repo:

- **Netlify environment variables** — `GA4_*` (Phase 6) and
  `SUPABASE_SERVICE_ROLE_KEY` (Phase 7), plus `SUPABASE_URL` /
  `SUPABASE_ANON_KEY`. Copy them somewhere safe; a Netlify site deletion takes
  them with it.
- **The GA4 service-account JSON key**, if you still have it.

What to do if you are not ready to set either option up: at minimum, note the
project ref and keep the SQL files in this repo under version control, so the
*structure* can always be recreated. The data itself would be lost.

## Security model (audited)

**The frontend is not a trusted environment.** Anyone can open DevTools, edit
localStorage, call the Supabase REST API directly, or fabricate requests. The
actual security boundary is the database:

```
Supabase Auth (email/password or Google)
        ↓
Admin role = membership row in admin_users + public.is_admin() (SECURITY DEFINER)
        ↓
RLS policies on every table
        ↓
Admin Panel UI (UX only — never the boundary)
```

- **User data:** profiles / mood_entries / todos / birthdays / streaks all have
  `auth.uid() = user_id` policies (own row only) for SELECT/INSERT/UPDATE/DELETE.
  Offline sync uses the same client; RLS rejects any row that doesn't belong to
  the signed-in user.
- **site_settings:** public *read* (the public site applies theme/SEO without an
  account) and admin-only *write* (policies call `is_admin()`). The Admin Panel
  re-checks membership for UX, but a forged request still fails at RLS.
- **is_admin()** is `SECURITY DEFINER` (runs as the table owner) and returns only
  a boolean — it cannot be used to read rows, and it avoids RLS policy recursion.
  `security definer` + `set search_path = public` on a `stable` function makes it
  safe from search-path hijacking and abuse.
- **Hardening in supabase-admin.sql:** site_settings key whitelist (CHECK), a
  64 KB value-size guard trigger (prevents a multi-MB JSONB from becoming a
  public-read DoS), `updated_by` column revoked from `anon`, a no-OP UPDATE
  policy on admin_users, and a self-delete lockout guard on the admin DELETE
  policy (`auth.uid() <> user_id`). Re-run `supabase-admin.sql` in the Supabase
  SQL Editor to apply (idempotent — seeds use `on conflict do nothing`).
- **Secrets:** the codebase ships only the public **anon** key (by design — it
  powers the client SDK). Two server-side credentials live exclusively in Netlify
  environment variables and are never written to the repo, never sent to a
  browser and never echoed in a response or log: the GA4 service-account key
  (Phase 6) and `SUPABASE_SERVICE_ROLE_KEY` (Phase 7). The service-role client in
  `admin-users.js` is constructed **only after** the DB has confirmed the caller
  is an admin, so a non-admin never triggers a privileged request. No `.env`
  files. Run `node tests/security-scan.js` to re-verify.
- **Server-side authorization (Phases 6–8):** all three function endpoints
  authorize by forwarding the caller's Supabase access token to
  `public.is_admin()` and letting the database decide. Client-supplied claims —
  body flags, query flags, `x-admin` headers — are ignored, with regression tests
  asserting it. `admin-versions.js` in particular performs no read and no write
  until the admin check returns true, and it needs no service-role key at all.
- **Settings history (Phase 8):** snapshots are written by a database trigger,
  not by a client, so settings cannot change without leaving a version behind.
  `settings_versions` has no UPDATE and no DELETE policy, and `admin_audit_log`
  raises on delete — history is immutable at the database level, not by
  convention. A restore re-validates the stored snapshot field-by-field before
  applying it, so a tampered or hand-edited snapshot cannot inject HTML, CSS or
  JavaScript into the public site. Neither table is reachable by `anon`, and the
  `/admin/` CSP restrictions apply to the whole section.
- **Transport & headers:** TLS on Netlify; `_headers` sends `nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` everywhere and
  a strict CSP + `Cache-Control: no-store` for `/admin/*` (the theme pre-paint is
  an external file so the CSP needs no `script 'unsafe-inline'`).
- **Service worker:** Supabase API responses are never cached; the whole `/admin/`
  path is excluded from the runtime cache and is never precached, so admin pages
  can never come from (or be served into) the offline public app.
- **Known accepted risks (documented choices):** Supabase stores the session
  (access + refresh token) in localStorage (`persistSession: true`) — that is the
  Supabase default; keep it. The public site has no CSP yet (it needs production
  testing to keep GA4 / Supabase working — see _headers comment).
  The vendored supabase-js build has no version tag; update it manually from the
  official UMD build when the site is next touched.

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
only a fallback for offline use. The self-hosted font ships in
`PRECACHE_URLS`, so typography is ready on first paint and offline.

**To ship an update:** edit files, add any new files to `PRECACHE_URLS`
in `sw.js`, bump `CACHE_VERSION`, deploy. Users get it once they refresh,
and a toast appears when the new version activates. `js/pwa.js` also asks
the browser to re-check `sw.js` at most once a day, so a tab that is left
open (or an installed app that is resumed rather than restarted) does not
go indefinitely without seeing a deployment.

### What the service worker will never do

These are security rules, not preferences. `tests/sw-routing.test.js`
executes the real routing decisions in `sw.js` against real URLs and fails
if any of them stop holding:

- **Never intercept or cache** anything on `*.supabase.co` (auth tokens,
  session, mood rows, settings rows, profiles). The sync engine must always
  see live data, and a cached token on disk is a credential leak.
- **Never intercept or cache** `/.netlify/functions/*` — these return GA4
  reports, the user directory and settings history, all admin-only.
- **Never intercept, cache or precache** the whole `/admin/` panel. An
  offline `/admin/` request fails like a normal network error rather than
  serving the public shell.
- **Never serve a cached body for a different URL.** The offline lookup is
  exact; only a *navigation* falls back to the cached `index.html`.

## UI/UX redesign (Phase 10) — REVERTED

> **This phase has been reverted.** The app UI is back to the original
> design (the state published at
> <https://github.com/houtan17/Mood-tracker> and
> <https://fmoodtracker.netlify.app/>): a single header row with the
> Dashboard button, the `280px | minmax(320px, 620px) | 340px` home
> grid, rounded-square day cells with a full-cell mood tint, an
> always-visible note field and an explicit Save button.
>
> Removed with it: `css/responsive.css`, `js/state.js`, `js/focus.js`,
> the two-row header, the footer Dashboard pill, the circular
> `.day-disc` calendar, the one-tap save, and the note disclosure.
> Everything built after it — the admin panel, the DB-backed theme,
> SEO, sync/auth, PWA and the deferred Supabase chain — is untouched.
>
> The section below is kept as a record of what was tried, and as the
> reference if it is ever re-applied.

A structural redesign, not a reskin. The rule followed throughout was:
identify the UX problem first, then change structure; do not start by
changing colors, radii, shadows or spacing.

Guarded by `tests/ui-contract.test.js` (33 checks), which statically
verifies the JS↔CSS↔HTML contract: every class the JS emits has a CSS
rule, every `$("id")` lookup resolves, `mood-bg-1..5` survive end to end,
one-tap save is intact, no purple, no duplicated `:root` token, and no
Phase 10 asset leaked into `/admin`.

### The problems that were found

1. **The primary action cost 3 interactions.** Recording a mood meant
   tap day → tap emoji → tap Save.
2. **The calendar read as a wall of tinted blocks.** Cells were rounded
   squares (12px on 52px) and a recorded mood flooded the whole cell, so
   the day number lost emphasis.
3. **Only two breakpoints existed** (540px, 1100px). 541–1100px fell
   into a hard-coded `240px | 1fr | 300px` grid; nothing above 1360px was
   differentiated. No tablet layout at all.
4. **The header had 6 competing controls**, including a Dashboard button
   that duplicated a bottom-nav tab.
5. **Touch targets below 44px:** `nav-btn` 38×38, `modal-close` 34×34,
   `auth-pass-toggle` 30×30.
6. **Only one of three modals was a real dialog.** No focus trap, no
   initial focus, no focus restore on any of them.
7. **No loading state anywhere.** A slow Supabase read, an in-flight
   sync and a genuinely empty account all rendered the same blank.
8. **Three different tab/segmented-control implementations.**

### Structural changes

- **Calendar:** day markers are now true circles (`.day-disc`,
  `border-radius: 50%`) inside a transparent square hit area
  (`.day-cell`). Mood is expressed as a **ring** + emoji glyph + an
  `aria-label` naming the mood — never color alone. Today is a filled
  gradient disc; the selected day gets a detached outer ring. Those two
  states are deliberately different *shapes*, and high-specificity rules
  keep selection visible on a day that also has a mood.
- **Mood picker:** one tap on a mood saves and closes. The note moved
  behind an "add a note" disclosure (auto-expanded when reopening a day
  that already has one). `⌘/Ctrl+Enter` saves from the textarea. Delete
  is an inline two-step confirm instead of `window.confirm()`.
- **Header:** restructured from one crowded row into two — identity
  (auth | app name | streak + language) and context (greeting | active
  view name). The Dashboard button moved to the footer.
- **Navigation:** all five mobile destinations kept (per the chosen
  option), redesigned with a 44px+ target and a gradient rail on the
  active tab so the state is not color-only.
- **Four intentional responsive tiers** in `css/responsive.css`, loaded
  last so it overrides the legacy breakpoints without editing them:
  mobile ≤600px (own IA: one view at a time, bottom nav, modals become
  bottom sheets), tablet 601–1023px (**new** — calendar full width,
  panels side by side below it), desktop 1024–1439px, wide ≥1440px
  (more air, larger day cells).
- **Unified state surfaces** (`js/state.js` + `.state-surface`): one
  empty/loading/error component replaces three ad-hoc treatments and
  fills the gaps where there was none (dashboard stats).

### Accessibility

`js/focus.js` adds a real focus trap to all three overlays — it watches
each overlay's existing `.hidden` class, so no call site had to change.
It moves focus in on open, keeps Tab inside, and restores focus on close.
Also: `aria-pressed` on mood options, a labelled mood group, a live-region
toast holder that re-announces repeated messages, `aria-current` on the
active tab, per-modal `role="dialog"`/`aria-modal`, `aria-busy` on async
buttons, and `prefers-reduced-motion` honoured for every new animation
(the skeleton shimmer stops; the spinner keeps turning because it conveys
state).

## Performance (Phase 9)

Measured from the files on disk plus `index.html`'s own load order, and
guarded by `tests/performance.test.js` (58 checks) so a regression fails
the build rather than silently shipping.

> Phase 10 raised two performance budgets (total CSS 80 KB → 100 KB,
> per-file CSS 20 KB → 32 KB). With that redesign reverted, both are
> back to their Phase 9 ceilings: **total CSS 80 KB** and **per-file CSS
> 20 KB**. Measured total is ~62 KB, largest file ~11 KB. The critical
> path guard (150 KB) was never relaxed.

### Baseline → after optimization

| Metric | Before | After |
| --- | --- | --- |
| Critical path (blocks first paint) | **121.7 KB** | **63.5 KB** |
| Parser-blocking JS in `<head>` | 3 files, 59.3 KB | 1 file, 1.0 KB |
| Render-blocking CSS | 9 files, 62.4 KB | 9 files, 62.4 KB |
| Total production payload | 538 KB | 496 KB |

| First-install precache | included 209 KB vendor bundle | vendor bundle excluded |

The critical path dropped **48%** with no architectural change: the three
scripts that were blocking the parser (`js/site-settings.js`,
`js/seo-manager.js` and the 209 KB vendored `js/vendor/supabase.js`) now
load with `defer`. All three already waited for `DOMContentLoaded` before
touching the DOM, so the only thing that changed is *when they run*.

**The Supabase chain must be deferred as a group.** `js/vendor/supabase.js`,
`js/supabase.js`, `js/sync.js` and `js/auth.js` are either all `defer` or
all classic. `js/supabase.js` reads `window.supabase` at load time, so
deferring the vendor bundle alone would break accounts and sync. Deferred
scripts run in document order after parsing but *before* `DOMContentLoaded`,
which is why `app.js` (classic) still sees `window.Sync` / `window.Auth`
in its own `DOMContentLoaded` init.

`js/theme-init.js` stays synchronous on purpose — it sets `data-theme`
before first paint, and that is the whole point of the file.

### Not measured here

**Lighthouse is not available in this environment** (`npx` cannot install).
LCP, INP, CLS, FCP and TTFB therefore **were not measured**, and no score
is claimed. They require a browser against a deployed origin:

1. Deploy to Netlify.
2. Run Lighthouse (mobile + desktop) on the production URL.
3. Check that Netlify is serving Brotli/gzip — this repo cannot verify
   compression, and it matters more than anything changed here.

Also unverified locally because they need live services: real Supabase
round-trips, Google OAuth, GA4 delivery, and the Netlify functions.
`tests/direct-requests.test.js` is skipped unless `supabase-admin.sql` has
been applied to a live project.

### What was checked and found already fine

No forced synchronous layout (`offsetTop`/`getBoundingClientRect`/
`getComputedStyle`) anywhere; no unthrottled `scroll`/`resize`/`input`
listeners; sync already debounced (2 s push, 30 s focus resync); SEO
already deduplicated via `sameAsLast()`; the vendor bundle already
minified with the font already using `display=swap` plus a system
fallback. None of these were "optimized" because none were bottlenecks —
changing them would have been churn with regression risk.

