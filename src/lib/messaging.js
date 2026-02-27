/**
 * Client-side Firebase Cloud Messaging utilities.
 * ────────────────────────────────────────────────
 * Handles registration of the service worker, requesting notification
 * permission, and obtaining / revoking FCM tokens.
 */

import { getToken, deleteToken, onMessage } from "firebase/messaging";
import { getAppMessaging } from "../firebase";
import { warn, error as logError, info as logInfo } from "./logger";

/**
 * VAPID key for the Firebase project.
 * Generate this in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.
 * Store it as VITE_FIREBASE_VAPID_KEY in .env.
 */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

/**
 * Register the FCM service worker and request a push token.
 * Returns the FCM device token string, or null on failure / unsupported.
 */
export async function requestFCMToken() {
  try {
    const messaging = await getAppMessaging();
    if (!messaging) {
      warn("[FCM] Messaging not supported on this browser.");
      return null;
    }

    // Register the service worker and wait until it is active
    await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
    const swRegistration = await navigator.serviceWorker.ready;

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      warn("[FCM] Notification permission denied.");
      return null;
    }

    // Get the FCM token (uses the registered SW)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      warn("[FCM] Failed to obtain FCM token.");
      return null;
    }

    logInfo("[FCM] Token acquired.");
    return token;
  } catch (err) {    // 401 from fcmregistrations = the FCM Registration API isn't enabled in GCP
    if (
      err?.code === "messaging/token-subscribe-failed" ||
      err?.message?.includes("authentication credential")
    ) {
      console.error(
        "[FCM] Token subscribe failed — the FCM Registration API is likely not enabled.\n" +
        "Enable it at: https://console.cloud.google.com/apis/library/fcmregistrations.googleapis.com"
      );
      return { error: "fcm-api-disabled" };
    }    logError("[FCM] Error requesting token:", err);
    return null;
  }
}

/**
 * Delete the current device's FCM token (revoke push capability).
 */
export async function revokeFCMToken() {
  try {
    const messaging = await getAppMessaging();
    if (!messaging) return false;
    await deleteToken(messaging);
    logInfo("[FCM] Token revoked.");
    return true;
  } catch (err) {
    logError("[FCM] Error revoking token:", err);
    return false;
  }
}

/**
 * Listen for foreground push messages.
 * Returns an unsubscribe function.
 * @param {(payload: MessagePayload) => void} callback
 */
export async function onForegroundMessage(callback) {
  const messaging = await getAppMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
