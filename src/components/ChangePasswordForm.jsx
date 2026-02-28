import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, WifiOff } from "lucide-react";
import { changePassword } from "../lib/changePassword";
import { logActivity } from "../lib/auditLog";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { cn } from "../lib/utils";

/**
 * Password change form — renders inside the Profile view.
 * Uses Firebase re-auth + updatePassword under the hood.
 */
export default function ChangePasswordForm() {
  const { user, profile } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showCur, setShowCur]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [status, setStatus]     = useState("idle"); // idle | loading | success | error
  const [error, setError]       = useState("");

  /* ── validation ── */
  const tooShort  = next.length > 0 && next.length < 8;
  const mismatch  = confirm.length > 0 && next !== confirm;
  const canSubmit = isOnline && current.length > 0 && next.length >= 8 && next === confirm && status !== "loading";

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setError("");

    try {
      await changePassword(current, next);
      logActivity({
        action: "auth.password_change",
        category: "auth",
        details: `User changed their own password`,
        userId: user?.uid || "unknown",
        userName: profile?.name || "Unknown",
      });
      setStatus("success");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  /* ── reset after success ── */
  const reset = () => {
    setStatus("idle");
    setError("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-gc-crimson" />
        <h3 className="font-display text-base font-bold tracking-wider text-gc-mist">
          CHANGE PASSWORD
        </h3>
      </div>

      {/* Offline notice */}
      {!isOnline && (
        <div className="flex items-center gap-2 rounded border border-gc-steel/30 bg-gc-iron/30 px-3 py-2.5 text-[11px] font-body text-gc-mist/60">
          <WifiOff className="h-3.5 w-3.5 text-gc-mist/40 shrink-0" />
          <span>Password change requires an active connection</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Success state ── */}
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-6"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded bg-gc-success/15">
              <CheckCircle2 className="h-6 w-6 text-gc-success" />
            </div>
            <p className="text-sm font-semibold text-gc-success">Password updated successfully</p>
            <button onClick={reset} className="gc-btn-ghost text-xs mt-1">
              Done
            </button>
          </motion.div>
        )}

        {/* ── Form ── */}
        {status !== "success" && (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit}
            className="space-y-3"
          >
          {/* Hidden username field — tells password managers which account this is for */}
          <input type="text" name="username" autoComplete="username" className="sr-only" aria-hidden="true" tabIndex={-1} readOnly />

          {/* Current password */}
          <div className="relative">
            <label htmlFor="cp-current" className="sr-only">Current password</label>
            <input
              id="cp-current"
              name="current-password"
              type={showCur ? "text" : "password"}
              value={current}
              onChange={(e) => { setCurrent(e.target.value); setStatus("idle"); }}
              placeholder="Current password"
              className="gc-input pr-10"
              autoComplete="current-password"
            />
              <button
                type="button"
                onClick={() => setShowCur(!showCur)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gc-mist hover:text-gc-cloud transition-colors"
                tabIndex={-1}
              >
                {showCur ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>

            {/* New password */}
            <div className="relative">
              <label htmlFor="cp-new" className="sr-only">New password</label>
              <input
                id="cp-new"
                name="new-password"
                type={showNew ? "text" : "password"}
                value={next}
                onChange={(e) => { setNext(e.target.value); setStatus("idle"); }}
                placeholder="New password (min 8 characters)"
                className={cn("gc-input pr-10", tooShort && "border-gc-warning focus:border-gc-warning")}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gc-mist hover:text-gc-cloud transition-colors"
                tabIndex={-1}
              >
                {showNew ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              {tooShort && (
                <p className="mt-1 text-[11px] text-gc-warning">Must be at least 8 characters</p>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label htmlFor="cp-confirm" className="sr-only">Confirm new password</label>
              <input
                id="cp-confirm"
                name="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setStatus("idle"); }}
                placeholder="Confirm new password"
                className={cn("gc-input", mismatch && "border-gc-danger focus:border-gc-danger")}
                autoComplete="new-password"
              />
              {mismatch && (
                <p className="mt-1 text-[11px] text-gc-danger">Passwords don't match</p>
              )}
            </div>

            {/* Error banner */}
            {status === "error" && error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 rounded border border-gc-danger/30 bg-gc-danger/10 p-3 text-sm text-gc-danger"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "gc-btn-primary w-full",
                !canSubmit && "opacity-40 cursor-not-allowed hover:transform-none hover:shadow-none"
              )}
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
