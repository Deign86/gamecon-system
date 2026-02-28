import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * ConfirmDialog — styled replacement for window.confirm().
 *
 * Props:
 *  open       — boolean
 *  onClose    — cancel / dismiss callback
 *  onConfirm  — confirm callback (fires then auto-closes)
 *  title      — heading text (default: "Confirm Action")
 *  message    — body text / description
 *  confirmLabel — confirm button text (default: "Confirm")
 *  cancelLabel  — cancel button text (default: "Cancel")
 *  variant    — "danger" | "warning" | "default" (controls accent color)
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
}) {
  const overlayRef = useRef(null);

  /* ── Escape key + body scroll lock ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── Variant styles ── */
  const accent =
    variant === "danger"  ? { ring: "gc-danger",  bg: "gc-danger",  iconBg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" } :
    variant === "warning" ? { ring: "gc-warning", bg: "gc-warning", iconBg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.25)" } :
                            { ring: "gc-crimson",  bg: "gc-crimson",  iconBg: "rgba(200,16,46,0.12)", border: "rgba(200,16,46,0.25)" };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          ref={overlayRef}
          onClick={(e) => e.target === overlayRef.current && onClose?.()}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-lg border border-gc-steel/40 bg-gc-night shadow-2xl shadow-black/60 overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* Top accent bar */}
            <div
              className={cn("h-[2px] w-full", {
                "bg-gradient-to-r from-transparent via-gc-danger/60 to-transparent": variant === "danger",
                "bg-gradient-to-r from-transparent via-gc-warning/60 to-transparent": variant === "warning",
                "bg-gradient-to-r from-transparent via-gc-crimson/60 to-transparent": variant === "default",
              })}
            />

            {/* Body */}
            <div className="px-6 pt-6 pb-5">
              {/* Icon + Title */}
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: accent.iconBg, border: `1px solid ${accent.border}` }}
                >
                  <AlertTriangle className={cn("h-5 w-5", `text-${accent.ring}`)} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="font-display text-lg font-bold tracking-wider text-gc-white leading-tight">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm font-body text-gc-cloud/80 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t border-gc-steel/25 bg-gc-void/40 px-6 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gc-steel/40 bg-gc-iron px-4 py-2 text-xs font-display font-bold tracking-wider text-gc-mist transition-colors hover:border-gc-steel hover:text-gc-cloud hover:bg-gc-steel/30"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => { onConfirm?.(); onClose?.(); }}
                className={cn(
                  "rounded-md px-4 py-2 text-xs font-display font-bold tracking-wider text-white transition-all",
                  variant === "danger"  && "bg-gc-danger hover:bg-gc-danger/80 shadow-lg shadow-gc-danger/20",
                  variant === "warning" && "bg-gc-warning hover:bg-gc-warning/80 text-gc-void shadow-lg shadow-gc-warning/20",
                  variant === "default" && "bg-gc-crimson hover:bg-gc-scarlet shadow-lg shadow-gc-crimson/20",
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
