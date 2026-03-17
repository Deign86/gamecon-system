/**
 * Firestore helpers for the Contributions collection.
 *
 * Schema:
 *   contributions/{id}
 *     userId    : string   – whose contribution this is
 *     userName  : string   – snapshot of that person's name
 *     committee : string   – committee id (from COMMITTEES)
 *     task      : string   – short task title
 *     details   : string   – optional longer description
 *     loggedBy  : string   – uid of the proctor who created the entry
 *     createdAt : Timestamp
 *     timestamp : Timestamp  (legacy compat, same value)
 */
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
}

function sortNewestFirst(items) {
  return [...items].sort(
    (a, b) => toMillis(b.createdAt || b.timestamp) - toMillis(a.createdAt || a.timestamp)
  );
}

/** Real-time listener – all contributions for one user */
export function subscribeContributionsByUser(userId, callback) {
  const q = query(
    collection(db, "contributions"),
    where("userId", "==", userId)
  );
  return onSnapshot(
    q,
    (snap) => callback(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => {
      if (import.meta.env.DEV) console.error("subscribeContributionsByUser error:", err);
      callback([]);
    }
  );
}

/** Real-time listener – ALL contributions (used by committee view) */
export function subscribeAllContributions(callback) {
  const q = query(collection(db, "contributions"));
  return onSnapshot(
    q,
    (snap) => callback(sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => {
      if (import.meta.env.DEV) console.error("subscribeAllContributions error:", err);
      callback([]);
    }
  );
}

/** Create a new contribution entry */
export async function createContribution({
  userId,
  userName,
  committee,
  task,
  details,
  loggedBy,
}) {
  const now = serverTimestamp();
  return addDoc(collection(db, "contributions"), {
    userId,
    userName,
    committee: committee || "",
    task: task.trim(),
    details: (details || "").trim(),
    loggedBy,
    createdAt: now,
    timestamp: now, // legacy compat for ProfilePanel
  });
}

/** Update an existing contribution entry */
export async function updateContribution(id, updates) {
  return updateDoc(doc(db, "contributions", id), updates);
}

/** Delete a contribution entry */
export async function deleteContribution(id) {
  return deleteDoc(doc(db, "contributions", id));
}
