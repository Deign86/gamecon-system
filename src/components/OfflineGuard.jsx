/**
 * OfflineGuard.jsx — Wraps features that require network connectivity.
 *
 * When offline and the wrapped feature is network-dependent:
 *   - Modal variant: replaces modal content with a tactical "UNAVAILABLE" screen
 *   - Inline variant: shows a compact badge overlay on the card/trigger
 *   - Queued variant: renders children with an amber "OFFLINE — changes queued" banner
 *
 * Usage:
 *   <OfflineGuard requires="network" label="Create User">
 *     <CreateUserForm />
 *   </OfflineGuard>
 *
 *   <OfflineGuard requires="queue" label="Attendance">
 *     <AttendanceList />   {/* form still works; writes queued by Firestore SDK *\/}
 *   </OfflineGuard>
 *
 * If `requires` is "cache" (default), children render normally even offline.
 */

import { motion, AnimatePresence } from "motion/react";
import { WifiOff, ShieldOff, CloudOff, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

/**
 * @param {object} props
 * @param {"cache"|"network"|"queue"} props.requires
 *   "network" = blocks when offline
 *   "queue"   = allows writes offline (Firestore SDK queues); shows amber banner
 *   "cache"   = always renders children (default)
 * @param {string} props.label — human-readable feature name
 * @param {"modal"|"inline"} [props.variant="modal"] — display variant for the guard
 * @param {React.ReactNode} props.children
 * @param {() => void} [props.onClose] — optional callback for modal close / back action
 */
export default function OfflineGuard({
  requires = "cache",
  label = "This feature",
  variant = "modal",
  children,
  onClose,
}) {
  const { isOnline, pendingCount } = useOnlineStatus();

  /* If online or feature works from cache, render children normally */
  if (isOnline || requires === "cache") {
    return children;
  }

  /* Queued mode — render children with an amber offline warning banner */
  if (requires === "queue") {
    return <QueuedWrapper label={label} pendingCount={pendingCount}>{children}</QueuedWrapper>;
  }

  /* ── Network-required but offline ── */
  if (variant === "inline") {
    return <InlineGuard label={label} />;
  }

  return <ModalGuard label={label} onClose={onClose} />;
}

/* ─────────────────────────────────────────────
   Modal-level guard — replaces modal body
   ───────────────────────────────────────────── */
function ModalGuard({ label, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Icon cluster */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gc-danger/10 blur-xl animate-pulse" />
        <div className="relative flex items-center justify-center h-16 w-16 rounded-full border border-gc-danger/20 bg-gc-danger/[0.06]">
          <CloudOff className="h-7 w-7 text-gc-danger" />
        </div>
      </div>

      {/* Title */}
      <h3 className="font-display text-lg tracking-[0.15em] uppercase text-gc-danger mb-2">
        Unavailable Offline
      </h3>

      {/* Description */}
      <p className="font-body text-sm text-gc-mist leading-relaxed max-w-xs mb-1">
        <span className="text-gc-cloud font-medium">{label}</span> requires an
        active connection to the server.
      </p>
      <p className="font-body text-xs text-gc-mist/60 max-w-xs mb-6">
        This action will be available once signal is restored.
      </p>

      {/* Decorative line */}
      <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-gc-danger/40 to-transparent mb-6" />

      {/* Status chip */}
      <div className="inline-flex items-center gap-1.5 rounded border border-gc-danger/20 bg-gc-danger/[0.06] px-3 py-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gc-danger opacity-50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gc-danger" />
        </span>
        <WifiOff className="h-3 w-3 text-gc-danger/60" />
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-gc-danger/70">
          Signal Lost
        </span>
      </div>

      {/* Back button */}
      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 rounded border border-gc-steel bg-gc-iron/50 px-5 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-cloud hover:bg-gc-iron transition-colors"
        >
          Go Back
        </button>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Inline guard — overlay badge on a card/button
   ───────────────────────────────────────────── */
function InlineGuard({ label }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-8 px-4 text-center opacity-60">
      <ShieldOff className="h-5 w-5 text-gc-mist mb-2" />
      <span className="font-display text-[10px] tracking-[0.2em] uppercase text-gc-mist">
        {label}
      </span>
      <span className="font-mono text-[8px] tracking-wider text-gc-mist/50 mt-0.5">
        REQUIRES CONNECTION
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   QueuedWrapper — amber "offline mode" banner
   above children. Writes still work via Firestore
   SDK persistent cache; this just communicates
   the queued state to the user.
   ───────────────────────────────────────────── */
function QueuedWrapper({ label, pendingCount, children }) {
  return (
    <div className="space-y-0">
      {/* Amber offline-mode banner */}
      <AnimatePresence>
        <motion.div
          key="queue-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 rounded-t border border-gc-warning/20 bg-gc-warning/[0.05] px-3 py-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gc-warning opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gc-warning" />
            </span>
            <CloudUpload className="h-3.5 w-3.5 text-gc-warning shrink-0" />
            <div className="min-w-0">
              <span className="font-display text-[11px] tracking-[0.15em] uppercase text-gc-warning font-bold">
                Offline Mode
              </span>
              <span className="ml-2 font-mono text-[9px] text-gc-warning/60">
                — {label} changes will auto-sync when signal returns
              </span>
            </div>
            {pendingCount > 0 && (
              <span className="ml-auto shrink-0 rounded bg-gc-warning/15 border border-gc-warning/25 px-1.5 py-0.5 font-mono text-[9px] text-gc-warning/80 tabular-nums">
                {pendingCount} PENDING
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Children still render and work */}
      <div className="rounded-b border border-t-0 border-gc-warning/10 bg-transparent">
        {children}
      </div>
    </div>
  );
}
