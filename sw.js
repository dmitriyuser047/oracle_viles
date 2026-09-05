var CACHE = 'veles-v9';
var ASSETS = [
  '/',
  '/index.html',
  '/assets/css/base.css',
  '/assets/css/components.css',
  '/assets/css/theme-midnight.css',
  '/assets/js/00-auth.js',
  '/assets/js/01-state-storage.js',
  '/assets/js/02-esoteric-core.js',
  '/assets/js/03-profile-bonds.js',
  '/assets/js/04-oracle-symbols.js',
  '/assets/js/05-profile-render.js',
  '/assets/js/06-chat-oracle.js',
  '/assets/js/07-diary-share-nav.js',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS.map(function(url) {
        return new Request(url, { cache: 'no-cache' });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(function(resp) {
      if (resp.ok) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
