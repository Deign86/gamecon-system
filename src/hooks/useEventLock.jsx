/**
 * useEventLock.jsx — Per-module write-lock context.
 *
 * Provides:
 *   locks             – Record<moduleKey, boolean> — live lock state per module
 *   toggleModuleLock  – admin-only fn to flip a single module's lock
 *   toggleAllLocks    – admin-only fn to lock/unlock all modules at once
 *   lockLoading       – boolean: initial fetch in progress
 *
 * Hooks:
 *   useEventLock()           – full context (used by AdminResetPanel)
 *   useModuleLock(moduleKey) – narrowed to one module; returns { locked, toggleLock, lockLoading }
 *
 * Wrap the app in <EventLockProvider> (done in App.jsx).
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  subscribeModuleLocks,
  setModuleLock,
  setAllModuleLocks,
  MODULE_KEYS,
} from "../lib/eventLock";
import { useAuth } from "./useAuth";
import { logActivity } from "../lib/auditLog";

const DEFAULT_LOCKS = Object.fromEntries(MODULE_KEYS.map((k) => [k, false]));

const EventLockCtx = createContext({
  locks: { ...DEFAULT_LOCKS },
  toggleModuleLock: async () => {},
  toggleAllLocks: async () => {},
  lockLoading: true,
});

export function EventLockProvider({ children }) {
  const { user, profile } = useAuth();
  const [locks, setLocks] = useState({ ...DEFAULT_LOCKS });
  const [lockLoading, setLockLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeModuleLocks((newLocks) => {
      setLocks(newLocks);
      setLockLoading(false);
    });
    return unsub;
  }, []);

  const toggleModuleLock = useCallback(async (moduleKey) => {
    if (profile?.role !== "admin") return;
    const nextLocked = !locks[moduleKey];
    await setModuleLock(moduleKey, nextLocked);
    logActivity({
      action: nextLocked ? "module.lock" : "module.unlock",
      category: "system",
      details: nextLocked
        ? `Module "${moduleKey}" locked — write access restricted for non-admins`
        : `Module "${moduleKey}" unlocked — write access restored`,
      userId:   user?.uid   || "admin",
      userName: profile?.name || "Admin",
    });
  }, [locks, user, profile]);

  const toggleAllLocks = useCallback(async () => {
    if (profile?.role !== "admin") return;
    // If ANY module is unlocked → lock all; otherwise unlock all
    const nextLocked = MODULE_KEYS.some((k) => !locks[k]);
    await setAllModuleLocks(nextLocked);
    logActivity({
      action: nextLocked ? "event.lock" : "event.unlock",
      category: "system",
      details: nextLocked
        ? "All modules locked — write access restricted for non-admins"
        : "All modules unlocked — write access restored",
      userId:   user?.uid   || "admin",
      userName: profile?.name || "Admin",
    });
  }, [locks, user, profile]);

  return (
    <EventLockCtx.Provider value={{ locks, toggleModuleLock, toggleAllLocks, lockLoading }}>
      {children}
    </EventLockCtx.Provider>
  );
}

/** Full context — for AdminResetPanel and global status reads. */
export function useEventLock() {
  return useContext(EventLockCtx);
}

/**
 * Module-scoped hook — returns lock state and toggle for one module.
 * Used by Modal headers and inner feature components.
 */
export function useModuleLock(moduleKey) {
  const { locks, toggleModuleLock, lockLoading } = useContext(EventLockCtx);
  return {
    locked:     moduleKey ? (locks[moduleKey] ?? false) : false,
    toggleLock: () => toggleModuleLock(moduleKey),
    lockLoading,
  };
}

