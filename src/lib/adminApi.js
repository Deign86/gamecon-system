/**
 * Admin API — client-side wrappers for admin user-management Cloud Functions.
 *
 * All privileged operations (create user, update roles/claims, delete)
 * route through Cloud Functions that verify the caller is an admin.
 *
 * Offline-aware: if a call fails due to network issues, queuable
 * operations are saved to IndexedDB and replayed when connectivity is
 * restored. Non-queuable ops (createUserAccount, deleteUser) throw
 * immediately because they return server-generated data the caller needs.
 */

import { httpsCallable } from "firebase/functions";
import { sendPasswordResetEmail as fbSendPasswordResetEmail } from "firebase/auth";
import { auth, functions } from "../firebase";
import { enqueue } from "./offlineQueue";

/**
 * Helper — detect a network / connectivity error from a Firebase callable.
 * Firebase wraps these as FirebaseError with code "functions/unavailable",
 * "functions/deadline-exceeded", or browser TypeError for fetch failures.
 *
 * Note: navigator.onLine is unreliable in Capacitor/Tauri WebViews,
 * so we also check the error code / type regardless of that flag.
 */
function isNetworkError(err) {
  const code = err?.code || "";
  if (
    code === "functions/unavailable" ||
    code === "functions/deadline-exceeded" ||
    code === "functions/cancelled"
  ) return true;
  // Fetch / XMLHttpRequest network failure
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return true;
  // Explicit offline
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return false;
}

/* ── Create a new user account (admin only, defaults to proctor) ── */
/* NOT queuable — caller needs the returned { uid, password } immediately. */
export async function createUserAccount(name, email, initialCommittee, password) {
  const fn = httpsCallable(functions, "createUserAccount");
  try {
    const result = await fn({
      name,
      email,
      initialCommittee: initialCommittee || null,
      password: password || null,
    });
    return result.data; // { uid, password }
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error("Cannot create user accounts while offline. Please try again when signal is restored.");
    }
    throw err;
  }
}

/* ── Update user role, committee, and/or active status ── */
export async function updateUserRoleAndCommittee(uid, updates) {
  const fn = httpsCallable(functions, "updateUserRoleAndCommittee");
  try {
    await fn({ uid, ...updates });
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueue("updateUserRoleAndCommittee", { uid, ...updates }, `Update role/committee for ${uid}`);
      return; // queued for later
    }
    throw err;
  }
}

/* ── Set user role (+ optional committee) — legacy wrapper ── */
export async function setUserRole(uid, role, committee) {
  await updateUserRoleAndCommittee(uid, { role, committee });
}

/* ── Toggle active / disabled ── */
export async function setUserActiveStatus(uid, active) {
  const fn = httpsCallable(functions, "setUserActiveStatus");
  try {
    await fn({ uid, active: !!active });
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueue("setUserActiveStatus", { uid, active: !!active }, `Set ${active ? "active" : "disabled"} for ${uid}`);
      return;
    }
    throw err;
  }
}

/* ── Delete user account (Auth + Firestore via Cloud Function) ── */
/* NOT queuable — destructive + irreversible, should only run when confirmed online. */
export async function deleteUser(uid) {
  const fn = httpsCallable(functions, "deleteUser");
  try {
    await fn({ uid });
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error("Cannot delete accounts while offline. Please try again when signal is restored.");
    }
    throw err;
  }
}

/* ── Send password-reset email (client-side, no Cloud Function needed) ── */
export async function sendPasswordReset(email) {
  if (!email) throw new Error("email is required");
  try {
    await fbSendPasswordResetEmail(auth, email);
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error("Cannot send password reset while offline. Please try again when signal is restored.");
    }
    throw err;
  }
}

/* ── Reset all event data (admin only, server-side Cloud Function) ── */
/* NOT queuable — destructive admin action, requires online confirmation. */
export async function callResetSystemData() {
  const fn = httpsCallable(functions, "resetSystemData");
  try {
    const result = await fn({});
    return result.data; // { total: number }
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error("Cannot reset system data while offline. Please try again when signal is restored.");
    }
    throw err;
  }
}
