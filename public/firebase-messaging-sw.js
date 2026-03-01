/**
 * Firebase Cloud Messaging — Service Worker
 * ───────────────────────────────────────────
 * Handles background push notifications for the web app.
 * Registered by src/lib/messaging.js when the user enables notifications.
 */

/* eslint-env serviceworker */
/* global firebase */

/**
 * Firebase SDK version for this service worker.
 * Keep in sync with the `firebase` dependency in package.json (currently ^10.14.0).
 * Service workers cannot use ES modules, so we load the compat SDK via CDN.
 */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

/**
 * Firebase config is injected here.
 * For local development, copy these values from your .env file.
 *
 * IMPORTANT: If you change your .env, update these values to match.
 */
firebase.initializeApp({
  apiKey: "AIzaSyCfCyaOceUawkDXeaI0QD8Xz5-wtmWvCBs",
  authDomain: "gamecon-2026-ops.firebaseapp.com",
  projectId: "gamecon-2026-ops",
  storageBucket: "gamecon-2026-ops.firebasestorage.app",
  messagingSenderId: "834830321959",
  appId: "1:834830321959:web:06ab7a5b6ee7cc70060102",
});

const messaging = firebase.messaging();

/* ── Background message handler ── */
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};

  const notificationTitle = title || "PlayVerse Ops — Incident Alert";
  const notificationOptions = {
    body: body || "A new incident has been reported.",
    icon: icon || "/logo.png",
    badge: "/logo.png",
    tag: "incident-notification",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/* ── Notification click handler ── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow("/");
      })
  );
});
