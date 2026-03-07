/**
 * useEventLock.jsx — Event-wide lock context.
 *
 * Provides:
 *   locked        – boolean: true when event is locked
 *   lockMeta      – { lockedAt, lockedBy, lockedByName } from Firestore
 *   toggleLock    – admin-only function to flip the lock
 *   lockLoading   – boolean: initial fetch in progress
 *
 * Usage:
 *   const { locked, toggleLock, lockLoading } = useEventLock();
 *
 * Wrap the app in <EventLockProvider> (done in App.jsx).
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { subscribeEventLock, setEventLock } from "../lib/eventLock";
import { useAuth } from "./useAuth";
import { logActivity } from "../lib/auditLog";

const EventLockCtx = createContext({
  locked: false,
  lockMeta: {},
  toggleLock: async () => {},
  lockLoading: true,
});

export function EventLockProvider({ children }) {
  const { user, profile } = useAuth();
  const [locked, setLocked]         = useState(false);
  const [lockMeta, setLockMeta]     = useState({});
  const [lockLoading, setLockLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeEventLock((isLocked, meta) => {
      setLocked(isLocked);
      setLockMeta(meta);
      setLockLoading(false);
    });
    return unsub;
  }, []);

  const toggleLock = useCallback(async () => {
    if (profile?.role !== "admin") return;
    const nextLocked = !locked;
    await setEventLock(nextLocked, {
      uid:  user?.uid  || "admin",
      name: profile?.name || "Admin",
    });
    logActivity({
      action: nextLocked ? "event.lock" : "event.unlock",
      category: "system",
      details: nextLocked
        ? "Event locked — write access restricted for non-admins"
        : "Event unlocked — write access restored",
      userId:   user?.uid  || "admin",
      userName: profile?.name || "Admin",
    });
  }, [locked, user, profile]);

  return (
    <EventLockCtx.Provider value={{ locked, lockMeta, toggleLock, lockLoading }}>
      {children}
    </EventLockCtx.Provider>
  );
}

export function useEventLock() {
  return useContext(EventLockCtx);
}
