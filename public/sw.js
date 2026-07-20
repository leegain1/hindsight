// HINDSIGHT+ Service Worker
// Strategy: Network-first for navigation, cache-first for static assets

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `hindsight-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `hindsight-runtime-${CACHE_VERSION}`;

// Static shell to precache
const PRECACHE_URLS = [
  '/',
  '/scan',
  '/community',
  '/categories',
  '/offline',
];

// ── Install ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Attempt to cache shell pages; ignore failures (pages may not prerender)
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: non-GET, cross-origin, Supabase/API calls
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  // Static assets (JS/CSS/fonts/images): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ?? fetch(request).then((res) => {
          if (res.ok) {
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        })
      )
    );
    return;
  }

  // Navigation (HTML pages): network-first, fall back to cache then /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then((cached) => cached ?? caches.match('/offline') ?? caches.match('/'))
        )
    );
  }
});
