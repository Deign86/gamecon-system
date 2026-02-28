import { useEffect, useRef, useId, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Modal — state-driven mount/unmount with motion animations.
 *
 * Avoids AnimatePresence to prevent the React 18 "ref is not a prop"
 * warning that motion's internal PresenceChild/PopChild triggers.
 * Instead, a `mounted` flag keeps the DOM around long enough for
 * the exit animation to play, then unmounts via onAnimationComplete.
 */
export default function Modal({ open, onClose, title, children, wide = false }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);
  const titleId = useId();
  const [mounted, setMounted] = useState(open);

  onCloseRef.current = onClose;
  openRef.current = open;

  // Mount immediately when open becomes true
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";

    // Restore focus on close
    const prevFocused = document.activeElement;

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      if (prevFocused && typeof prevFocused.focus === "function") {
        prevFocused.focus();
      }
    };
  }, [open]);

  // Focus trap — keep Tab cycling within the modal
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Auto-focus first focusable element
    requestAnimationFrame(() => {
      const first = dialog.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });

    const trap = (e) => {
      if (e.key !== "Tab") return;
      const focusable = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);

  if (!mounted) return null;

  return (
    <motion.div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-2 pb-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={open ? { opacity: 1 } : { opacity: 0, pointerEvents: "none" }}
      transition={{ duration: 0.18 }}
      onAnimationComplete={() => {
        if (!openRef.current) setMounted(false);
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full rounded-md border border-gc-steel/40 bg-gc-night shadow-2xl shadow-black/50 overflow-hidden",
          wide ? "max-w-2xl" : "max-w-md"
        )}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
      >
        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gc-crimson/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gc-steel/30 px-5 py-3.5">
          <h2
            id={titleId}
            className="font-display text-xl font-bold tracking-[0.1em] text-gc-white"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
