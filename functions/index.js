/**
 * Cloud Functions for Admin User Management
 * ──────────────────────────────────────────
 * Deploy to Firebase Cloud Functions (Node.js runtime).
 *
 * Initialize:
 *   firebase init functions
 *   cd functions && npm install
 *   firebase deploy --only functions
 *
 * These callable functions enforce that only admin-role callers
 * can mutate user records and Firebase Auth custom claims.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { sendIncidentNotifications } = require("./incidentNotifications");

initializeApp();

const VALID_ROLES = ["admin", "proctor", "head", "viewer"];
const ROLE_RANK = { admin: 3, proctor: 2, head: 1, viewer: 0 };

/* ── Input validation helpers ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function assertString(val, name, maxLen = 500) {
  if (typeof val !== "string" || val.length === 0 || val.length > maxLen) {
    throw new HttpsError("invalid-argument", `${name} must be a non-empty string (max ${maxLen} chars).`);
  }
}

/* ─── Helper: verify the caller is an admin ─── */
async function assertAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }
  const callerDoc = await getFirestore()
    .doc(`users/${request.auth.uid}`)
    .get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

/* ── Shared options for all callable functions ── */
const callOpts = { cors: true };

/* ─── Helper: generate a password that meets Firebase requirements ─── */
function generatePassword(length = 16) {
  const upper   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower   = "abcdefghijklmnopqrstuvwxyz";
  const digits  = "0123456789";
  const special = "!@#$%^&*_+-=";
  const all     = upper + lower + digits + special;

  // Guarantee at least one from each required category
  const required = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  const rest = Array.from({ length: length - required.length }, () =>
    all[crypto.randomInt(all.length)]
  );

  // Shuffle all characters together
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/* ─── createUserAccount ─── */
exports.createUserAccount = onCall(callOpts, async (request) => {
  await assertAdmin(request);

  const { name, email, initialCommittee, committees: initCommittees, password: clientPassword } = request.data;
  assertString(name, "name", 200);
  assertString(email, "email", 254);
  if (!EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "Invalid email format.");
  }

  // Use client-supplied password or generate one that meets all requirements
  const password = clientPassword || generatePassword(16);

  // 1. Create Firebase Auth user
  let userRecord;
  try {
    userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "An account with this email already exists.");
    }
    throw new HttpsError("internal", err.message);
  }

  // 2. Set custom claims (role: proctor)
  await getAuth().setCustomUserClaims(userRecord.uid, { role: "proctor" });

  // Build committees array — support both legacy single field and new array
  let committees = [];
  if (Array.isArray(initCommittees) && initCommittees.length > 0) {
    committees = initCommittees;
  } else if (initialCommittee) {
    committees = [{ committee: initialCommittee, day: "DAY1/2" }];
  }

  // 3. Create Firestore user doc
  await getFirestore().doc(`users/${userRecord.uid}`).set({
    uid: userRecord.uid,
    name,
    email,
    role: "proctor",
    committees,
    // Keep legacy field for backward compat
    committee: committees.length > 0 ? committees[0].committee : null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 4. Return the generated password (shown once to admin)
  return { uid: userRecord.uid, password };
});

/* ─── updateUserRoleAndCommittee ─── */
exports.updateUserRoleAndCommittee = onCall(callOpts, async (request) => {
  await assertAdmin(request);

  const { uid, role, committee, committees, active } = request.data;
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "uid and role are required.");
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  // Prevent role downgrade
  const targetDoc = await getFirestore().doc(`users/${uid}`).get();
  if (targetDoc.exists) {
    const currentRole = targetDoc.data().role || "proctor";
    if ((ROLE_RANK[role] ?? 0) < (ROLE_RANK[currentRole] ?? 0)) {
      throw new HttpsError("permission-denied", `Cannot downgrade user from ${currentRole} to ${role}.`);
    }
  }

  // 1. Update Firestore user doc
  const update = { role };
  // Support new committees array
  if (Array.isArray(committees)) {
    update.committees = committees;
    // Keep legacy field in sync (first committee name or null)
    update.committee = committees.length > 0 ? committees[0].committee : null;
  } else if (committee !== undefined) {
    // Legacy single committee field
    update.committee = committee || null;
    update.committees = committee ? [{ committee, day: "DAY1/2" }] : [];
  }
  if (typeof active === "boolean") update.active = active;
  update.updatedAt = FieldValue.serverTimestamp();
  await getFirestore().doc(`users/${uid}`).update(update);

  // 2. Update Auth custom claims
  await getAuth().setCustomUserClaims(uid, { role });

  // 3. If active status changed, enable/disable the Auth account
  if (typeof active === "boolean") {
    await getAuth().updateUser(uid, { disabled: !active });
  }

  return { success: true };
});

/* ─── setUserRole (legacy, kept for backward compat) ─── */
exports.setUserRole = onCall(callOpts, async (request) => {
  await assertAdmin(request);

  const { uid, role, committee } = request.data;
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "uid and role are required.");
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Invalid role: ${role}`);
  }

  // Prevent role downgrade
  const targetDoc = await getFirestore().doc(`users/${uid}`).get();
  if (targetDoc.exists) {
    const currentRole = targetDoc.data().role || "proctor";
    if ((ROLE_RANK[role] ?? 0) < (ROLE_RANK[currentRole] ?? 0)) {
      throw new HttpsError("permission-denied", `Cannot downgrade user from ${currentRole} to ${role}.`);
    }
  }

  const update = { role };
  if (committee !== undefined) {
    update.committee = committee;
    update.committees = committee ? [{ committee, day: "DAY1/2" }] : [];
  }
  await getFirestore().doc(`users/${uid}`).update(update);
  await getAuth().setCustomUserClaims(uid, { role });

  return { success: true };
});

/* ─── setUserActiveStatus ─── */
exports.setUserActiveStatus = onCall(callOpts, async (request) => {
  await assertAdmin(request);

  const { uid, active } = request.data;
  if (!uid || typeof active !== "boolean") {
    throw new HttpsError("invalid-argument", "uid and active (bool) are required.");
  }

  await getFirestore().doc(`users/${uid}`).update({ active });
  await getAuth().updateUser(uid, { disabled: !active });

  return { success: true };
});

/* ─── deleteUser ─── */
exports.deleteUser = onCall(callOpts, async (request) => {
  await assertAdmin(request);

  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required.");
  }

  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Cannot delete your own account.");
  }

  await getFirestore().doc(`users/${uid}`).delete();
  await getAuth().deleteUser(uid);

  return { success: true };
});

/* ═══════════════════════════════════════════════════════════════
 *  Incident Push Notifications — Firestore onCreate Trigger
 * ═══════════════════════════════════════════════════════════════
 *  Automatically fires when a new document is created in the
 *  `incidents` collection. Queries all users who opted in to
 *  incident push notifications and sends them an FCM message.
 * ─────────────────────────────────────────────────────────────── */
exports.onIncidentCreated = onDocumentCreated("incidents/{incidentId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("[onIncidentCreated] No data in event. Skipping.");
    return null;
  }

  const incident = snap.data();
  const incidentId = event.params.incidentId;

  console.log(`[onIncidentCreated] New incident: ${incidentId} — "${incident.title}" (${incident.severity})`);

  try {
    const result = await sendIncidentNotifications(incident, incidentId);
    console.log(`[onIncidentCreated] Notification result:`, JSON.stringify(result));
    return result;
  } catch (err) {
    console.error("[onIncidentCreated] Failed to send notifications:", err);
    return null;
  }
});
