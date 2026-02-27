/**
 * IncidentNotificationToggle
 * ──────────────────────────
 * Profile section that lets users opt in/out of push notifications
 * for new incident reports. Manages FCM token lifecycle and the
 * user's `notifications` sub-object in Firestore.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Loader2, AlertTriangle, Smartphone, Zap } from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { requestFCMToken, revokeFCMToken } from "../../lib/messaging";
import { cn } from "../../lib/utils";

export default function IncidentNotificationToggle() {
  const { user, profile, setProfile } = useAuth();

  const [enabled, setEnabled]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError]         = useState(null);

  // Derive initial state from profile
  useEffect(() => {
    if (profile?.notifications?.incidentPushEnabled) {
      setEnabled(true);
    } else {
      setEnabled(false);
    }
  }, [profile?.notifications?.incidentPushEnabled]);

  // Check browser support
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setSupported(false);
    }
  }, []);

  const handleToggle = useCallback(async () => {
    if (!user || loading) return;
    setError(null);
    setLoading(true);

    const userRef = doc(db, "users", user.uid);

    try {
      if (!enabled) {
        /* ── ENABLE: request permission → get token → save to Firestore ── */
        const token = await requestFCMToken();
        if (!token) {
          setError("Could not obtain push token. Check notification permissions.");
          setLoading(false);
          return;
        }
        if (token?.error === "fcm-api-disabled") {
          setError("FCM Registration API is not enabled. Ask your admin to enable it in Google Cloud Console.");
          setLoading(false);
          return;
        }

        await updateDoc(userRef, {
          "notifications.incidentPushEnabled": true,
          "notifications.fcmTokens": arrayUnion(token),
        });

        setEnabled(true);
        setProfile((prev) => ({
          ...prev,
          notifications: {
            ...prev?.notifications,
            incidentPushEnabled: true,
            fcmTokens: [...(prev?.notifications?.fcmTokens || []), token],
          },
        }));
      } else {
        /* ── DISABLE: revoke token → remove from Firestore ── */
        // Get the current token list to know which one to remove
        const snap = await getDoc(userRef);
        const currentTokens = snap.data()?.notifications?.fcmTokens || [];

        await revokeFCMToken();

        // Remove our token (we can't determine the exact one after revoke,
        // so clear all tokens for this session — the Cloud Function handles stale tokens)
        const updates = {
          "notifications.incidentPushEnabled": false,
        };

        // If there's only one token, clear the array
        if (currentTokens.length <= 1) {
          updates["notifications.fcmTokens"] = [];
        }

        await updateDoc(userRef, updates);

        setEnabled(false);
        setProfile((prev) => ({
          ...prev,
          notifications: {
            ...prev?.notifications,
            incidentPushEnabled: false,
            fcmTokens: currentTokens.length <= 1 ? [] : currentTokens,
          },
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to update notification preferences.");
    } finally {
      setLoading(false);
    }
  }, [user, enabled, loading, setProfile]);

  if (!supported) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-gc-iron/40 border border-gc-steel/20 px-3 py-2.5">
        <BellOff className="h-4 w-4 text-gc-mist/40 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gc-mist/50">
            Push notifications not supported
          </p>
          <p className="text-[10px] text-gc-mist/30 mt-0.5">
            Your browser doesn&apos;t support web push notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toggle row */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200",
          enabled
            ? "border-gc-crimson/40 bg-gc-crimson/8 hover:border-gc-crimson/60"
            : "border-gc-steel/25 bg-gc-iron/40 hover:border-gc-steel/50 hover:bg-gc-iron/60",
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            enabled
              ? "bg-gc-crimson/15 text-gc-crimson"
              : "bg-gc-steel/15 text-gc-mist/50",
          )}
        >
          {loading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : enabled ? (
            <Bell className="h-4.5 w-4.5" />
          ) : (
            <BellOff className="h-4.5 w-4.5" />
          )}
        </div>

        {/* Label */}
        <div className="flex-1 text-left min-w-0">
          <p className={cn(
            "text-sm font-semibold",
            enabled ? "text-gc-cloud" : "text-gc-mist",
          )}>
            Incident Alerts
          </p>
          <p className="text-[10px] text-gc-mist/50 mt-0.5">
            {enabled
              ? "You'll receive push alerts for new incidents"
              : "Tap to enable push notifications"}
          </p>
        </div>

        {/* Toggle track */}
        <div
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0",
            enabled ? "bg-gc-crimson" : "bg-gc-steel/40",
          )}
        >
          <motion.div
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md"
            animate={{ left: enabled ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
      </button>

      {/* Status indicators */}
      <AnimatePresence mode="wait">
        {enabled && !error && (
          <motion.div
            key="active"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg bg-gc-success/6 border border-gc-success/15 px-3 py-2">
              <Zap className="h-3 w-3 text-gc-success shrink-0" />
              <p className="text-[10px] text-gc-success/80 font-medium">
                Push notifications active on this device
              </p>
              <Smartphone className="h-3 w-3 text-gc-success/40 ml-auto shrink-0" />
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 rounded-lg bg-gc-danger/8 border border-gc-danger/20 px-3 py-2">
              <AlertTriangle className="h-3 w-3 text-gc-danger shrink-0 mt-0.5" />
              <p className="text-[10px] text-gc-danger/80">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
