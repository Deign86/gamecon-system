/**
 * Firebase Cloud Messaging — Unified Notification Module
 * ───────────────────────────────────────────────────────
 * Cross-platform push notification support:
 *   • Web      — FCM via firebase/messaging + service worker
 *   • Android  — FCM via @capacitor/push-notifications
 *   • Desktop  — Firestore listener + Web Notification API (Tauri)
 *
 * FCM tokens are stored in the `fcmTokens` Firestore collection
 * so the Cloud Function `onNewIncident` can fan-out notifications.
 */

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import app from "../firebase";

/* ── Platform helpers ── */
export const isCapacitor = () =>
  typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
export const isTauri = () =>
  typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;
export const isWeb = () => !isCapacitor() && !isTauri();

/* VAPID key — required for web push. Set in .env as VITE_FIREBASE_VAPID_KEY */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || null;

/* Guard against concurrent/duplicate registration (React StrictMode) */
let _registrationInProgress = null;

/* ────────────────────────────────────────────
 *  Public API
 * ──────────────────────────────────────────── */

/**
 * Request notification permission and register the FCM token.
 * Detects the current platform and delegates accordingly.
 * @returns {Promise<string|null>} FCM token or null
 */
export async function requestNotificationPermission(userId) {
  if (!userId) return null;

  // Prevent concurrent duplicate registration (React StrictMode double-mount)
  if (_registrationInProgress) return _registrationInProgress;

  _registrationInProgress = (async () => {
    try {
      if (isCapacitor()) return await registerCapacitorPush(userId);
      if (isTauri()) return await registerTauriNotifications(userId);
      return await registerWebPush(userId);
    } catch (err) {
      console.warn("[Messaging] Failed to register notifications:", err);
      return null;
    } finally {
      _registrationInProgress = null;
    }
  })();

  return _registrationInProgress;
}

/**
 * Save an FCM token to Firestore.
 */
export async function saveFcmToken(userId, token, platform = "web") {
  if (!token || !userId) return;

  // Build a safe document ID from the token
  const tokenDocId =
    token.length > 1000
      ? btoa(token).slice(0, 100)
      : token.replace(/[/\\]/g, "_").slice(0, 500);

  await setDoc(
    doc(db, "fcmTokens", tokenDocId),
    {
      token,
      userId,
      platform,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Remove a single FCM token from Firestore.
 */
export async function removeFcmToken(token) {
  if (!token) return;
  const tokenDocId =
    token.length > 1000
      ? btoa(token).slice(0, 100)
      : token.replace(/[/\\]/g, "_").slice(0, 500);

  try {
    await deleteDoc(doc(db, "fcmTokens", tokenDocId));
  } catch (err) {
    console.warn("[Messaging] Failed to remove token:", err);
  }
}

/**
 * Remove ALL tokens for a user (call on sign-out or disable).
 */
export async function removeAllUserTokens(userId) {
  if (!userId) return;
  try {
    const q = query(
      collection(db, "fcmTokens"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn("[Messaging] Failed to remove user tokens:", err);
  }
}

/**
 * Listen for foreground FCM messages (web only).
 * @returns {Promise<Function>} unsubscribe callback
 */
export async function onForegroundMessage(callback) {
  if (!isWeb() || !VAPID_KEY) return () => {};

  try {
    const { getMessaging, onMessage } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch (err) {
    console.warn("[Messaging] Foreground listener failed:", err);
    return () => {};
  }
}

/**
 * Listen for foreground push notifications (Capacitor/Android).
 * @returns {Promise<Function>} unsubscribe callback
 */
export async function onCapacitorForegroundNotification(callback) {
  if (!isCapacitor()) return () => {};

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const listener = await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        callback({
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data,
        });
      }
    );
    return () => listener.remove();
  } catch (err) {
    console.warn("[Messaging] Capacitor foreground listener failed:", err);
    return () => {};
  }
}

/**
 * Firestore-based incident listener.
 * Primary channel for Tauri; works as a universal fallback for any platform.
 * Fires `callback(incident)` only for *newly created* docs.
 * @returns {Function} unsubscribe
 */
export function onNewIncidentFirestore(callback) {
  const q = query(
    collection(db, "incidents"),
    orderBy("timestamp", "desc"),
    limit(1)
  );

  let isFirstSnapshot = true;

  return onSnapshot(q, (snapshot) => {
    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      return; // Skip existing data
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        callback({ id: change.doc.id, ...change.doc.data() });
      }
    });
  });
}

