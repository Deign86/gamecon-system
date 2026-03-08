/**
 * eventLock.js — Per-module write-lock helpers.
 *
 * Stored in Firestore at `counters/moduleLocks`:
 *   {
 *     headcount:     boolean,
 *     shifts:        boolean,
 *     attendance:    boolean,
 *     contributions: boolean,
 *     budget:        boolean,
 *     incidents:     boolean,
 *     tasks:         boolean,
 *   }
 *
 * Each lockable module has an independent lock. Admins always retain full
 * write access. Firestore security rules must restrict counters/moduleLocks
 * writes to admin users.
 */
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const MODULE_KEYS = [
  "headcount",
  "shifts",
  "attendance",
  "contributions",
  "budget",
  "incidents",
  "tasks",
];

const DEFAULT_LOCKS = Object.fromEntries(MODULE_KEYS.map((k) => [k, false]));

const LOCKS_DOC = doc(db, "counters", "moduleLocks");

/**
 * Real-time subscription to all module lock states.
 * @param {(locks: Record<string, boolean>) => void} callback
 * @returns unsubscribe function
 */
export function subscribeModuleLocks(callback) {
  return onSnapshot(
    LOCKS_DOC,
    (snap) => {
      if (!snap.exists()) {
        callback({ ...DEFAULT_LOCKS });
        return;
      }
      const data = snap.data();
      callback(Object.fromEntries(MODULE_KEYS.map((k) => [k, !!data[k]])));
    },
    (err) => {
      if (import.meta.env.DEV) console.error("[moduleLocks] subscribe error:", err);
      callback({ ...DEFAULT_LOCKS });
    }
  );
}

/**
 * Set the lock state for a single module.
 * @param {string} moduleKey
 * @param {boolean} locked
 */
export async function setModuleLock(moduleKey, locked) {
  await setDoc(LOCKS_DOC, { [moduleKey]: locked }, { merge: true });
}

/**
 * Set all modules to the same lock state.
 * @param {boolean} locked
 */
export async function setAllModuleLocks(locked) {
  await setDoc(
    LOCKS_DOC,
    Object.fromEntries(MODULE_KEYS.map((k) => [k, locked])),
    { merge: true }
  );
}
