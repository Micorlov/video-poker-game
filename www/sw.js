// Firebase messaging SW must be imported for background push handling
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const CACHE_NAME = 'vp-cache-v7';
const ASSETS = [
  'video_poker.html',
  'manifest.json',
  'icon.svg'
];

firebase.initializeApp({
  apiKey: "AIzaSyB6m0Yis89jxvm06OFBqxs8P_vADjRXk0U",
  authDomain: "video-poker-6d665.firebaseapp.com",
  projectId: "video-poker-6d665",
  storageBucket: "video-poker-6d665.firebasestorage.app",
  messagingSenderId: "53702406091",
  appId: "1:53702406091:web:1ef4969a8cc77ebd6a504e"
});

const messaging = firebase.messaging();

// Background push notifications via FCM.
// scripts/lib/sendPush.js sends a `notification` payload (title/body), which
// FCM delivers on payload.notification — reading only payload.data made every
// web push fall back to the generic copy below and drop the friend's name.
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = notification.title || data.title || 'Video Poker';
  const options = {
    body: notification.body || data.body || 'You have a new notification!',
    icon: 'icon.svg',
    badge: 'icon.svg',
    vibrate: [100, 50, 100],
    tag: data.tag || 'vp-notification',
    data: { url: data.url || 'video_poker.html' }
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseinstallations.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('fcmregistrations.googleapis.com') ||
    event.request.url.includes('fcm.googleapis.com')
  ) {
    return;
  }
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('video_poker.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Notification click — open/focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || 'video_poker.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('video_poker') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// Legacy push fallback (non-FCM push)
self.addEventListener('push', event => {
  let data = { title: 'Video Poker', body: 'Claim your daily bonus now!' };
  try { data = event.data.json(); } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icon.svg',
      badge: 'icon.svg',
      vibrate: [100, 50, 100]
    })
  );
});