/**
 * Show a native OS notification via the Web Notification API.
 * Works on web browsers and Tauri desktop.
 */
export function showNativeNotification(title, body, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;

  try {
    new Notification(title, {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: "incident-notification",
      ...options,
    });
  } catch (err) {
    console.warn("[Messaging] Native notification failed:", err);
  }
}

/* ────────────────────────────────────────────
 *  Platform-specific registration (private)
 * ──────────────────────────────────────────── */

/** Web — register FCM via firebase/messaging + service worker */
async function registerWebPush(userId) {
  if (!("Notification" in window)) {
    console.warn("[Messaging] Notifications not supported in this browser");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("[Messaging] Notification permission denied");
    return null;
  }

  if (!VAPID_KEY) {
    console.warn(
      "[Messaging] VAPID key not configured — set VITE_FIREBASE_VAPID_KEY in .env"
    );
    return null;
  }

  const { getMessaging, getToken } = await import("firebase/messaging");
  const messaging = getMessaging(app);

  // Register (or reuse) the Firebase messaging service worker.
  const swRegistration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/" }
  );

  // Wait for the service worker to be active (handles installing/waiting states)
  await new Promise((resolve) => {
    if (swRegistration.active) {
      resolve();
    } else {
      const sw = swRegistration.installing || swRegistration.waiting;
      if (sw) {
        sw.addEventListener("statechange", function handler(e) {
          if (e.target.state === "activated") {
            sw.removeEventListener("statechange", handler);
            resolve();
          }
        });
      } else {
        resolve();
      }
    }
  });

  // If the current push subscription used a different VAPID key (e.g. leftover
  // from experimenting with a custom key), clear it so getToken() can recreate.
  // We use the default Firebase VAPID key (no vapidKey param to getToken).
  try {
    const DEFAULT_VAPID_B64 =
      "BDOU99+h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv+4/l2LxQcYwhqby2xGpWwzjfAnG4=";
    const existingSub = await swRegistration.pushManager.getSubscription();
    if (existingSub) {
      const currentKey = existingSub.options.applicationServerKey;
      if (currentKey) {
        const keyBytes = new Uint8Array(currentKey);
        const defaultBinary = atob(DEFAULT_VAPID_B64);
        const defaultBytes = new Uint8Array([...defaultBinary].map((c) => c.charCodeAt(0)));
        const keysMatch =
          keyBytes.length === defaultBytes.length &&
          keyBytes.every((b, i) => b === defaultBytes[i]);
        if (!keysMatch) {
          await existingSub.unsubscribe();
          console.log("[Messaging] Cleared stale push subscription (VAPID key mismatch)");
        }
      }
    }
  } catch (subErr) {
    console.warn("[Messaging] Could not check push subscription:", subErr);
  }

  const token = await getToken(messaging, {
    serviceWorkerRegistration: swRegistration,
  });

  if (token) {
    // Clean up any previous tokens for this user (prevents stale accumulation)
    await removeAllUserTokens(userId);
    await saveFcmToken(userId, token, "web");
    console.log("[Messaging] FCM token registered successfully");
  }

  return token;
}

/** Android — register via @capacitor/push-notifications */
async function registerCapacitorPush(userId) {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let permResult = await PushNotifications.checkPermissions();
    if (permResult.receive === "prompt") {
      permResult = await PushNotifications.requestPermissions();
    }
    if (permResult.receive !== "granted") {
      console.warn("[Messaging] Push permission denied on Android");
      return null;
    }

    return new Promise((resolve) => {
      PushNotifications.addListener("registration", async (reg) => {
        await saveFcmToken(userId, reg.value, "android");
        resolve(reg.value);
      });
      PushNotifications.addListener("registrationError", (err) => {
        console.error("[Messaging] Capacitor registration error:", err);
        resolve(null);
      });
      PushNotifications.register();
    });
  } catch (err) {
    console.warn("[Messaging] Capacitor push unavailable:", err);
    return null;
  }
}

/** Desktop (Tauri) — use Web Notification API; no FCM token needed */
async function registerTauriNotifications(userId) {
  if (!("Notification" in window)) {
    console.warn("[Messaging] Web Notification API not available in Tauri");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("[Messaging] Notification permission denied");
    return null;
  }

  // Store a marker so the UI knows notifications are active
  const marker = `tauri-${userId}-${Date.now()}`;
  await saveFcmToken(userId, marker, "desktop");
  return marker;
}
