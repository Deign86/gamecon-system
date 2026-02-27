import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle } from "lucide-react";
import { COMMITTEES } from "../../data/seed";
import { createContribution, updateContribution } from "../../lib/contributionsFirestore";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";

/**
 * Convert a canonical committee name ("Proctors", "Documentation/Photographers", …)
 * or already-valid committee ID ("proctors", "documentation") to a seed.js ID.
 */
function resolveCommitteeId(name) {
  if (!name) return "";
  const n = name.toLowerCase().trim();
  const byId   = COMMITTEES.find((c) => c.id === n);
  if (byId) return byId.id;
  const byName = COMMITTEES.find((c) => c.name.toLowerCase() === n);
  if (byName) return byName.id;
  const firstWord = n.split(/[\s/&,-]+/)[0];
  const byFirst = COMMITTEES.find((c) =>
    c.name.toLowerCase().startsWith(firstWord) || c.id.startsWith(firstWord)
  );
  return byFirst?.id || "";
}

/**
 * Extract the default committee ID from a targetUser object.
 * Supports both:
 *   - roleAssignment shape: { assignments: [{committee: "Proctors", day}] }
 *   - legacy users shape:   { committees: [{committee: "proctors", day}] | "proctors" }
 */
function defaultCommitteeFor(targetUser) {
  if (!targetUser) return "";
  // roleAssignments shape
  if (Array.isArray(targetUser.assignments) && targetUser.assignments.length > 0) {
    return resolveCommitteeId(targetUser.assignments[0]?.committee || "");
  }
  // users shape
  if (Array.isArray(targetUser.committees) && targetUser.committees.length > 0) {
    const first = targetUser.committees[0];
    return resolveCommitteeId(typeof first === "string" ? first : first?.committee || "");
  }
  return resolveCommitteeId(targetUser.committee || "");
}

/**
 * ContributionFormModal
 *
 * Props:
 *   open        {boolean}
 *   onClose     {() => void}
 *   targetUser  {{ id, name, committees? }}   – the student this is logged FOR
 *   existing?   {object}  – if editing, pass the existing contribution doc
 */
export default function ContributionFormModal({ open, onClose, targetUser, existing }) {
  const { user } = useAuth();

  // Committee is derived from the person's imported assignments — not user-editable.
  // For edits, preserve the already-stored committee value.
  const committeeId = existing?.committee || defaultCommitteeFor(targetUser);
  const committeeName = COMMITTEES.find((c) => c.id === committeeId)?.name
    || (Array.isArray(targetUser?.assignments) && targetUser.assignments[0]?.committee)
    || "General";
  const committeeColor = COMMITTEES.find((c) => c.id === committeeId)?.color || "#64748B";

  const [task, setTask]       = useState(existing?.task || "");
  const [details, setDetails] = useState(existing?.details || existing?.description || "");
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTask(existing?.task || "");
      setDetails(existing?.details || existing?.description || "");
      setDone(false);
    }
  }, [open, existing, targetUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!task.trim() || !user) return;
    setBusy(true);
    try {
      if (existing?.id) {
        await updateContribution(existing.id, {
          task: task.trim(),
          details: details.trim(),
        });
      } else {
        await createContribution({
          userId:    targetUser.id,
          userName:  targetUser.name,
          committee: committeeId,
          task,
          details,
          loggedBy:  user.uid,
        });
      }
      setDone(true);
      setTimeout(() => { onClose(); }, 900);
    } catch (err) {
      console.error("ContributionFormModal error:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border border-gc-steel/30 bg-gc-void shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gc-steel/20 px-5 py-4">
              <div>
                <p className="font-display text-sm font-bold tracking-widest text-gc-mist uppercase">
                  {existing ? "Edit Contribution" : "Log Contribution"}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gc-mist/60">
                  For{" "}
                  <span className="font-semibold text-gc-cloud">
                    {targetUser?.name || "—"}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: `${committeeColor}18`,
                      color: committeeColor,
                      border: `1px solid ${committeeColor}30`,
                    }}
                  >
                    {committeeName}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gc-mist transition-colors hover:bg-gc-steel/20 hover:text-gc-cloud"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {/* Task */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gc-mist">
                  Task *
                </label>
                <input
                  type="text"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="gc-input"
                  placeholder="e.g. Set up banner stands"
                  required
                  autoFocus
                />
              </div>

              {/* Details */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gc-mist">
                  Details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="gc-input min-h-[72px] resize-none"
                  placeholder="Any additional context…"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gc-steel/30 px-4 py-2.5 text-sm font-semibold text-gc-mist transition-colors hover:bg-gc-steel/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !task.trim()}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all",
                    done
                      ? "bg-gc-success/80 text-white"
                      : "gc-btn-primary"
                  )}
                >
                  {done ? (
                    <><CheckCircle className="h-4 w-4" /> Saved!</>
                  ) : busy ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <><Send className="h-4 w-4" /> {existing ? "Save" : "Log"}</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
