/**
 * offlineQueue.js — IndexedDB-backed request queue for PlayVerse Ops.
 *
 * When the device is offline (or signal is too weak for Cloud Functions),
 * admin mutations are queued locally and automatically retried once
 * connectivity is restored.
 *
 * Direct Firestore reads/writes are already handled by the Firestore
 * persistent cache (firebase.js), so this queue is specifically for
 * Cloud Function calls (httpsCallable) which have no built-in retry.
 *
 * Architecture:
 * ┌──────────────┐        ┌────────────┐        ┌───────────────┐
 * │  UI action    │──ok──▶│ Cloud Fn    │──ok──▶│ done          │
 * │  (adminApi)   │       │ call        │       │               │
 * └──────┬───────┘       └─────┬──────┘       └───────────────┘
 *        │                      │ fail (offline/timeout)
 *        │                      ▼
 *        │               ┌────────────┐
 *        │               │ IndexedDB  │ ◀── queue entry
 *        │               │  "pvops-q" │
 *        │               └─────┬──────┘
 *        │                     │ online event / periodic retry
 *        │                     ▼
 *        │               ┌────────────┐
 *        │               │ Replay     │──ok──▶ delete entry
 *        │               │ Cloud Fn   │──fail──▶ increment retries
 *        │               └────────────┘
 */

/* ── IndexedDB Constants ── */
const DB_NAME    = "pvops-offline-queue";
const DB_VERSION = 1;
const STORE      = "pending";
const MAX_RETRIES = 10;

/* ── Listeners for UI updates ── */
const listeners = new Set();

/** Subscribe to queue count changes. Returns unsubscribe fn. */
export function onQueueChange(fn) {
  listeners.add(fn);
  // Fire immediately with current count
  getQueueCount().then(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  getQueueCount().then((count) => {
    listeners.forEach((fn) => fn(count));
  });
}

/* ── IndexedDB Helpers ── */

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Enqueue a failed Cloud Function call for later replay.
 *
 * @param {string} fnName   – Cloud Function name (e.g. "createUserAccount")
 * @param {object} payload  – the data that was passed to httpsCallable
 * @param {string} label    – human-readable description for the queue UI
 */
export async function enqueue(fnName, payload, label) {
  const db = await openDB();
  const txn = db.transaction(STORE, "readwrite");
  txn.objectStore(STORE).add({
    fnName,
    payload,
    label: label || fnName,
    retries: 0,
    createdAt: Date.now(),
  });
  await txnComplete(txn);
  db.close();
  notifyListeners();
}

/** Get all pending items (oldest first). */
export async function getPending() {
  const db = await openDB();
  const txn = db.transaction(STORE, "readonly");
  const items = await getAllFromStore(txn.objectStore(STORE));
  db.close();
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

/** Get count of pending items. */
export async function getQueueCount() {
  try {
    const db = await openDB();
    const txn = db.transaction(STORE, "readonly");
    const count = await countStore(txn.objectStore(STORE));
    db.close();
    return count;
  } catch {
    return 0;
  }
}

/** Remove an item by id (after successful replay or manual discard). */
export async function removeItem(id) {
  const db = await openDB();
  const txn = db.transaction(STORE, "readwrite");
  txn.objectStore(STORE).delete(id);
  await txnComplete(txn);
  db.close();
  notifyListeners();
}

/** Increment retry count for an item. */
export async function incrementRetries(id) {
  const db = await openDB();
  const txn = db.transaction(STORE, "readwrite");
  const store = txn.objectStore(STORE);
  const item = await getByKey(store, id);
  if (item) {
    item.retries = (item.retries || 0) + 1;
    item.lastAttempt = Date.now();
    store.put(item);
  }
  await txnComplete(txn);
  db.close();
}

/** Clear the entire queue (admin action). */
export async function clearQueue() {
  const db = await openDB();
  const txn = db.transaction(STORE, "readwrite");
  txn.objectStore(STORE).clear();
  await txnComplete(txn);
  db.close();
  notifyListeners();
}

/* ── Replay Engine ── */

/**
 * Attempt to replay all queued Cloud Function calls.
 * Called automatically when the browser fires the `online` event,
 * or can be triggered manually from the UI.
 *
 * @param {import("firebase/functions").Functions} functions – Firebase Functions instance
 * @returns {{ succeeded: number, failed: number, skipped: number }}
 */
export async function replayQueue(functions) {
  const { httpsCallable } = await import("firebase/functions");
  const items = await getPending();
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.retries >= MAX_RETRIES) {
      skipped++;
      continue;
    }

    try {
      const fn = httpsCallable(functions, item.fnName);
      await fn(item.payload);
      await removeItem(item.id);
      succeeded++;
    } catch (err) {
      // If still offline or transient error, increment and move on
      await incrementRetries(item.id);
      failed++;
      if (import.meta.env?.DEV) {
        console.warn(`[offlineQueue] replay failed for ${item.fnName}:`, err.message);
      }
    }
  }

  notifyListeners();
  return { succeeded, failed, skipped };
}

/* ── IDB Promise Wrappers ── */

function txnComplete(txn) {
  return new Promise((resolve, reject) => {
    txn.oncomplete = () => resolve();
    txn.onerror    = () => reject(txn.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function countStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function getByKey(store, key) {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
