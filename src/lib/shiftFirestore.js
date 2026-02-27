/**
 * shiftFirestore.js
 *
 * Firestore persistence helpers for the Shift Handling system.
 *
 * Collection: `committeeShifts`
 *   - Doc ID pattern: `${dayBlock}_${committeeId}`
 *   - Fields: dayBlock, committeeId, committeeName, assignees, requiredCount, updatedAt, updatedBy
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import { COMMITTEE_REQUIRED_STAFF } from "../data/seed";

const COLLECTION = "committeeShifts";

/* ─── helpers ─── */

/** Build the deterministic document ID for a committee shift */
export function shiftDocId(dayBlock, committeeId) {
  return `${dayBlock}_${committeeId}`;
}

/* ─── real-time subscriptions ─── */

/**
 * Subscribe to all shifts for a given day-block in real time.
 * @param {string} dayBlock  e.g. "d1-morning"
 * @param {(shifts: object[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeShiftsForBlock(dayBlock, callback) {
  const q = query(
    collection(db, COLLECTION),
    where("dayBlock", "==", dayBlock)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      logError("committeeShifts subscription error:", err);
      callback([]);
    }
  );
}

/* ─── reads ─── */

/**
 * Fetch all shifts for a given day-block (one-time read).
 * @param {string} dayBlock
 * @returns {Promise<object[]>}
 */
export async function getShiftsForBlock(dayBlock) {
  const q = query(
    collection(db, COLLECTION),
    where("dayBlock", "==", dayBlock)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ─── writes (transactional) ─── */

/**
 * Create or fully replace a committee shift document.
 * @param {object} shift – must include dayBlock, committeeId, committeeName, assignees, requiredCount
 * @param {string} updatedByUid
 */
export async function upsertCommitteeShift(shift, updatedByUid) {
  const docId = shiftDocId(shift.dayBlock, shift.committeeId);
  const ref = doc(db, COLLECTION, docId);

  await setDoc(ref, {
    dayBlock: shift.dayBlock,
    committeeId: shift.committeeId,
    committeeName: shift.committeeName,
    assignees: shift.assignees || [],
    requiredCount: shift.requiredCount ?? 1,
    updatedAt: serverTimestamp(),
    updatedBy: updatedByUid,
  });
}

/**
 * Add a single assignee to a committee shift (creates doc if missing).
 * Uses a transaction to avoid race conditions.
 *
 * @param {string} dayBlock
 * @param {string} committeeId
 * @param {string} committeeName
 * @param {{ userId: string, name: string }} user
 * @param {string} updatedByUid
 */
export async function addAssigneeToShift(
  dayBlock,
  committeeId,
  committeeName,
  user,
  updatedByUid
) {
  const docId = shiftDocId(dayBlock, committeeId);
  const ref = doc(db, COLLECTION, docId);

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(ref);

    if (!snap.exists()) {
      // Create the document with this first assignee
      txn.set(ref, {
        dayBlock,
        committeeId,
        committeeName,
        assignees: [user],
        requiredCount: COMMITTEE_REQUIRED_STAFF[committeeId] ?? 1,
        updatedAt: serverTimestamp(),
        updatedBy: updatedByUid,
      });
    } else {
      const data = snap.data();
      // Check for dupes
      const alreadyAssigned = (data.assignees || []).some(
        (a) => a.userId === user.userId
      );
      if (alreadyAssigned) return;

      txn.update(ref, {
        assignees: [...(data.assignees || []), user],
        updatedAt: serverTimestamp(),
        updatedBy: updatedByUid,
      });
    }
  });
}

/**
 * Remove a single assignee from a committee shift.
 * Uses a transaction to avoid race conditions.
 *
 * @param {string} shiftId  – document ID (dayBlock_committeeId)
 * @param {string} userId
 * @param {string} updatedByUid
 */
export async function removeAssigneeFromShift(shiftId, userId, updatedByUid) {
  const ref = doc(db, COLLECTION, shiftId);

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const newAssignees = (data.assignees || []).filter(
      (a) => a.userId !== userId
    );

    txn.update(ref, {
      assignees: newAssignees,
      updatedAt: serverTimestamp(),
      updatedBy: updatedByUid,
    });
  });
}

/**
 * Initialise empty shift docs for every committee in a block (admin action).
 * Skips committees that already have a doc.
 *
 * @param {string} dayBlock
 * @param {{ id: string, name: string }[]} committees
 * @param {string} updatedByUid
 */
export async function initialiseBlockShifts(dayBlock, committees, updatedByUid) {
  const existing = await getShiftsForBlock(dayBlock);
  const existingIds = new Set(existing.map((s) => s.committeeId));

  const promises = committees
    .filter((c) => !existingIds.has(c.id))
    .map((c) =>
      setDoc(doc(db, COLLECTION, shiftDocId(dayBlock, c.id)), {
        dayBlock,
        committeeId: c.id,
        committeeName: c.name,
        assignees: [],
        requiredCount: COMMITTEE_REQUIRED_STAFF[c.id] ?? 1,
        updatedAt: serverTimestamp(),
        updatedBy: updatedByUid,
      })
    );

  await Promise.all(promises);
}
