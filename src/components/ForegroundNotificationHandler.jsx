/**
 * ForegroundNotificationHandler
 * ─────────────────────────────
 * Renderless component that listens for incoming incident notifications
 * on ALL platforms and surfaces them as in-app toasts.
 *
 * • Web      → FCM `onMessage` (foreground)
 * • Android  → Capacitor `pushNotificationReceived`
 * • Desktop  → Firestore `onSnapshot` listener + native Notification
 *
 * Mount inside `<ToastProvider>` so `useToast()` is available.
 */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import { getDeviceNotifEnabled } from "./profile/IncidentNotificationToggle";
import {
  onCapacitorForegroundNotification,
  onNewIncidentFirestore,
  showNativeNotification,
  requestNotificationPermission,
  isTauri,
  isWeb,
} from "../lib/messaging";

export default function ForegroundNotificationHandler() {
  const { user } = useAuth();
  const toast = useToast();
  const cleanupRef = useRef([]);
  const recentlyToasted = useRef(new Set()); // dedup FCM + Firestore firing for same incident

  /* Read per-device notification preference from localStorage.
   * Re-check every time the component re-renders via a storage listener
   * so toggling the switch takes immediate effect. */
  const [deviceNotifEnabled, setDeviceNotifEnabled] = useState(() => {
    if (!user) return false;
    const stored = getDeviceNotifEnabled(user.uid);
    if (stored !== null) return stored;
    // Default: true if permission already granted
    return "Notification" in window && Notification.permission === "granted";
  });

  /* Listen for localStorage changes (same tab + cross-tab) */
  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      const stored = getDeviceNotifEnabled(user.uid);
      if (stored !== null) setDeviceNotifEnabled(stored);
    };
    // Cross-tab
    window.addEventListener("storage", refresh);
    // Same-tab: poll briefly since storage events don't fire in same tab
    const iv = setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("storage", refresh);
      clearInterval(iv);
    };
  }, [user?.uid]);

  /** Show a toast only if we haven't already shown one for this key recently */
  function deduplicatedToast(key, message, type = "warning", duration = 6000) {
    if (recentlyToasted.current.has(key)) return;
    recentlyToasted.current.add(key);
    setTimeout(() => recentlyToasted.current.delete(key), 10000);
    toast(message, type, duration);
  }

  /* ── Auto-register FCM token on load if permission already granted ── */
  useEffect(() => {
    if (!user) return;
    if (!deviceNotifEnabled) return;

    // If browser permission is already granted, silently register the token
    if (isWeb() && "Notification" in window && Notification.permission === "granted") {
      requestNotificationPermission(user.uid).catch(() => {});
    }
  }, [user?.uid, deviceNotifEnabled]);

  /* ── Notification listeners ── */
  useEffect(() => {
    if (!user) return;

    /* Respect the per-device toggle */
    if (!deviceNotifEnabled) return;

    const cleanups = [];

    /* 1 · Web push messages from the Firebase messaging service worker.
     *     Listens directly on navigator.serviceWorker for messages forwarded
     *     by the compat SDK's push handler (isFirebaseMessaging === true).
     *     This is more reliable than Firebase SDK's onMessage() which can
     *     miss messages due to module-level listener registration timing. */
    if (isWeb() && "serviceWorker" in navigator) {
      const swMessageHandler = (event) => {
        const msg = event.data;
        if (!msg?.isFirebaseMessaging || msg?.messageType !== "push-received") return;

        const incId = msg?.data?.incidentId || "fcm-" + Date.now();
        const title = msg?.notification?.title || "Incident Alert";
        const body = msg?.notification?.body || "A new incident has been reported.";
        deduplicatedToast(incId, `${title}: ${body}`);
      };
      navigator.serviceWorker.addEventListener("message", swMessageHandler);
      cleanups.push(() => navigator.serviceWorker.removeEventListener("message", swMessageHandler));
    }

    /* 2 · Capacitor (Android) foreground push */
    onCapacitorForegroundNotification((payload) => {
      const incId = payload?.data?.incidentId || "cap-" + Date.now();
      const title = payload?.notification?.title || "Incident Alert";
      const body = payload?.notification?.body || "A new incident has been reported.";
      deduplicatedToast(incId, `${title}: ${body}`);
    }).then((unsub) => {
      if (typeof unsub === "function") cleanups.push(unsub);
    });

    /* 3 · Firestore listener — universal fallback for ALL platforms.
     *     Works even when FCM tokens are missing or push is blocked.
     *     On Tauri, also fires a native OS notification. */
    const firestoreUnsub = onNewIncidentFirestore((incident) => {
      // Don't notify the reporter about their own incident
      if (incident.reportedBy === user.uid) return;

      const incId = incident.id || "fs-" + Date.now();
      const title = `Incident: ${incident.title || "New Incident"}`;
      const sev = (incident.severity || "unknown").toUpperCase();
      const body = `${sev} — Reported by ${incident.reporterName || "Unknown"}`;

      deduplicatedToast(incId, `${title}: ${body}`);

      // Also fire a native notification on Tauri or if browser permission is granted
      if (isTauri() || (isWeb() && Notification.permission === "granted")) {
        showNativeNotification(title, body);
      }
    });
    cleanups.push(firestoreUnsub);

    cleanupRef.current = cleanups;

    return () => {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          /* swallow */
        }
      });
    };
  }, [user?.uid, deviceNotifEnabled]);

  return null;
}
