/**
 * OfflineGuard.jsx — Wraps features that require network connectivity.
 *
 * When offline and the wrapped feature is network-dependent:
 *   - Modal variant: replaces modal content with a tactical "UNAVAILABLE" screen
 *   - Inline variant: shows a compact badge overlay on the card/trigger
 *
 * Usage:
 *   <OfflineGuard requires="network" label="Create User">
 *     <CreateUserForm />
 *   </OfflineGuard>
 *
 * If `requires` is "cache" (default), children render normally even offline.
 */

import { motion } from "motion/react";
import { WifiOff, ShieldOff, CloudOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

/**
 * @param {object} props
 * @param {"cache"|"network"} props.requires — "network" = needs connectivity; "cache" = works offline
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
  const { isOnline } = useOnlineStatus();

  /* If online or feature works from cache, render children normally */
  if (isOnline || requires === "cache") {
    return children;
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
