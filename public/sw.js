/* Service worker Merci Studio — mở nhanh như app, xem lại ảnh đã tải kể cả khi mạng yếu. */
const VERSION = 'merci-pwa-v2';
const STATIC = VERSION + '-static';
const PHOTOS = VERSION + '-photos';
const PAGES = VERSION + '-pages';
const PHOTO_LIMIT = 600;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add('/').catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone());
    if (limit) trim(cacheName, limit);
  }
  return res;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (fallbackUrl) {
      const fb = await cache.match(fallbackUrl);
      if (fb) return fb;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (url.pathname.startsWith('/photos/') && !url.pathname.endsWith('manifest.json')) {
    event.respondWith(cacheFirst(request, PHOTOS, PHOTO_LIMIT));
    return;
  }
  if (url.pathname.startsWith('/photos/manifest.json')) {
    event.respondWith(networkFirst(request, PAGES));
    return;
  }
  // Không cache /api/* — tránh lưu response API (dữ liệu có thể nhạy cảm) vào CacheStorage.
  if (url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES, '/'));
  }
});
