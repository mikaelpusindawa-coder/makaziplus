const CACHE_NAME = 'makaziplus-v1';
const urlsToCache = ['/', '/index.html', '/offline.html', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ success: false, message: 'Huna mtandao' }), { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request).catch(() => caches.match('/offline.html'))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});