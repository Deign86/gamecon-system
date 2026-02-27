/**
 * roleFirestore.js
 *
 * Firestore persistence helpers for the Role & Tasking module.
 *
 * Collections:
 *   roleAssignments     – one doc per person  (id = slugified name)
 *   committeeSchedules  – one doc per committee+day (id = slug)
 */

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { error as logError } from "./logger";

/* ─── collection refs ─── */
const ROLE_ASSIGNMENTS   = "roleAssignments";
const COMMITTEE_SCHEDULES = "committeeSchedules";

/* ─── helpers ─── */

/** Create a Firestore-safe document id from an arbitrary string */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ─── import (write) ─── */

/**
 * Clear both collections and repopulate from parsed data.
 * Uses batched writes (max 500 ops per batch).
 *
 * @param {{ personRoles: import('./parseRoleSheet').PersonRoles[], committeeSchedules: import('./parseRoleSheet').CommitteeSchedule[] }} data
 */
export async function importRoleData({ personRoles, committeeSchedules }) {
  // 1. Delete all existing docs in both collections
  const [existingRoles, existingSchedules] = await Promise.all([
    getDocs(collection(db, ROLE_ASSIGNMENTS)),
    getDocs(collection(db, COMMITTEE_SCHEDULES)),
  ]);

  const allDeletes = [
    ...existingRoles.docs.map((d) => d.ref),
    ...existingSchedules.docs.map((d) => d.ref),
  ];

  // Batch deletes in chunks of 500
  for (let i = 0; i < allDeletes.length; i += 500) {
    const batch = writeBatch(db);
    allDeletes.slice(i, i + 500).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  // 2. Write personRoles
  const roleDocs = personRoles.map((pr) => ({
    ref: doc(db, ROLE_ASSIGNMENTS, slugify(pr.name)),
    data: {
      name: pr.name,
      assignments: pr.assignments, // array of { committee, day }
      importedAt: new Date().toISOString(),
    },
  }));

  for (let i = 0; i < roleDocs.length; i += 500) {
    const batch = writeBatch(db);
    roleDocs.slice(i, i + 500).forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }

  // 3. Write committeeSchedules
  const schedDocs = committeeSchedules.map((cs) => ({
    ref: doc(
      db,
      COMMITTEE_SCHEDULES,
      slugify(`${cs.committee}-${cs.day}`)
    ),
    data: {
      committee: cs.committee,
      day: cs.day,
      members: cs.members,
      importedAt: new Date().toISOString(),
    },
  }));

  for (let i = 0; i < schedDocs.length; i += 500) {
    const batch = writeBatch(db);
    schedDocs.slice(i, i + 500).forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }

  return {
    personsWritten: roleDocs.length,
    schedulesWritten: schedDocs.length,
  };
}

/* ─── real-time read hooks ─── */

/**
 * Subscribe to roleAssignments collection.
 * @param {(docs: any[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeRoleAssignments(callback, onError) {
  const q = query(collection(db, ROLE_ASSIGNMENTS), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => {
    logError("roleAssignments subscription error:", err);
    callback([]);
    onError?.(err);
  });
}

/**
 * Subscribe to committeeSchedules collection.
 * @param {(docs: any[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeCommitteeSchedules(callback, onError) {
  const q = query(collection(db, COMMITTEE_SCHEDULES), orderBy("committee"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => {
    logError("committeeSchedules subscription error:", err);
    callback([]);
    onError?.(err);
  });
}
