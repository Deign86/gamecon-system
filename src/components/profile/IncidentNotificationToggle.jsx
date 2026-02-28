/**
 * IncidentNotificationToggle
 * ──────────────────────────
 * Toggle to enable / disable push notifications for incident reports.
 * Detects the current platform and shows the appropriate label.
 *
 * **Per-device**: preference is stored in localStorage (keyed by uid),
 * so toggling on one device does NOT affect other devices.
 */

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2, Smartphone, Monitor, Globe } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  requestNotificationPermission,
  removeAllUserTokens,
  isCapacitor,
  isTauri,
} from "../../lib/messaging";
import { cn } from "../../lib/utils";

/* ── Per-device localStorage helpers ── */
const STORAGE_KEY_PREFIX = "gc_notif_enabled_";

export function getDeviceNotifEnabled(uid) {
  if (!uid) return null; // unknown
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + uid);
    if (raw === null) return null; // never set on this device
    return raw === "1";
  } catch { return null; }
}

function setDeviceNotifEnabled(uid, value) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + uid, value ? "1" : "0");
  } catch { /* quota / private mode */ }
}

function getPlatformInfo() {
  if (isCapacitor()) return { label: "Android", Icon: Smartphone };
  if (isTauri()) return { label: "Desktop", Icon: Monitor };
  return { label: "Web", Icon: Globe };
}

export default function IncidentNotificationToggle() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [permStatus, setPermStatus] = useState("idle"); // idle | granted | denied | unsupported
  const [enabled, setEnabled] = useState(false);

  /* Derive initial state from localStorage + browser permission */
  useEffect(() => {
    if (!user) return;
    const stored = getDeviceNotifEnabled(user.uid);
    if (stored !== null) {
      setEnabled(stored);
    } else {
      // Never set on this device — default to true only if permission already granted
      const granted = "Notification" in window && Notification.permission === "granted";
      setEnabled(granted);
    }
  }, [user?.uid]);

  const { label: platformLabel, Icon: PlatformIcon } = getPlatformInfo();

  /* Check browser/system notification permission on mount */
  useEffect(() => {
    if (!("Notification" in window) && !isCapacitor()) {
      setPermStatus("unsupported");
    } else if ("Notification" in window) {
      setPermStatus(
        Notification.permission === "granted" ? "granted" : "idle"
      );
    }
  }, []);

  async function handleToggle() {
    if (!user || busy) return;
    setBusy(true);

    try {
      if (!enabled) {
        /* ── Enable ── */
        const token = await requestNotificationPermission(user.uid);

        if (token || isTauri()) {
          setDeviceNotifEnabled(user.uid, true);
          setEnabled(true);
          setPermStatus("granted");
        } else if ("Notification" in window && Notification.permission === "granted") {
          // Permission granted but FCM token failed — still enable
          // because the Firestore fallback listener will provide in-app toasts
          setDeviceNotifEnabled(user.uid, true);
          setEnabled(true);
          setPermStatus("granted");
        } else {
          // Permission was denied by the browser / OS
          setPermStatus("denied");
        }
      } else {
        /* ── Disable ── */
        await removeAllUserTokens(user.uid);
        setDeviceNotifEnabled(user.uid, false);
        setEnabled(false);
        setPermStatus("idle");
      }
    } catch (err) {
      console.error("[Notifications] Toggle failed:", err);
    } finally {
      setBusy(false);
    }
  }

  /* Don't render at all if the platform has zero notification support */
  if (permStatus === "unsupported") return null;

  return (
    <div className="gc-card p-4">
      <div className="flex items-center justify-between gap-3">
        {/* Label */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md",
              enabled
                ? "bg-gc-crimson/15 text-gc-crimson"
                : "bg-gc-steel/50 text-gc-mist"
            )}
          >
            {enabled ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-gc-cloud">Incident Alerts</p>
            <p className="text-[11px] text-gc-mist flex items-center gap-1">
              <PlatformIcon className="h-3 w-3" />
              {enabled
                ? `Active on ${platformLabel}`
                : "Push notifications disabled"}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          disabled={busy}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full",
            "border-2 transition-colors duration-200 focus:outline-none",
            enabled
              ? "border-gc-crimson/30 bg-gc-crimson/20"
              : "border-gc-steel bg-gc-iron",
            busy && "opacity-50 cursor-not-allowed"
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 text-gc-mist animate-spin mx-auto" />
          ) : (
            <span
              className={cn(
                "inline-block h-5 w-5 rounded-full transition-transform duration-200",
                enabled
                  ? "translate-x-5 bg-gc-crimson shadow-lg shadow-gc-crimson/40"
                  : "translate-x-0.5 bg-gc-mist"
              )}
            />
          )}
        </button>
      </div>

      {/* Permission-denied hint */}
      {permStatus === "denied" && (
        <p className="mt-2 text-[10px] text-gc-danger font-mono">
          Permission denied — enable notifications in your browser / device
          settings
        </p>
      )}
    </div>
  );
}
