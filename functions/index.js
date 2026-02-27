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
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { getShiftLimits } = require("./shiftLimitsConfig");

initializeApp();

const VALID_ROLES = ["admin", "proctor", "head", "committee-head", "viewer"];
const ROLE_RANK = { admin: 3, proctor: 2, head: 1, "committee-head": 1, viewer: 0 };

/* ── Committee name normalisation ──
 * Maps every known variant (slug IDs, short names, header variants)
 * to the canonical COMMITTEE_MAP key from roleConfig.js.
 */
const CANONICAL_COMMITTEES = [
  "Proctors", "Marketing", "Creatives", "Awards & Prizes",
  "Documentation/Photographers", "Exhibitors", "Venue Designer & Management",
  "Ticketing", "Voting", "Guest Relations Officers", "Technical Committee",
  "E-Sport Organizers", "Esports Technical", "Shoutcaster",
];

const COMMITTEE_VARIANT_MAP = {
  // slug IDs
  "proctors":           "Proctors",
  "marketing":          "Marketing",
  "creatives":          "Creatives",
  "awards-prizes":      "Awards & Prizes",
  "documentation":      "Documentation/Photographers",
  "exhibitors":         "Exhibitors",
  "venue-design":       "Venue Designer & Management",
  "ticketing":          "Ticketing",
  "voting":             "Voting",
  "guest-relations":    "Guest Relations Officers",
  "technical":          "Technical Committee",
  "esports":            "E-Sport Organizers",
  "esports-technical":  "Esports Technical",
  "shoutcaster":        "Shoutcaster",
  // short display names (from seed data)
  "venue design":            "Venue Designer & Management",
  "guest relations":         "Guest Relations Officers",
  // header / spreadsheet variants
  "venue design & management":      "Venue Designer & Management",
  "venue design and management":     "Venue Designer & Management",
  "venue designer and management":   "Venue Designer & Management",
  "venue designer & management":     "Venue Designer & Management",
  "documentation/ photographers":    "Documentation/Photographers",
  "documentation / photographers":   "Documentation/Photographers",
  "documentation/photographers":     "Documentation/Photographers",
  "e-sport organizers":              "E-Sport Organizers",
  "e-sports organizers":             "E-Sport Organizers",
  "technical committee":             "Technical Committee",
  "esports technical":               "Esports Technical",
  "e-sport game technicals":         "Esports Technical",
};

// Also add canonical names mapping to themselves (lowercase)
for (const c of CANONICAL_COMMITTEES) {
  COMMITTEE_VARIANT_MAP[c.toLowerCase()] = c;
}

function normalizeCommitteeName(raw) {
  if (!raw || typeof raw !== "string") return raw;
  const key = raw.trim().toLowerCase();
  return COMMITTEE_VARIANT_MAP[key] || raw.trim();
}

