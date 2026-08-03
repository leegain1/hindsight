// HINDSIGHT+ Service Worker
// Strategy: Network-first for navigation, cache-first for static assets

// v1 캐시에는 dev 서버에서 받은 HTML 이 섞여 들어갔을 수 있다(해시가 달라진
// 청크를 참조하는 죽은 문서). 버전을 올려 activate 때 통째로 버린다.
const CACHE_VERSION = 'v2';
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
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation (HTML pages): network-first, fall back to cache then /offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const res = await fetch(request);
  // clone() 은 응답을 넘겨주기 전에 동기적으로 떠야 한다. caches.open() 이
  // 끝난 뒤에 뜨면 그 사이 브라우저가 본문을 다 읽어버려 클론이 실패한다.
  if (res.ok) {
    const copy = res.clone();
    void caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
  }
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      void caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
    }
    return res;
  } catch {
    // 폴백은 순서대로 하나씩 확인한다. 예전 코드는 `cached ?? caches.match(...)`
    // 로 이어붙였는데, Promise 는 항상 truthy 라 뒤쪽 폴백이 죽은 코드였고
    // /offline 이 캐시에 없으면 respondWith(undefined) 로 터졌다.
    const cached = await caches.match(request);
    if (cached) return cached;

    const offline = await caches.match('/offline');
    if (offline) return offline;

    const shell = await caches.match('/');
    if (shell) return shell;

    return new Response('오프라인 상태입니다. 연결을 확인한 후 다시 시도해주세요.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
