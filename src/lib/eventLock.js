/**
 * eventLock.js — Event-wide write-lock helpers.
 *
 * Stored in Firestore at `counters/eventLock`:
 *   {
 *     locked:        boolean,
 *     lockedAt:      Timestamp | null,
 *     lockedBy:      string (uid),
 *     lockedByName:  string,
 *   }
 *
 * When locked = true, write actions in ShiftBoard, Attendance,
 * Live Headcount, and RoleTasking are blocked for non-admin users.
 * Admins always retain full write access.
 */
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const LOCK_DOC = doc(db, "counters", "eventLock");

/**
 * Real-time subscription to the lock state.
 * @param {(locked: boolean, meta: object) => void} callback
 * @returns unsubscribe function
 */
export function subscribeEventLock(callback) {
  return onSnapshot(
    LOCK_DOC,
    (snap) => {
      if (!snap.exists()) {
        callback(false, {});
        return;
      }
      const data = snap.data();
      callback(!!data.locked, data);
    },
    (err) => {
      if (import.meta.env.DEV) console.error("[eventLock] subscribe error:", err);
      callback(false, {});
    }
  );
}

/**
 * Set the event lock state. Admin-only — Cloud Functions re-verify on any
 * sensitive mutation, but the lock itself is only writable by admins via
 * Firestore security rules which must restrict counters/eventLock to admins.
 *
 * @param {boolean} locked
 * @param {{ uid: string, name: string }} actor
 */
export async function setEventLock(locked, actor) {
  await setDoc(
    LOCK_DOC,
    {
      locked,
      lockedAt:      locked ? serverTimestamp() : null,
      lockedBy:      actor.uid,
      lockedByName:  actor.name,
    },
    { merge: true }
  );
}
