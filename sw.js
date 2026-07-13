const CACHE_NAME = 'vp-cache-v1';
const ASSETS = [
  'video_poker.html',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseinstallations.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return; // Let Firebase handle its own network operations
  }
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        return response;
      });
    })
  );
});

// Push notification event listener (for local or mock push announcements)
self.addEventListener('push', event => {
  let data = { title: 'Video Poker', body: 'Claim your daily bonus now!' };
  try {
    data = event.data.json();
  } catch (e) {}

  const options = {
    body: data.body,
    icon: 'icon.svg',
    badge: 'icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
