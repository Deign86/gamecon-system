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

import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import {
  onForegroundMessage,
  onCapacitorForegroundNotification,
  onNewIncidentFirestore,
  showNativeNotification,
  isTauri,
} from "../lib/messaging";

export default function ForegroundNotificationHandler() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const cleanupRef = useRef([]);

  useEffect(() => {
    if (!user) return;

    /* Respect the per-user toggle (default = enabled) */
    if (profile?.notificationsEnabled === false) return;

    const cleanups = [];

    /* 1 · Web FCM foreground messages */
    onForegroundMessage((payload) => {
      const title = payload?.notification?.title || "Incident Alert";
      const body = payload?.notification?.body || "A new incident has been reported.";
      toast(`${title}: ${body}`, "warning", 6000);
    }).then((unsub) => {
      if (typeof unsub === "function") cleanups.push(unsub);
    });

    /* 2 · Capacitor (Android) foreground push */
    onCapacitorForegroundNotification((payload) => {
      const title = payload?.notification?.title || "Incident Alert";
      const body = payload?.notification?.body || "A new incident has been reported.";
      toast(`${title}: ${body}`, "warning", 6000);
    }).then((unsub) => {
      if (typeof unsub === "function") cleanups.push(unsub);
    });

    /* 3 · Tauri desktop — Firestore listener + native Notification */
    if (isTauri()) {
      const unsub = onNewIncidentFirestore((incident) => {
        const title = `Incident: ${incident.title}`;
        const sev = (incident.severity || "unknown").toUpperCase();
        const body = `${sev} — Reported by ${incident.reporterName || "Unknown"}`;

        toast(`${title}`, "warning", 6000);
        showNativeNotification(title, body);
      });
      cleanups.push(unsub);
    }

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
  }, [user?.uid, profile?.notificationsEnabled]);

  return null;
}
