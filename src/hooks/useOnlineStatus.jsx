/**
 * useOnlineStatus.jsx — Cross-platform connectivity hook for PlayVerse Ops.
 *
 * Works on:
 *   • Web     — navigator.onLine + online/offline events
 *   • Android — @capacitor/network plugin (navigator.onLine is unreliable in WebView)
 *   • Desktop — Tauri probe-based monitor + navigator events
 *
 * Provides:
 *   • `isOnline`      – boolean, true when the device has internet connectivity
 *   • `pendingCount`  – number of queued Cloud Function calls awaiting sync
 *   • `isSyncing`     – boolean, true while the queue is being replayed
 *   • `replayNow`     – function to manually trigger queue replay
 *
 * Automatically replays the offline queue when connectivity is restored.
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { functions } from "../firebase";
import {
  replayQueue,
  onQueueChange,
} from "../lib/offlineQueue";
import { startNetworkMonitor, checkConnectivity } from "../lib/networkStatus";

const OnlineCtx = createContext({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  replayNow: () => {},
});

export function useOnlineStatus() {
  return useContext(OnlineCtx);
}

export function OnlineStatusProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true); // optimistic default
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLock = useRef(false);

  /* ── Platform-aware network monitoring ── */
  useEffect(() => {
    let cleanup = null;

    startNetworkMonitor((online) => {
      setIsOnline(online);
    }).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  /* ── Subscribe to queue count changes ── */
  useEffect(() => {
    return onQueueChange(setPendingCount);
  }, []);

  /* ── Replay function ── */
  const replayNow = useCallback(async () => {
    if (syncLock.current) return;
    // Double-check actual connectivity before replay
    const connected = await checkConnectivity();
    if (!connected) return;

    syncLock.current = true;
    setIsSyncing(true);
    try {
      const result = await replayQueue(functions);
      if (import.meta.env.DEV) {
        console.info("[offlineQueue] replay result:", result);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[offlineQueue] replay error:", err);
      }
    } finally {
      setIsSyncing(false);
      syncLock.current = false;
    }
  }, []);

  /* ── Replay on app foreground — catches pending items after backgrounding ── */
  /* Fires on Android (Capacitor) app resume and on desktop tab-refocus.
     If the queue has items and we are online, attempt replay immediately
     rather than waiting for the next 30-second periodic tick. */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && pendingCount > 0) {
        replayNow();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pendingCount, replayNow]);

  /* ── Auto-replay when connectivity is restored ── */
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      replayNow();
    }
  }, [isOnline, pendingCount, replayNow]);

  /* ── Periodic retry while online with pending items (every 30s) ── */
  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;
    const id = setInterval(() => {
      if (pendingCount > 0) {
        replayNow();
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [isOnline, pendingCount, replayNow]);

  return (
    <OnlineCtx.Provider value={{ isOnline, pendingCount, isSyncing, replayNow }}>
      {children}
    </OnlineCtx.Provider>
  );
}
