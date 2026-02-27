/**
 * changePassword.js
 *
 * Re-authenticates the current Firebase user with their existing password,
 * then updates to a new password.  Maps Firebase error codes to friendly messages.
 */

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";

/** Maps Firebase Auth error codes → human-readable strings */
const ERROR_MAP = {
  "auth/wrong-password":          "Current password is incorrect.",
  "auth/invalid-credential":      "Current password is incorrect.",
  "auth/too-many-requests":       "Too many attempts. Please wait a moment and try again.",
  "auth/weak-password":           "New password is too weak. Use at least 8 characters.",
  "auth/requires-recent-login":   "Session expired. Please sign out and sign back in first.",
  "auth/user-mismatch":           "Credential mismatch. Please sign out and try again.",
  "auth/network-request-failed":  "Network error. Check your connection.",
};

/**
 * Change the current user's password.
 *
 * @param {string} currentPassword - the user's existing password (for re-auth)
 * @param {string} newPassword     - the desired new password (≥ 8 chars)
 * @returns {Promise<void>}
 * @throws {Error} with a user-friendly `message`
 */
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No signed-in user found. Please sign in again.");
  }

  // 1. Re-authenticate
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (err) {
    throw new Error(ERROR_MAP[err.code] || `Re-authentication failed: ${err.message}`);
  }

  // 2. Update password
  try {
    await updatePassword(user, newPassword);
  } catch (err) {
    throw new Error(ERROR_MAP[err.code] || `Password update failed: ${err.message}`);
  }
}
