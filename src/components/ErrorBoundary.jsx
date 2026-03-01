import { Component, useEffect, useRef } from "react";
import { AlertTriangle, WifiOff, RefreshCw, Signal, CloudOff, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

/**
 * Detect if an error is network/offline related.
 */
function isOfflineError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("unavailable") ||
    msg.includes("dynamically imported module") ||
    code === "unavailable" ||
    code === "resource-exhausted" ||
    !navigator.onLine
  );
}

/**
 * Inner class-based boundary. Use NetworkAwareErrorBoundary (default export)
 * or ModalErrorBoundary for modal containment in most cases.
 */
export class CoreErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  /**
   * For non-modal offline errors: React.lazy caches the failed module
   * import — calling reset() alone just re-throws immediately. The only
   * reliable fix is a page reload which clears the module registry.
   *
   * For modal offline errors: close the modal instead. The lazy component
   * tree gets fully unmounted, so the next open triggers a fresh import().
   */
  handleOfflineRetry = () => {
    if (this.props.modal) {
      // Close the modal — unmounts the lazy tree; user can reopen when online
      this.props.onClose?.();
      this.reset();
    } else {
      // Reload the page to purge React.lazy's cached rejection
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const offline = isOfflineError(this.state.error);

      if (offline) {
        /* ── Offline-specific error view with auto-retry logic ── */
        return (
          <OfflineErrorView
            onRetry={this.handleOfflineRetry}
            onClose={this.props.onClose}
            modal={this.props.modal}
          />
        );
      }

      /* ── Generic error view ── */
      return (
        <div
          className={
            this.props.modal
              ? "flex flex-col items-center justify-center py-16 px-6 text-center"
              : "flex min-h-screen flex-col items-center justify-center gap-4 bg-gc-void gc-noise px-6 text-center"
          }
        >
          {!this.props.modal && (
            <>
              <div className="fixed top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-gc-crimson/15 pointer-events-none" />
              <div className="fixed bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-gc-crimson/15 pointer-events-none" />
            </>
          )}

          <div className="h-16 w-16 rounded bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-gc-white">
            SYSTEM <span className="text-gc-crimson text-shadow-red">ERROR</span>
          </h1>
          <p className="max-w-md text-sm text-gc-mist font-body mt-1">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <p className="text-[9px] font-mono text-gc-hint tracking-wider mt-2">
            ERR_BOUNDARY_CATCH
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={this.reset}
              className="rounded border border-gc-steel bg-gc-iron/50 px-5 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-cloud hover:bg-gc-iron transition-colors"
            >
              Retry
            </button>
            {!this.props.modal && (
              <button
                onClick={() => window.location.reload()}
                className="gc-btn-primary text-sm px-6 py-2"
              >
                RELOAD SYSTEM
              </button>
            )}
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                className="rounded border border-gc-steel bg-gc-iron/50 px-5 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-cloud hover:bg-gc-iron transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─────────────────────────────────────────────────────────────
   OfflineErrorView — rendered by CoreErrorBoundary when offline.

   Two recovery strategies:
   • modal=false  – full-page error. React.lazy caches the failed
     import(), so reset() alone re-throws instantly. Fix: reload the
     page to clear the module registry. Auto-fires when online returns.
   • modal=true   – error is scoped to a modal. Fix: close the modal
     so the lazy tree is fully unmounted. On next open the user is
     (presumably) online and the fresh import() succeeds.
   ───────────────────────────────────────────────────────────── */
function OfflineErrorView({ onRetry, onClose, modal }) {
  const { isOnline } = useOnlineStatus();
  const retriedRef   = useRef(false);

  /**
   * Non-modal: auto-reload when connectivity returns.
   * Modal: do nothing automatically — user chooses to close/retry.
   */
  useEffect(() => {
    if (!modal && isOnline && !retriedRef.current) {
      retriedRef.current = true;
      // Brief delay so the network stack fully re-initialises before reload
      const id = setTimeout(() => window.location.reload(), 1000);
      return () => clearTimeout(id);
    }
  }, [isOnline, modal]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Icon */}
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-gc-danger/10 blur-xl animate-pulse" />
        <div className="relative flex items-center justify-center h-14 w-14 rounded-full border border-gc-danger/20 bg-gc-danger/[0.06]">
          <WifiOff className="h-6 w-6 text-gc-danger" />
        </div>
      </div>

      {/* Title */}
      <h2 className="font-display text-xl tracking-[0.15em] uppercase text-gc-danger mb-2">
        Connection Lost
      </h2>

      {/* Body */}
      <p className="font-body text-sm text-gc-mist leading-relaxed max-w-xs mb-1">
        This feature failed to load because the server is unreachable.
      </p>
      <p className="font-body text-xs text-gc-mist/50 max-w-xs mb-5">
        {modal
          ? "Close this panel and try again once signal returns."
          : "The app will reload automatically when signal returns."}
      </p>

      {/* Live status chip */}
      <AnimatePresence mode="wait">
        {isOnline ? (
          <motion.div
            key="online"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded border border-gc-success/25 bg-gc-success/[0.06] px-3 py-2 mb-5"
          >
            <Signal className="h-3.5 w-3.5 text-gc-success animate-pulse" />
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-gc-success">
              {modal ? "Signal restored" : "Signal restored — reloading…"}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="offline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 rounded border border-gc-danger/15 bg-gc-danger/[0.04] px-3 py-2 mb-5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gc-danger opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gc-danger" />
            </span>
            <CloudOff className="h-3 w-3 text-gc-danger/60" />
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-gc-danger/70">
              {modal ? "Waiting for signal" : "Waiting for signal — will auto-reload"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center gap-2.5">
        {modal ? (
          /* Modal: close the modal so the lazy tree unmounts cleanly */
          <>
            {onClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded border border-gc-steel bg-gc-iron/50 px-4 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-cloud hover:bg-gc-iron transition-colors"
              >
                <X className="h-3 w-3" />
                Close Panel
              </button>
            )}
            {isOnline && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded border border-gc-crimson/30 bg-gc-crimson/10 px-4 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-crimson hover:bg-gc-crimson hover:text-white transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}
          </>
        ) : (
          /* Full-page: only reliable fix is a reload to clear module cache */
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded border border-gc-crimson/30 bg-gc-crimson/10 px-4 py-2 font-display text-xs tracking-[0.12em] uppercase text-gc-crimson hover:bg-gc-crimson hover:text-white transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reload App
          </button>
        )}
      </div>

      <p className="mt-4 text-[9px] font-mono text-gc-hint tracking-wider">
        ERR_NETWORK_OFFLINE
      </p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NetworkAwareErrorBoundary — default export.
   Full-page boundary (for wrapping tab views).
   ───────────────────────────────────────────────────────────── */
export default function NetworkAwareErrorBoundary({ children, onReset }) {
  return (
    <CoreErrorBoundary onReset={onReset}>
      {children}
    </CoreErrorBoundary>
  );
}

/**
 * ModalErrorBoundary — boundary scoped to a modal body.
 * Shows Connection Lost / errors inside the modal, not full-page.
 * Pass `onClose` to provide a "Go Back" button inside the error view.
 *
 * @param {{ children: React.ReactNode, onClose?: () => void }} props
 */
export function ModalErrorBoundary({ children, onClose }) {
  return (
    <CoreErrorBoundary modal onClose={onClose}>
      {children}
    </CoreErrorBoundary>
  );
}
