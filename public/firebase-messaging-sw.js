/* ═══════════════════════════════════════════════════════════════
 *  Firebase Cloud Messaging Service Worker
 *  ─────────────────────────────────────────
 *  Handles background push notifications when the app is not in
 *  the foreground. Clicking a notification routes the user to the
 *  incidents tab (or a specific incident).
 * ═══════════════════════════════════════════════════════════════ */

/* eslint-disable no-restricted-globals */
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js");

/**
 * Firebase config is injected at runtime via the VAPID key handshake.
 * The compat SDK requires an explicit init here because service workers
 * can't access import.meta.env.
 *
 * ⚠️  Replace these placeholder values with your real Firebase config
 *     OR use a build step to inject them.
 */
firebase.initializeApp({
  apiKey:            "AIzaSyCfCyaOceUawkDXeaI0QD8Xz5-wtmWvCBs",
  authDomain:        "gamecon-2026-ops.firebaseapp.com",
  projectId:         "gamecon-2026-ops",
  storageBucket:     "gamecon-2026-ops.firebasestorage.app",
  messagingSenderId: "834830321959",
  appId:             "1:834830321959:web:06ab7a5b6ee7cc70060102",
});

const messaging = firebase.messaging();

/* ── Background message handler ── */
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  const notificationTitle = title || "New Incident Reported";
  const notificationOptions = {
    body: body || "A new incident requires attention.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: `incident-${data.incidentId || "general"}`,
    data: {
      incidentId: data.incidentId,
      zoneId: data.zoneId,
      severity: data.severity,
      url: data.url || "/",
    },
    actions: [
      { action: "view", title: "View Incident" },
      { action: "dismiss", title: "Dismiss" },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/* ── Notification click handler ── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  // Navigate to the app — the main shell will handle routing
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});
