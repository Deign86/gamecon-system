/**
 * Admin API — client-side wrappers for admin user-management Cloud Functions.
 *
 * All privileged operations (create user, update roles/claims, delete)
 * route through Cloud Functions that verify the caller is an admin.
 */

import { httpsCallable } from "firebase/functions";
import { sendPasswordResetEmail as fbSendPasswordResetEmail } from "firebase/auth";
import { auth, functions } from "../firebase";

/* ── Create a new user account (admin only, defaults to proctor) ── */
export async function createUserAccount(name, email, initialCommittee, password) {
  const fn = httpsCallable(functions, "createUserAccount");
  const result = await fn({
    name,
    email,
    initialCommittee: initialCommittee || null,
    password: password || null,
  });
  return result.data; // { uid, password }
}

/* ── Update user role, committee, and/or active status ── */
export async function updateUserRoleAndCommittee(uid, updates) {
  const fn = httpsCallable(functions, "updateUserRoleAndCommittee");
  await fn({ uid, ...updates });
}

/* ── Set user role (+ optional committee) — legacy wrapper ── */
export async function setUserRole(uid, role, committee) {
  await updateUserRoleAndCommittee(uid, { role, committee });
}

/* ── Toggle active / disabled ── */
export async function setUserActiveStatus(uid, active) {
  const fn = httpsCallable(functions, "setUserActiveStatus");
  await fn({ uid, active: !!active });
}

/* ── Delete user account (Auth + Firestore via Cloud Function) ── */
export async function deleteUser(uid) {
  const fn = httpsCallable(functions, "deleteUser");
  await fn({ uid });
}

/* ── Send password-reset email (client-side, no Cloud Function needed) ── */
export async function sendPasswordReset(email) {
  if (!email) throw new Error("email is required");
  await fbSendPasswordResetEmail(auth, email);
}
