import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { resetSystemData } from "../lib/resetSystemData";
import { cn } from "../lib/utils";

const CONFIRMATION_PHRASE = "RESET GAMECON";

/**
 * Admin-only panel for resetting all event data.
 * Requires the user to type a confirmation phrase before proceeding.
 */
export default function AdminResetPanel() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [open, setOpen]           = useState(false);
  const [phrase, setPhrase]       = useState("");
  const [status, setStatus]       = useState("idle"); // idle | loading | done | error
  const [progress, setProgress]   = useState("");
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");

  if (!isAdmin) return null;

  const confirmed = phrase.trim().toUpperCase() === CONFIRMATION_PHRASE;

  const handleReset = async () => {
    if (!confirmed) return;
    setStatus("loading");
    setProgress("Contacting server…");
    setError("");

    try {
      const res = await resetSystemData();
      setProgress(`Reset complete — ${res.total ?? 0} documents cleared.`);
      setResult(res);
      setStatus("done");
    } catch (err) {
      setError(err.message || "Reset failed.");
      setStatus("error");
    }
  };

  const close = () => {
    setOpen(false);
    setPhrase("");
    setStatus("idle");
    setProgress("");
    setResult(null);
    setError("");
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-gc-danger/30 bg-gc-danger/8 px-4 py-3 text-sm font-semibold text-gc-danger transition-all hover:bg-gc-danger/15 hover:border-gc-danger/50 w-full"
      >
        <Trash2 className="h-4 w-4" />
        Reset System Data
      </button>

      {/* Overlay modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-2 pb-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && status !== "loading" && close()}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-md rounded-2xl border border-gc-danger/30 bg-gc-night shadow-2xl shadow-black/40 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gc-danger/20 bg-gc-danger/5 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-gc-danger" />
                  <h2 className="font-display text-xl font-bold tracking-wide text-gc-danger">
                    DANGER ZONE
                  </h2>
                </div>
                {status !== "loading" && (
                  <button
                    onClick={close}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <AnimatePresence mode="wait">
                  {/* ── IDLE / ERROR: show confirmation form ── */}
                  {(status === "idle" || status === "error") && (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-start gap-3 rounded-lg border border-gc-warning/30 bg-gc-warning/8 p-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-gc-warning shrink-0" />
                        <div className="text-xs text-gc-cloud leading-relaxed">
                          <p className="font-semibold text-gc-warning mb-1">This will permanently delete:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-gc-mist">
                            <li>All headcounts</li>
                            <li>All contributions</li>
                            <li>All expenses</li>
                            <li>All shifts</li>
                            <li>All incidents</li>
                            <li>All role assignments &amp; committee schedules</li>
                          </ul>
                          <p className="mt-2 text-gc-warning font-semibold">This action cannot be undone.</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gc-mist mb-1.5">
                          Type <span className="text-gc-danger font-bold">{CONFIRMATION_PHRASE}</span> to confirm
                        </label>
                        <input
                          type="text"
                          value={phrase}
                          onChange={(e) => setPhrase(e.target.value)}
                          placeholder={CONFIRMATION_PHRASE}
                          className={cn(
                            "gc-input font-mono text-center tracking-widest",
                            confirmed && "border-gc-danger focus:border-gc-danger"
                          )}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>

                      {/* Error */}
                      {status === "error" && error && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-start gap-2 rounded-lg border border-gc-danger/30 bg-gc-danger/10 p-3 text-sm text-gc-danger"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      <div className="flex gap-3 pt-1">
                        <button onClick={close} className="gc-btn-ghost flex-1 text-xs">
                          Cancel
                        </button>
                        <button
                          onClick={handleReset}
                          disabled={!confirmed}
                          className={cn(
                            "flex-1 gc-btn text-xs font-bold text-white",
                            confirmed
                              ? "bg-gc-danger hover:bg-red-600 shadow-lg shadow-gc-danger/30"
                              : "bg-gc-steel/40 text-gc-mist cursor-not-allowed"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Everything
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── LOADING ── */}
                  {status === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-3 py-8"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-gc-danger" />
                      <p className="text-sm font-medium text-gc-mist">Resetting system data…</p>
                      {progress && (
                        <p className="text-xs text-gc-mist/70 font-mono">{progress}</p>
                      )}
                    </motion.div>
                  )}

                  {/* ── DONE ── */}
                  {status === "done" && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-6"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gc-success/15">
                        <CheckCircle2 className="h-7 w-7 text-gc-success" />
                      </div>
                      <div className="text-center">
                        <p className="font-display text-lg font-bold text-gc-white">RESET COMPLETE</p>
                        <p className="mt-1 text-sm text-gc-mist">
                          {result?.total || 0} documents deleted across all collections.
                        </p>
                      </div>
                      <button onClick={close} className="gc-btn-ghost text-xs mt-1">
                        Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
