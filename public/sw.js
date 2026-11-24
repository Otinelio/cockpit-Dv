// Service Worker pour Cockpit DV (PWA & Notifications Push)
const CACHE_NAME = 'cockpit-dv-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // En cas d'échec sur une ressource, continuer
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non GET et les appels API dynamiques
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Hors ligne', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// Écouteur des notifications Push Web / PWA
self.addEventListener('push', (event) => {
  let donnees = {
    titre: 'Cockpit DigitalVision',
    corps: 'Nouvelle activité enregistrée sur Cockpit.',
    url: '/',
    icone: '/icons/icon-192.png',
  };

  try {
    if (event.data) {
      donnees = Object.assign(donnees, event.data.json());
    }
  } catch {
    if (event.data) {
      donnees.corps = event.data.text();
    }
  }

  const options = {
    body: donnees.corps,
    icon: donnees.icone || '/icons/icon-192.png',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: donnees.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Ouvrir Cockpit' },
    ],
  };

  event.waitUntil(self.registration.showNotification(donnees.titre, options));
});

// Clic sur une notification push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlCible = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si une fenêtre est déjà ouverte, la mettre au premier plan et naviguer
      for (const client of clients) {
        if ('focus' in client) {
          if (client.url.includes(urlCible)) {
            return client.focus();
          }
          if ('navigate' in client) {
            client.navigate(urlCible);
            return client.focus();
          }
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlCible);
      }
    })
  );
});
