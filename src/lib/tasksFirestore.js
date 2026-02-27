/**
 * tasksFirestore.js
 *
 * Firestore CRUD + real-time helpers for the Task Board (Kanban).
 *
 * Collection: `tasks`
 *
 * Task shape:
 *   id, title, description, status ("todo"|"in_progress"|"done"),
 *   zoneId, committee, assignees[], createdAt, createdBy,
 *   updatedAt, priority ("low"|"medium"|"high"), day ("DAY 1"|"DAY 2")
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { error as logError } from "./logger";

const TASKS = "tasks";

/* ─── real-time subscription ─── */

/**
 * Subscribe to tasks for a given event day.
 * @param {"DAY 1"|"DAY 2"} day
 * @param {(tasks: object[]) => void} callback
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeTasks(day, callback, onError) {
  const q = query(
    collection(db, TASKS),
    where("day", "==", day),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      logError("tasks subscription error:", err);
      callback([]);
      onError?.(err);
    }
  );
}

/* ─── mutations ─── */

/**
 * Create a new task.
 * @param {object} input — at minimum { title, day }
 * @param {string} createdByUid — current user uid
 * @returns {Promise<string>} new doc id
 */
export async function createTask(input, createdByUid) {
  const data = {
    title: input.title,
    description: input.description || "",
    status: input.status || "todo",
    zoneId: input.zoneId || null,
    committee: input.committee || null,
    assignees: input.assignees || [],
    priority: input.priority || "medium",
    day: input.day || "DAY 1",
    createdBy: createdByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, TASKS), data);
  return ref.id;
}

/**
 * Update an existing task.
 * @param {string} id — task doc id
 * @param {object} updates — partial task fields
 */
export async function updateTask(id, updates) {
  const ref = doc(db, TASKS, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a task.
 * @param {string} id
 */
export async function deleteTask(id) {
  await deleteDoc(doc(db, TASKS, id));
}
