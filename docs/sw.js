// ─────────────────────────────────────────────
//  Sitecore Changelog Reels — Service Worker
//  Strategy:
//    • Static assets  → Cache-first  (fast loads)
//    • changelog.json → Network-first (fresh data)
//    • Offline        → Serve cache  (full offline support)
// ─────────────────────────────────────────────

const CACHE_NAME = 'sc-reels-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './manifest.json',
  './icons/icon.svg',
];

// ── Install: pre-cache all static assets ──────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache or network ────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // ── changelog.json → Network-first ───────────
  // Always try to get fresh data; fall back to cache when offline
  if (url.pathname.endsWith('changelog.json')) {
    event.respondWith(
      fetch(request)
        .then(networkRes => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return networkRes;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── Everything else → Cache-first ─────────────
  // Serve instantly from cache; update cache in background if stale
  event.respondWith(
    caches.match(request).then(cachedRes => {
      if (cachedRes) {
        // Refresh cache in background (stale-while-revalidate for static files)
        fetch(request)
          .then(networkRes => {
            caches.open(CACHE_NAME).then(cache => cache.put(request, networkRes));
          })
          .catch(() => { /* offline — fine, cache is served */ });
        return cachedRes;
      }
      // Not in cache — fetch from network and cache for next time
      return fetch(request).then(networkRes => {
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return networkRes;
      });
    })
  );
});
