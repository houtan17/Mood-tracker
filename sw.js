/* ============================================
   SERVICE WORKER — sw.js
   Network-first strategy for same-origin assets
   (a single refresh always gets the newest code),
   cache fallback for offline use, cache-first for
   cross-origin requests (rare now: the font is
   self-hosted and precached below).

   ===== MAINTENANCE GUIDE (no build tools here) =====
   1. ADDED A NEW FILE?  Add it to PRECACHE_URLS below
      so it is available offline even on the very first
      visit. (Every same-origin response is ALSO cached
      at runtime, so forgetting the list only affects
      users who go offline before ever loading the file.)
   2. SHIPPING AN UPDATE?  Bump CACHE_VERSION. Because
      fetching is network-first, users get fresh code
      when online even WITHOUT a bump; the bump only
      purges the old offline cache on activate.
   3. Analytics, SW registration and the update toast
      live in js/pwa.js — one shared copy for the app
      (everything runs inside index.html).
   ==================================================== */

const CACHE_VERSION = 'v22';
const CACHE_NAME = `mood-tracker-${CACHE_VERSION}`;

/* Core assets cached on install (app shell).
   Everything here is relative to the SW location,
   so the app also works when hosted in a subfolder.

   DELIBERATELY NOT PRECACHED (see "never cache" rules below):
   - js/vendor/supabase.js (209 KB) — it is the single largest
     asset and nothing in the app shell needs it before the user
     signs in or sync runs. It is same-origin, so it is still
     cached at runtime the first time it is requested; precaching
     it only made the very first install slower. */
const PRECACHE_URLS = [
  './',
  // --- page (the whole app is index.html) ---
  'index.html',
  // --- shared ---
  'manifest.json',
  'css/fonts.css',               // @font-face for the self-hosted face
  'fonts/Vazirmatn-Variable.woff2', // Vazirmatn variable (Arabic+Latin, 111 KB) — typography works offline
  'css/variables.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'js/jalali.js',
  'js/icons.js',   // Lucide icon set + data-ico hydration
  'js/ui.js',      // shared helpers (toast, escapeHtml, makeId, pad2)
  'js/base64url.js',     // UTF-8-safe base64 (used by settings-sign.js)
  'js/moods.js',
  'js/i18n.js',
  'js/storage.js',
  'js/theme.js',
  'js/theme-init.js',
  'js/streak.js',
  'js/pwa.js',
  // --- main page (calendar + year counter + todo panel + views) ---
  'js/calendar.js',
  'js/app.js',
  'js/todo.js',
  'js/dashboard.js',
  'js/yearcounter.js',
  'js/views.js',
  'css/home.css',
  'css/todo.css',
  'css/dashboard.css',
  // --- birthdays page ---
  'js/birthdays.js',
  'js/dateconverter.js', // Jalali <-> Gregorian Date Converter
  'css/birthdays.css',
  // --- accounts & cloud sync (Supabase) ---
  'js/supabase.js',        // project URL + anon key + shared client
  'js/sync.js',            // offline-first snapshot-diff sync engine
  'js/auth.js',            // account UI + session management
  'css/auth.css',
  // --- icons ---
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

/* ---------- Install: pre-cache the app shell ----------
   addAll() is atomic: ONE failed request rejects the whole batch
   and the SW never activates. That is the right failure mode
   (no half-populated cache), but it also means a single 404 in
   PRECACHE_URLS breaks offline entirely, so each entry must exist.
   skipWaiting() is chained AFTER the cache is populated so the new
   SW never takes over with an empty cache. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activate new SW immediately
  );
});

/* ---------- Activate: delete old cache versions ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('mood-tracker-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // take control of open tabs
  );
});

/* ---------- Cache write helper ----------
   Cache.put() is a promise that REJECTS for quota errors, opaque
   responses and unsupported schemes. Both call sites used to ignore
   it (fire-and-forget), which turned every such rejection into an
   unhandled rejection and silently dropped the entry. Swallowing the
   error here keeps caching best-effort — a failed write must never
   break the fetch that the user is waiting on. */
function cacheResponse(request, response) {
  const copy = response.clone();
  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {
      /* Quota / opaque / unsupported scheme: keep serving the network
         response, just do not cache it. Not worth surfacing. */
      return undefined;
    });
}