function normalizeCommittees(arr) {
  if (!Array.isArray(arr)) return arr;
  const seen = new Set();
  const result = [];
  for (const entry of arr) {
    const canonical = normalizeCommitteeName(entry.committee);
    const k = `${canonical}::${entry.day}`;
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ committee: canonical, day: entry.day });
    }
  }
  return result;
}

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
    committees = normalizeCommittees(initCommittees);
  } else if (initialCommittee) {
    committees = [{ committee: normalizeCommitteeName(initialCommittee), day: "DAY1/2" }];
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
  // Support new committees array — normalise names to canonical form
  if (Array.isArray(committees)) {
    update.committees = normalizeCommittees(committees);
    // Keep legacy field in sync (first committee name or null)
    update.committee = update.committees.length > 0 ? update.committees[0].committee : null;
  } else if (committee !== undefined) {
    // Legacy single committee field
    const normComm = committee ? normalizeCommitteeName(committee) : null;
    update.committee = normComm;
    update.committees = normComm ? [{ committee: normComm, day: "DAY1/2" }] : [];
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
    const normComm = committee ? normalizeCommitteeName(committee) : null;
    update.committee = normComm;
    update.committees = normComm ? [{ committee: normComm, day: "DAY1/2" }] : [];
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

  await getFirestore().doc(`users/${uid}`).update({
    active,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await getAuth().updateUser(uid, { disabled: !active });

  return { success: true };
});

/* ─── resetSystemData ─── */
exports.resetSystemData = onCall(callOpts, async (request) => {
  await assertAdmin(request);

  const db = getFirestore();
  const COLLECTIONS_TO_CLEAR = [
    "headcounts",
    "contributions",
    "expenses",
    "shifts",
    "committeeShifts",
    "incidents",
    "roleAssignments",
    "committeeSchedules",
  ];

  let total = 0;

  // 1. Delete event-data collections
  for (const colName of COLLECTIONS_TO_CLEAR) {
    const snap = await db.collection(colName).get();
    const refs = snap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += 500) {
      const batch = db.batch();
      refs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    total += refs.length;
  }

  // 2. Reset per-zone live headcounts to 0
  const zonesSnap = await db.collection("zones").get();
  for (let i = 0; i < zonesSnap.docs.length; i += 500) {
    const batch = db.batch();
    zonesSnap.docs.slice(i, i + 500).forEach((d) => {
      batch.update(d.ref, { currentCount: 0, lastUpdated: FieldValue.serverTimestamp() });
    });
    await batch.commit();
  }
  total += zonesSnap.docs.length;

  // 3. Reset standalone headcount counter
  await db.doc("counters/headcount").set(
    { count: 0, lastUpdated: FieldValue.serverTimestamp() },
    { merge: true }
  );

  // 4. Write audit log
  await db.collection("auditLogs").add({
    action: "system_reset",
    performedBy: request.auth.uid,
    totalDocsDeleted: total,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { total };
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

/* ─────────────────────────────────────────────────────
 *  validateCommitteeShiftLimits
 *  Firestore trigger: committeeShifts/{docId}
 *
 *  Runs on every write to a committeeShifts document.
 *  If the number of assignees exceeds the configured
 *  maxAllowed for that committee, the write is rolled
 *  back to the previous state (or deleted if new).
 * ───────────────────────────────────────────────────── */
exports.validateCommitteeShiftLimits = onDocumentWritten(
  "committeeShifts/{docId}",
  async (event) => {
    const after = event.data?.after;
    // Document was deleted — nothing to validate
    if (!after || !after.exists) return;

    const data = after.data();
    const committeeId = data.committeeId;
    const assignees = data.assignees || [];

    // Resolve configured limit (day-block aware)
    const dayBlock = data.dayBlock;
    const limits = getShiftLimits(committeeId, dayBlock);

    // If no limits configured for this committee, skip
    if (!limits) return;

    const maxAllowed = data.maxAllowed ?? limits.max;

    if (assignees.length > maxAllowed) {
      const before = event.data?.before;

      if (before && before.exists) {
        // Roll back to previous state
        const prevData = before.data();
        console.warn(
          `[ShiftLimits] Reverting ${event.params.docId}: ` +
          `${assignees.length} assignees exceeds max ${maxAllowed}. ` +
          `Rolling back to ${(prevData.assignees || []).length} assignees.`
        );
        await after.ref.set(prevData);
      } else {
        // New document that already violates — trim assignees to maxAllowed
        console.warn(
          `[ShiftLimits] New doc ${event.params.docId} created with ` +
          `${assignees.length} assignees, trimming to max ${maxAllowed}.`
        );
        await after.ref.update({
          assignees: assignees.slice(0, maxAllowed),
        });
      }
    }

    // Ensure minRequired and maxAllowed fields are always present (use day-block-aware limits)
    const updates = {};
    if (data.minRequired == null) updates.minRequired = limits.min;
    if (data.maxAllowed == null) updates.maxAllowed = limits.max;
    if (Object.keys(updates).length > 0) {
      await after.ref.update(updates);
    }
  }
);

