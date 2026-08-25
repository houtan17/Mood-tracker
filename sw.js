/* ============================================
   SERVICE WORKER — sw.js
   Cache-first strategy for static assets.
   Bump CACHE_VERSION whenever you ship changes
   to any file listed in PRECACHE_URLS — the old
   cache is deleted on activate and clients
   get the fresh version on next load.
   ============================================ */

const CACHE_VERSION = 'v3';
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

/* ---------- Fetch: cache-first, network fallback ---------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests (skip form posts, etc.)
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      // Not in cache → fetch from network, then store a copy
      return fetch(request)
        .then((response) => {
          // Only cache valid, same-origin responses
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached:
          // fall back to the cached shell for page navigations
          if (request.mode === 'navigate') {
            return caches.match('index.html');
          }
          return Response.error();
        });
    })
  );
});
