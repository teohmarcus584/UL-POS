const CACHE_NAME = 'pos-cache-v1';
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://i.imgur.com/HTHfWnm.jpeg',
  'https://i.imgur.com/STBkLrm.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return networkResponse;
        });
      })
      .catch(() => {
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head><title>Offline</title><meta charset="UTF-8"></head>
            <body style="font-family: sans-serif; text-align: center; padding: 2rem;">
              <h1>🔌 You are offline</h1>
              <p>Please check your internet connection and try again.</p>
              <button onclick="location.reload()">Retry</button>
            </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      })
  );
});