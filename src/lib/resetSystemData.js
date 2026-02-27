/**
 * resetSystemData.js
 *
 * Client-side helper that deletes all documents from the event-data collections
 * and resets all live counters back to zero.
 * Protected by Firestore security rules (admin-only write on each collection).
 *
 * Collections cleared:
 *   headcounts, contributions, expenses, shifts, committeeShifts, incidents,
 *   roleAssignments, committeeSchedules
 *
 * Counters reset to 0:
 *   zones[].currentCount  (per-zone live headcount)
 *   counters/headcount    (standalone full-screen counter)
 *
 * Does NOT touch: users, committees (those are config/identity data).
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/** All event-data collections to wipe during a system reset */
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

/**
 * Delete every document in the listed event-data collections, reset all zone
 * currentCounts to 0, and zero out the standalone headcount counter.
 * Uses batched writes (max 500 ops per batch).
 *
 * @param {(msg: string) => void} [onProgress] - optional progress callback
 * @returns {Promise<{ total: number }>}  total documents deleted/updated
 */
export async function resetSystemData(onProgress) {
  let total = 0;

  // 1. Delete event-data collections
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

  // 2. Reset per-zone live headcounts to 0
  onProgress?.("Resetting zone headcounts…");
  const zonesSnap = await getDocs(collection(db, "zones"));
  for (let i = 0; i < zonesSnap.docs.length; i += 500) {
    const batch = writeBatch(db);
    zonesSnap.docs.slice(i, i + 500).forEach((d) => {
      batch.update(d.ref, { currentCount: 0, lastUpdated: serverTimestamp() });
    });
    await batch.commit();
  }
  total += zonesSnap.docs.length;
  onProgress?.(`Reset ${zonesSnap.docs.length} zone counters`);

  // 3. Reset standalone full-screen headcount counter
  onProgress?.("Resetting standalone headcount counter…");
  await setDoc(
    doc(db, "counters", "headcount"),
    { count: 0, lastUpdated: serverTimestamp() },
    { merge: true }
  );
  total += 1;
  onProgress?.("Reset standalone headcount counter");

  return { total };
}
