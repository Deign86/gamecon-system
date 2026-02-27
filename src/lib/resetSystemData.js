/**
 * resetSystemData.js
 *
 * Client-side helper that deletes all documents from the event-data collections.
 * Protected by Firestore security rules (admin-only write on each collection).
 *
 * Collections cleared:
 *   headcounts, contributions, expenses, shifts, incidents,
 *   roleAssignments, committeeSchedules
 *
 * Does NOT touch: users, zones, committees (those are config/identity data).
 */

import {
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

/** All event-data collections to wipe during a system reset */
const COLLECTIONS_TO_CLEAR = [
  "headcounts",
  "contributions",
  "expenses",
  "shifts",
  "incidents",
  "roleAssignments",
  "committeeSchedules",
];

/**
 * Delete every document in the listed event-data collections.
 * Uses batched writes (max 500 ops per batch).
 *
 * @param {(msg: string) => void} [onProgress] - optional progress callback
 * @returns {Promise<{ total: number }>}  total documents deleted
 */
export async function resetSystemData(onProgress) {
  let total = 0;

  for (const colName of COLLECTIONS_TO_CLEAR) {
    onProgress?.(`Clearing ${colName}…`);

    const snap = await getDocs(collection(db, colName));
    const refs = snap.docs.map((d) => d.ref);

    for (let i = 0; i < refs.length; i += 500) {
      const batch = writeBatch(db);
      refs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    total += refs.length;
    onProgress?.(`Cleared ${colName} (${refs.length} docs)`);
  }

  return { total };
}
