/**
 * Incident Notifications — Server-Side Helper Module
 * ───────────────────────────────────────────────────
 * Used by the Cloud Function `onIncidentCreated` trigger.
 * Queries opted-in users, collects FCM tokens, and dispatches
 * push notifications via Firebase Admin Messaging.
 *
 * This module is designed to run in the Cloud Functions (Node.js)
 * environment and uses the Firebase Admin SDK.
 */

const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

/**
 * Fetch all FCM tokens from users who have opted in to incident push notifications.
 * @returns {Promise<string[]>} Array of FCM device tokens
 */
async function getOptedInTokens() {
  const db = getFirestore();
  const snapshot = await db
    .collection("users")
    .where("notifications.incidentPushEnabled", "==", true)
    .get();

  const tokens = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const fcmTokens = data?.notifications?.fcmTokens;
    if (Array.isArray(fcmTokens)) {
      tokens.push(...fcmTokens.filter((t) => typeof t === "string" && t.length > 0));
    }
  });

  return [...new Set(tokens)]; // dedupe
}

/**
 * Send push notifications to all opted-in users about a new incident.
 *
 * @param {object} incident - The incident document data
 * @param {string} incident.title
 * @param {string} incident.severity
 * @param {string} incident.zoneId
 * @param {string} incidentId - The Firestore document ID
 * @returns {Promise<{ successCount: number, failureCount: number, staleTokens: string[] }>}
 */
async function sendIncidentNotifications(incident, incidentId) {
  const tokens = await getOptedInTokens();

  if (tokens.length === 0) {
    console.log("[IncidentNotif] No opted-in devices found. Skipping push.");
    return { successCount: 0, failureCount: 0, staleTokens: [] };
  }

  const severityLabel = (incident.severity || "unknown").toUpperCase();
  const zone = incident.zoneId || "Unknown Zone";
  const title = incident.title || "Untitled Incident";

  const message = {
    notification: {
      title: "New Incident Reported",
      body: `[${severityLabel}] in ${zone}: ${title}`,
    },
    data: {
      incidentId: incidentId || "",
      zoneId: zone,
      severity: incident.severity || "low",
      url: "/",
    },
    webpush: {
      fcmOptions: {
        link: "/",
      },
      notification: {
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: `incident-${incidentId}`,
        requireInteraction: "true",
        vibrate: [200, 100, 200],
      },
    },
  };

  console.log(`[IncidentNotif] Sending to ${tokens.length} device(s)…`);

  // Use sendEachForMulticast for batched delivery with per-token results
  const response = await getMessaging().sendEachForMulticast({
    ...message,
    tokens,
  });

  // Collect stale / invalid tokens for cleanup
  const staleTokens = [];
  response.responses.forEach((resp, idx) => {
    if (
      resp.error &&
      (resp.error.code === "messaging/registration-token-not-registered" ||
        resp.error.code === "messaging/invalid-registration-token")
    ) {
      staleTokens.push(tokens[idx]);
    }
  });

  // Clean up stale tokens from user docs
  if (staleTokens.length > 0) {
    await cleanupStaleTokens(staleTokens);
  }

  console.log(
    `[IncidentNotif] Sent: ${response.successCount} success, ${response.failureCount} failures, ${staleTokens.length} stale tokens cleaned.`
  );

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    staleTokens,
  };
}

/**
 * Remove invalid FCM tokens from all user documents that contain them.
 * @param {string[]} staleTokens
 */
async function cleanupStaleTokens(staleTokens) {
  const db = getFirestore();
  const { FieldValue } = require("firebase-admin/firestore");

  // Query each stale token and remove it
  for (const token of staleTokens) {
    try {
      const snapshot = await db
        .collection("users")
        .where("notifications.fcmTokens", "array-contains", token)
        .get();

      const batch = db.batch();
      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          "notifications.fcmTokens": FieldValue.arrayRemove(token),
        });
      });

      await batch.commit();
    } catch (err) {
      console.error(`[IncidentNotif] Failed to clean stale token ${token.slice(0, 8)}…:`, err.message);
    }
  }
}

module.exports = {
  getOptedInTokens,
  sendIncidentNotifications,
  cleanupStaleTokens,
};
