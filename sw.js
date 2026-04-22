// Service Worker sans cache — toutes les requêtes passent par le réseau

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  // Supprimer tous les anciens caches au passage
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});

