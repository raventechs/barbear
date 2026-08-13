// sw-barbear.js — Service Worker BarbeAR v1.1
const CACHE_NAME = 'barbear-v1.1';
const SHELL = [
  '/',
  '/index.html',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com')) {
    return;
  }

  // Navegación (el HTML principal) — SIEMPRE ir a buscar lo último primero.
  // Solo usar el cache si no hay internet. Así una actualización nueva
  // se ve enseguida, sin quedar pegado a una versión vieja para siempre.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(response => {
        const clon = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clon));
        return response;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Resto de archivos (JS, CSS, imágenes) — cache primero, más rápido
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 &&
            (url.origin === self.location.origin ||
             url.hostname.includes('googleapis.com') ||
             url.hostname.includes('gstatic.com'))) {
          const clon = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clon));
        }
        return response;
      }).catch(() => {});
    })
  );
});
