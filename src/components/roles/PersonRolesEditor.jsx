import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, ChevronDown, Save, Loader2, Pencil } from "lucide-react";
import { cn } from "../../lib/utils";
import { COMMITTEE_NAMES, DAY_SLOTS } from "../../lib/roleConfig";
import {
  addAssignmentToPerson,
  removeAssignmentFromPerson,
} from "../../lib/rolesEditor";
import { logActivity } from "../../lib/auditLog";

/* ── Day pill colours ── */
const DAY_COLORS = {
  "DAY 1": "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/25",
  "DAY 2": "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "DAY1/2": "bg-gc-warning/15 text-gc-warning border-gc-warning/25",
};

/* ── Committee accent palette (matches RoleTasking) ── */
const PALETTE = [
  "#C8102E", "#3B82F6", "#22C55E", "#EAB308", "#A855F7",
  "#EC4899", "#F97316", "#06B6D4", "#10B981", "#6366F1",
  "#E11D48", "#84CC16", "#F59E0B", "#8B5CF6",
];
function committeeColor(name) {
  const idx = COMMITTEE_NAMES.indexOf(name);
  return PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
}

/* ── Source badge ── */
function SourceBadge({ source }) {
  const map = {
    excel:  { label: "EXCEL",  cls: "bg-blue-500/12 text-blue-400 border-blue-500/20" },
    manual: { label: "MANUAL", cls: "bg-gc-success/12 text-gc-success border-gc-success/20" },
    mixed:  { label: "MIXED",  cls: "bg-gc-warning/12 text-gc-warning border-gc-warning/20" },
  };
  const s = map[source] || map.manual;
  return (
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest", s.cls)}>
      {s.label}
    </span>
  );
}

/**
 * PersonRolesEditor
 *
 * Side-panel / inline editor shown when an admin clicks "Edit" on a person card.
 * Displays assignment pills with remove (x) and an add-assignment form.
 */
export default function PersonRolesEditor({ person, userId, onClose }) {
  const [adding, setAdding] = useState(false);
  const [newComm, setNewComm] = useState(COMMITTEE_NAMES[0]);
  const [newDay, setNewDay] = useState("DAY 1");
  const [busy, setBusy] = useState(null); // "add" | "remove-{idx}" | null
  const [addError, setAddError] = useState(null);

  /* ── add assignment ── */
  async function handleAdd() {
    if (busy) return;
    setBusy("add");
    setAddError(null);
    try {
      await addAssignmentToPerson(person.id, { committee: newComm, day: newDay }, userId);
      logActivity({
        action: "role.add_assignment",
        category: "role",
        details: `Assigned ${person.name} to ${newComm} (${newDay})`,
        meta: { personId: person.id, committee: newComm, day: newDay },
        userId,
        userName: person.name,
      });
      setAdding(false);
      setAddError(null);
    } catch (err) {
      setAddError(err.message || "Failed to add assignment");
    } finally {
      setBusy(null);
    }
  }

  /* ── remove assignment ── */
  async function handleRemove(assignment, idx) {
    if (busy) return;
    setBusy(`remove-${idx}`);
    try {
      await removeAssignmentFromPerson(person.id, assignment, userId);
      logActivity({
        action: "role.remove_assignment",
        category: "role",
        details: `Removed ${person.name} from ${assignment.committee} (${assignment.day})`,
        meta: { personId: person.id, committee: assignment.committee, day: assignment.day },
        userId,
        userName: person.name,
      });
    } catch (err) {
      // error handled silently — UI stays consistent
    } finally {
      setBusy(null);
    }
  }

  const assignments = person.assignments || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      className="rounded border border-gc-steel/50 bg-gc-night/95 backdrop-blur-md p-4 space-y-4 shadow-xl shadow-black/40"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${committeeColor(
              assignments[0]?.committee || ""
            )}, ${committeeColor(assignments[1]?.committee || assignments[0]?.committee || "")})`,
          }}
        >
          {(person.name || "?")[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate font-display text-lg font-bold tracking-wider text-gc-white">
            {person.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gc-mist">
              {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
            </span>
            <SourceBadge source={person.source} />
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Assignment pills ── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gc-mist">
          Assignments
        </p>

        {assignments.length === 0 && (
          <p className="py-3 text-center text-xs text-gc-hint italic">
            No assignments yet
          </p>
        )}

        <AnimatePresence mode="popLayout">
          {assignments.map((a, i) => (
            <motion.div
              key={`${a.committee}-${a.day}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="flex items-center gap-2 rounded border border-gc-steel/50 bg-gc-iron px-3 py-2"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: committeeColor(a.committee) }}
              />
              <span className="flex-1 text-xs font-medium text-gc-cloud truncate">
                {a.committee}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  DAY_COLORS[a.day] || "bg-gc-steel/30 text-gc-mist border-gc-steel/30"
                )}
              >
                {a.day}
              </span>
              <button
                disabled={!!busy}
                onClick={() => handleRemove(a, i)}
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-gc-mist hover:text-gc-danger hover:bg-gc-danger/10 transition-colors disabled:opacity-40"
                title="Remove assignment"
              >
                {busy === `remove-${i}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Add assignment ── */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gc-crimson hover:text-gc-scarlet transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add assignment
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2 overflow-hidden rounded border border-gc-crimson/20 bg-gc-crimson/5 p-3"
          onAnimationComplete={() => setAddError(null)}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-gc-crimson">
            New Assignment
          </p>

          {/* Committee select */}
          <div className="relative">
            <select
              value={newComm}
              onChange={(e) => { setNewComm(e.target.value); setAddError(null); }}
              className="gc-input appearance-none pr-8 text-xs cursor-pointer"
            >
              {COMMITTEE_NAMES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gc-mist" />
          </div>

          {/* Day select */}
          <div className="flex gap-1.5">
            {DAY_SLOTS.map((d) => (
              <button
                key={d}
                onClick={() => { setNewDay(d); setAddError(null); }}
                className={cn(
                  "flex-1 rounded px-2 py-1.5 text-[10px] font-bold border transition-all duration-200",
                  newDay === d
                    ? "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/30"
                    : "bg-gc-iron text-gc-mist border-gc-steel/50 hover:text-gc-cloud"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Redundancy warning */}
          {addError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded border border-gc-warning/30 bg-gc-warning/10 px-3 py-2 text-[11px] leading-snug text-gc-warning"
            >
              {addError}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!!busy}
              className="gc-btn-primary text-[11px] px-3 py-1.5 gap-1.5"
            >
              {busy === "add" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setAddError(null); }}
              className="gc-btn-ghost text-[11px] px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
