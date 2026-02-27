/**
 * resetSystemData.js
 *
 * Calls the `resetSystemData` Cloud Function (admin-only, server-side).
 * The function deletes all event-data documents, resets zone/headcount counters,
 * and writes an audit log entry — all enforced server-side via assertAdmin().
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

/**
 * Trigger a full system reset via Cloud Function.
 * @returns {Promise<{ total: number }>}
 */
export async function resetSystemData() {
  const fn = httpsCallable(functions, "resetSystemData");
  const result = await fn({});
  return result.data; // { total: number }
}