/* ---------- Fetch: network-first + cache fallback ----------
   Same-origin requests (pages, css, js, icons) always try the
   network first, so ONE refresh is enough for any code change to
   reach the user. The cache is only used when the network fails
   (offline). Fresh responses replace cached copies, so the next
   offline session serves the new version too.

   Cross-origin requests stay cache-first (there are
   none on the critical path anymore — the font is
   self-hosted — but the rule is harmless to keep). */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests (skip form posts, etc.)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip unsupported request schemes (chrome-extension:, chrome:,
  // moz-extension:, safari-extension:) — Cache.put() throws
  // "Request scheme 'chrome-extension' is unsupported" for these.
  if (/^(chrome-extension|chrome|moz-extension|safari-extension):$/.test(url.protocol)) {
    return; // let the browser handle it, never cache or intercept
  }

  /* ----- Supabase API (auth + database): NEVER cached -----
     The sync engine must always see live data; caching these
     responses would serve stale reads and break offline diffing.
     The vendored supabase.js library itself is same-origin, so
     it is network-first like every other app asset. */
  if (url.origin === 'https://pcgdhkczkyxhpybmrcuf.supabase.co') {
    return; // default browser fetch, no SW involvement
  }

  /* ----- Private server endpoints: NEVER cached -----
     The admin-only server proxies under /netlify/functions/ return
     analytics, the user directory and settings history. They are
     same-origin, so without this guard they would fall into the
     network-first branch below and land in the PWA cache — storing
     private data on disk and serving it to a later (possibly
     signed-out) request.
     The prefix match covers every current endpoint (ga-report,
     admin-users, admin-versions) and any future one.
     Same reasoning as Supabase above: bypass entirely. */
  if (url.pathname.startsWith('/.netlify/functions/') ||
    url.pathname.startsWith('/netlify/functions/')) {
    return; // default browser fetch, no SW involvement
  }

  /* ----- Admin panel: NEVER cached, never precached -----
     /admin/ stays completely out of the PWA cache
     lifecycle: no precache entry, no runtime cache,
     no offline fallback (an offline /admin/ request
     fails like a normal network error instead of
     serving the public index.html). Cache names bump
     to v17 so existing caches purge on activate. */
  if (url.pathname === '/admin' ||
    url.pathname.endsWith('/admin') ||
    url.pathname.includes('/admin/')) {
    return; // default browser fetch, no SW involvement
  }

  /* ----- Cross-origin: cache-first ----- */
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response &&
            (response.type === 'basic' || response.type === 'opaque')) {
            return cacheResponse(request, response).then(() => response);
          }
          return response;
        });
        // Offline and not cached → fail like a normal network error
      })
    );
    return;
  }

  /* ----- Same-origin: network-first ----- */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          return cacheResponse(request, response).then(() => response);
        }
        return response;
      })
      .catch(() =>
        /* Offline → serve the cached copy.

           The lookup is EXACT (no ignoreSearch): an earlier version
           passed { ignoreSearch: true }, which made the query string
           irrelevant. For this app that is a correctness bug — the
           app is one index.html whose state lives in the hash/query,
           and any cached URL could be served for a different one,
           handing the user another page's body. A miss now falls
           through to the explicit fallbacks below instead. */
        caches.match(request).then((cached) => {
          if (cached) return cached;
          /* Navigations fall back to the cached app shell. */
          if (request.mode === 'navigate') {
            return caches.match('index.html');
          }
          return Response.error();
        })
      )
  );
});