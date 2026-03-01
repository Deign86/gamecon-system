/**
 * useQueuedWrite.js — Offline-aware Firestore write hook for PlayVerse Ops.
 *
 * Firestore SDK with `persistentLocalCache` automatically queues writes when
 * offline and syncs them when connectivity is restored. This hook adds the
 * UI layer: components can detect whether their write was committed immediately
 * (online) or queued for later (offline) and show appropriate feedback.
 *
 * Usage:
 *   const { execute, status, isQueued, reset } = useQueuedWrite();
 *
 *   // In a handler:
 *   const { queued } = await execute(() => markAttendance(...));
 *   if (queued) toast("Saved offline — will sync when signal returns", "warning");
 *   else        toast("Attendance marked", "success");
 *
 * Status values:
 *   "idle"    – no write in progress
 *   "pending" – write in flight
 *   "queued"  – write stored locally, pending sync (device was offline)
 *   "done"    – write committed to server
 *   "error"   – non-network write failure
 */

import { useCallback, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";

/**
 * Heuristic: is this error a connectivity/offline problem?
 * Firestore errors in this category: code "unavailable", "deadline-exceeded",
 * generic fetch failures, or explicit offline status.
 */
function isNetworkError(err) {
  if (!err) return false;
  const code = err?.code || "";
  const msg  = (err?.message || "").toLowerCase();
  return (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    code === "cancelled" ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("unavailable") ||
    msg.includes("offline") ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}

/**
 * @returns {{
 *   execute: (writeFn: () => Promise<any>) => Promise<{ queued: boolean, result?: any }>,
 *   status: "idle"|"pending"|"queued"|"done"|"error",
 *   isQueued: boolean,
 *   reset: () => void,
 * }}
 */
export function useQueuedWrite() {
  const { isOnline } = useOnlineStatus();
  const [status, setStatus] = useState("idle");

  /**
   * Execute a write. Returns `{ queued: true }` if the device is offline
   * (write is in the Firestore SDK queue), or `{ queued: false, result }` when
   * the write was committed immediately.
   *
   * @param {() => Promise<any>} writeFn – the actual Firestore mutation
   */
  const execute = useCallback(
    async (writeFn) => {
      setStatus("pending");
      try {
        const result = await writeFn();
        // Firestore SDK resolves the promise even while offline, but then
        // we know the device is offline so the write is sitting in the queue.
        if (!isOnline) {
          setStatus("queued");
          return { queued: true, result };
        }
        setStatus("done");
        return { queued: false, result };
      } catch (err) {
        // isNetworkError uses navigator.onLine which is unreliable in Capacitor WebView.
        // Also check the context-level isOnline which uses the Capacitor Network plugin.
        if (isNetworkError(err) || !isOnline) {
          // SDK still queued the write, but a network error surfaced — mark queued
          setStatus("queued");
          return { queued: true };
        }
        setStatus("error");
        throw err;
      }
    },
    [isOnline],
  );

  const reset = useCallback(() => setStatus("idle"), []);

  return {
    execute,
    status,
    isQueued: status === "queued",
    isPending: status === "pending",
    isDone: status === "done",
    reset,
  };
}
