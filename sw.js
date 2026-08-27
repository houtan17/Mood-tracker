/* ============================================
   SERVICE WORKER — sw.js
   Network-first strategy for same-origin assets
   (a single refresh always gets the newest code),
   cache fallback for offline use, cache-first
   only for cross-origin fonts.
   Bump CACHE_VERSION whenever you ship changes —
   the old cache is deleted on activate.
   ============================================ */

const CACHE_VERSION = 'v5';
const CACHE_NAME = `mood-tracker-${CACHE_VERSION}`;

/* Core assets cached on install (app shell).
   Everything here is relative to the SW location,
   so the app also works when hosted in a subfolder. */
const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/variables.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'js/jalali.js',
  'js/moods.js',
  'js/i18n.js',
  'js/storage.js',
  'js/theme.js',
  'js/calendar.js',
  'js/app.js',
  'todo.html',
  'css/todo.css',
  'js/todo.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

/* ---------- Install: pre-cache the app shell ---------- */
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

/* ---------- Fetch: network-first + cache fallback ----------
   Same-origin requests (pages, css, js, icons) always try the
   network first, so ONE refresh is enough for any code change to
   reach the user. The cache is only used when the network fails
   (offline). Fresh responses replace cached copies, so the next
   offline session serves the new version too.

   Cross-origin requests (e.g. Google Fonts) stay cache-first:
   font files never change, so cached copies are safe and fast. */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests (skip form posts, etc.)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* ----- Cross-origin: cache-first ----- */
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response &&
            (response.type === 'basic' || response.type === 'opaque')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
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
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        // Offline → serve the cached copy
        caches.match(request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          // Navigations fall back to the cached app shell
          if (request.mode === 'navigate') {
            return caches.match('index.html');
          }
          return Response.error();
        })
      )
  );
});
