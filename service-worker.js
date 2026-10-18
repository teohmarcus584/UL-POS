const CACHE_NAME = 'pos-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ============================================================
// FETCH HANDLER — SAFE VERSION
// Skips LAN/ESP32, Supabase, and non-GET requests
// ============================================================
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = req.url;

  // 1️⃣ Only handle GET requests — POST/PUT/DELETE go straight to network
  if (req.method !== 'GET') {
    return; // do not call event.respondWith() → browser handles it
  }

  // 2️⃣ Skip ESP32 printer + fingerprint sensor (private LAN IPs)
  if (
    url.includes('192.168.') ||
    url.includes('10.') ||
    url.includes('127.0.0.1') ||
    url.includes('localhost') ||
    url.includes('.local')
  ) {
    return; // browser handles it directly
  }

  // 3️⃣ Skip Supabase API calls (must always be fresh)
  if (url.includes('supabase.co')) {
    return;
  }

  // 4️⃣ Skip anything not HTTP(S) (chrome-extension://, blob:, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // 5️⃣ Cache-first for our own static assets
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(response => {
        // Only cache valid same-origin responses
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque' ||
          response.type === 'error'
        ) {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(req, copy);
        });
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});
