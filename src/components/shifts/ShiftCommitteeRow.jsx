import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserPlus,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, initials } from "../../lib/utils";
import { getShiftLimits } from "../../lib/shiftLimitsConfig";

/**
 * A single committee row in the shift board.
 *
 * Props:
 *   committee     – { id, name, color }
 *   shift         – Firestore shift doc or null
 *   isAdmin       – boolean
 *   currentUserId – uid of current user
 *   onAdd         – (committeeId) => void  — opens the add-assignee dialog
 *   dayBlock      – string (e.g. "d2-morning") for day-block-aware limits
 *   onRemove      – (shiftId, userId, userName) => void
 */
export default function ShiftCommitteeRow({
  committee,
  shift,
  isAdmin,
  currentUserId,
  dayBlock,
  onAdd,
  onRemove,
  highlighted = false,
  rowRef,
}) {
  const [expanded, setExpanded] = useState(true);
  const assignees = shift?.assignees || [];

  // Resolve limits dynamically from config (overrides stale stored values)
  const configLimits = getShiftLimits(committee.id, dayBlock);
  const minRequired = configLimits?.min ?? shift?.minRequired ?? shift?.requiredCount ?? 1;
  const maxAllowed = configLimits?.max ?? shift?.maxAllowed ?? shift?.requiredCount ?? Infinity;
  const underStaffed = assignees.length < minRequired;
  const isFull = assignees.length >= maxAllowed;
  const accentColor = committee.color || "#C8102E";

  /* ── Auto-expand when highlighted ── */
  useEffect(() => {
    if (highlighted && !expanded) setExpanded(true);
  }, [highlighted]);

  return (
    <motion.div
      ref={rowRef}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: highlighted
          ? [
              `0 0 0px ${accentColor}00`,
              `0 0 20px ${accentColor}50, 0 0 40px ${accentColor}25, inset 0 0 20px ${accentColor}08`,
              `0 0 0px ${accentColor}00`,
            ]
          : `0 0 0px ${accentColor}00`,
      }}
      transition={{
        boxShadow: highlighted
          ? { duration: 2.4, times: [0, 0.3, 1], ease: "easeInOut" }
          : { duration: 0.3 },
      }}
      className={cn(
        "rounded border overflow-hidden transition-colors duration-500",
        highlighted
          ? "border-gc-crimson/60 bg-gc-crimson/[0.06]"
          : "border-gc-steel/50 bg-gc-slate/80"
      )}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gc-iron/60 transition-colors"
      >
        {/* Colour dot */}
        <span
          className="h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-gc-night"
          style={{ backgroundColor: accentColor, ringColor: accentColor + "60" }}
        />

        {/* Name + count */}
        <div className="flex-1 min-w-0">
          <span className="font-display text-base font-bold tracking-wider text-gc-cloud">
            {committee.name}
          </span>
          <span className="ml-2 text-xs text-gc-mist font-body">
            {assignees.length}/{isFinite(maxAllowed) ? maxAllowed : "—"}
          </span>
        </div>

        {/* Status chip */}
        {underStaffed ? (
          <span className="flex items-center gap-1 rounded bg-gc-danger/12 border border-gc-danger/25 px-2 py-0.5 text-[10px] font-bold text-gc-danger">
            <AlertCircle className="h-3 w-3" />
            NEEDS {Math.max(0, minRequired - assignees.length)}
          </span>
        ) : isFull ? (
          <span className="flex items-center gap-1 rounded bg-gc-success/12 border border-gc-success/25 px-2 py-0.5 text-[10px] font-bold text-gc-success">
            <CheckCircle2 className="h-3 w-3" />
            FULL
          </span>
        ) : assignees.length === 0 && minRequired === 0 ? (
          <span className="flex items-center gap-1 rounded bg-gc-success/12 border border-gc-success/25 px-2 py-0.5 text-[10px] font-bold text-gc-success">
            <CheckCircle2 className="h-3 w-3" />
            OK
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded bg-gc-warning/12 border border-gc-warning/25 px-2 py-0.5 text-[10px] font-bold text-gc-warning">
            <AlertCircle className="h-3 w-3" />
            OPEN
          </span>
        )}

        {/* Chevron */}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gc-mist" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gc-mist" />
        )}
      </button>

      {/* ── Body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-gc-steel/50 px-4 py-3 space-y-2">
              {/* Assignee pills */}
              {assignees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignees.map((a) => {
                    const isMe = a.userId === currentUserId;
                    return (
                      <motion.span
                        key={a.userId}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-body font-medium transition-all",
                          isMe
                            ? "bg-gc-crimson/15 border-gc-crimson/40 text-gc-crimson"
                            : "bg-gc-iron/80 border-gc-steel/40 text-gc-cloud"
                        )}
                      >
                        {/* Avatar circle */}
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                            isMe
                              ? "bg-gc-crimson/25 text-gc-crimson"
                              : "bg-gc-steel/60 text-gc-mist"
                          )}
                        >
                          {initials(a.name)}
                        </span>
                        <span className="max-w-[120px] truncate">{a.name}</span>
                        {isMe && (
                          <span className="text-[9px] uppercase tracking-wider opacity-70">
                            You
                          </span>
                        )}

                        {/* Remove button (admin only) */}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(shift?.id, a.userId, a.name);
                            }}
                            className="ml-0.5 rounded p-0.5 text-gc-mist hover:text-gc-danger hover:bg-gc-danger/15 transition-colors"
                            title={`Remove ${a.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </motion.span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gc-hint italic">
                  No one assigned yet.
                </p>
              )}

              {/* Admin: Add button */}
              {isAdmin && (
                <button
                  onClick={() => onAdd(committee.id)}
                  disabled={isFull}
                  title={isFull ? `Max staff for this role reached (${maxAllowed})` : undefined}
                  className={cn(
                    "mt-1 inline-flex items-center gap-1.5 rounded border border-dashed px-3 py-1.5 text-xs font-body font-semibold transition-all",
                    isFull
                      ? "bg-gc-steel/30 border-gc-steel/30 text-gc-mist cursor-not-allowed"
                      : "border-gc-steel bg-gc-iron text-gc-mist hover:text-gc-crimson hover:border-gc-crimson/40 hover:bg-gc-crimson/5"
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {isFull ? "Full" : "Add Member"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
