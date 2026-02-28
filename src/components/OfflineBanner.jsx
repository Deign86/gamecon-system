/**
 * OfflineBanner.jsx — Tactical connectivity status indicator for PlayVerse Ops.
 *
 * Shows a slim, animated banner below TopNav when:
 *   (a) device is offline — crimson "SIGNAL LOST" bar with scan-line pulse
 *   (b) device is back online with queued items — amber "SYNCING" bar
 *   (c) just reconnected — brief green "LINK RESTORED" flash
 *
 * Expandable: tap to reveal what works / doesn't work offline.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  WifiOff,
  RefreshCw,
  CloudOff,
  Wifi,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
} from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

/* ── Offline capability matrix ── */
const CAN_DO = [
  "View cached dashboard data",
  "Browse headcounts, shifts, attendance",
  "Read contributions & tasks",
  "Log attendance (auto-syncs later)",
  "Update task status",
  "Record contributions",
];
const CANNOT_DO = [
  "Create new user accounts",
  "Delete user accounts",
  "Reset system data",
  "Send password reset emails",
  "Receive push notifications",
];

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, replayNow } = useOnlineStatus();
  const [expanded, setExpanded] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  const showOffline = !isOnline;
  const showSyncing = isOnline && (pendingCount > 0 || isSyncing);

  /* Flash "LINK RESTORED" briefly when coming back online */
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setExpanded(false);
    }
    if (isOnline && wasOffline.current) {
      wasOffline.current = false;
      setShowRestored(true);
      const id = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(id);
    }
  }, [isOnline]);

  const showBanner = showOffline || showSyncing || showRestored;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          key="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="overflow-hidden relative z-30"
        >
          {showOffline ? (
            /* ══════════════════════════════════════════
               OFFLINE — SIGNAL LOST
               ══════════════════════════════════════════ */
            <div className="relative">
              {/* Animated scan-line pulse across top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
                <div className="h-full w-[200%] bg-gradient-to-r from-transparent via-gc-danger to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
              </div>

              {/* Main bar */}
              <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="w-full flex items-center justify-center gap-2.5 bg-gc-danger/[0.08] border-b border-gc-danger/20 px-4 py-2.5 transition-colors hover:bg-gc-danger/[0.12] cursor-pointer"
              >
                {/* Pulsing dot */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gc-danger opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gc-danger" />
                </span>

                <WifiOff className="h-3.5 w-3.5 text-gc-danger" />

                <span className="font-display text-[11px] tracking-[0.2em] uppercase text-gc-danger font-bold">
                  Signal Lost
                </span>

                <span className="font-mono text-[9px] text-gc-danger/60 tracking-wider">
                  — OFFLINE MODE ACTIVE
                </span>

                {pendingCount > 0 && (
                  <span className="ml-1 rounded bg-gc-danger/15 border border-gc-danger/25 px-1.5 py-0.5 font-mono text-[9px] text-gc-danger/80 tabular-nums">
                    {pendingCount} QUEUED
                  </span>
                )}

                {expanded ? (
                  <ChevronUp className="h-3 w-3 text-gc-danger/50 ml-auto" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-gc-danger/50 ml-auto" />
                )}
              </button>

              {/* Expanded info panel */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-gc-void/95 border-b border-gc-steel/30"
                  >
                    <div className="px-4 py-4 max-w-lg mx-auto">
                      {/* Section header */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="h-[1px] flex-1 bg-gc-steel/20" />
                        <span className="font-display text-[9px] tracking-[0.25em] uppercase text-gc-hint">
                          Operational Status
                        </span>
                        <span className="h-[1px] flex-1 bg-gc-steel/20" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* CAN DO */}
                        <div className="rounded border border-gc-success/15 bg-gc-success/[0.04] p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-gc-success" />
                            <span className="font-display text-[10px] tracking-[0.2em] uppercase text-gc-success font-bold">
                              Available
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {CAN_DO.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-1.5 text-[11px] font-body text-gc-cloud/80 leading-snug"
                              >
                                <span className="mt-1 h-1 w-1 rounded-full bg-gc-success shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* CAN'T DO */}
                        <div className="rounded border border-gc-danger/15 bg-gc-danger/[0.04] p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ShieldOff className="h-3.5 w-3.5 text-gc-danger" />
                            <span className="font-display text-[10px] tracking-[0.2em] uppercase text-gc-danger font-bold">
                              Unavailable
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {CANNOT_DO.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-1.5 text-[11px] font-body text-gc-cloud/60 leading-snug"
                              >
                                <span className="mt-1 h-1 w-1 rounded-full bg-gc-danger/60 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Queue status footer */}
                      {pendingCount > 0 && (
                        <div className="mt-3 flex items-center gap-2 rounded border border-gc-warning/15 bg-gc-warning/[0.04] px-3 py-2">
                          <CloudOff className="h-3 w-3 text-gc-warning shrink-0" />
                          <span className="font-mono text-[10px] text-gc-warning/80">
                            {pendingCount} operation{pendingCount > 1 ? "s" : ""} will auto-sync when signal returns
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : showSyncing ? (
            /* ══════════════════════════════════════════
               SYNCING — reconnected with pending items
               ══════════════════════════════════════════ */
            <div className="relative">
              {/* Animated progress line */}
              <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
                <div className="h-full w-[200%] bg-gradient-to-r from-transparent via-gc-warning to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
              </div>

              <div className="flex items-center justify-center gap-2.5 bg-gc-warning/[0.07] border-b border-gc-warning/20 px-4 py-2.5">
                {isSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 text-gc-warning animate-spin" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5 text-gc-warning" />
                )}

                <span className="font-display text-[11px] tracking-[0.2em] uppercase text-gc-warning font-bold">
                  {isSyncing ? "Syncing" : "Pending Sync"}
                </span>

                {pendingCount > 0 && (
                  <span className="rounded bg-gc-warning/15 border border-gc-warning/25 px-1.5 py-0.5 font-mono text-[9px] text-gc-warning/80 tabular-nums">
                    {pendingCount} ITEM{pendingCount > 1 ? "S" : ""}
                  </span>
                )}

                {!isSyncing && (
                  <button
                    onClick={replayNow}
                    className="ml-2 rounded border border-gc-warning/30 bg-gc-warning/10 px-2.5 py-1 font-display text-[9px] tracking-[0.15em] uppercase text-gc-warning hover:bg-gc-warning/20 transition-colors"
                  >
                    Retry Now
                  </button>
                )}
              </div>
            </div>
          ) : showRestored ? (
            /* ══════════════════════════════════════════
               LINK RESTORED — brief success flash
               ══════════════════════════════════════════ */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2.5 bg-gc-success/[0.07] border-b border-gc-success/20 px-4 py-2.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-gc-success" />
              <span className="font-display text-[11px] tracking-[0.2em] uppercase text-gc-success font-bold">
                Link Restored
              </span>
              <Wifi className="h-3 w-3 text-gc-success/60" />
            </motion.div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
