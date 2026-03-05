import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, UserPlus, X, Users, UserX, Star, Check, Plus, Link2 } from "lucide-react";
import { cn, initials } from "../../lib/utils";

/**
 * Bulk-select dialog for adding assignees to a committee shift.
 * Members are toggled (modal stays open); a confirm bar shows the count
 * and submits all selections at once.
 *
 * Props:
 *   open             – boolean
 *   onClose          – () => void
 *   committeeName    – display name of the committee
 *   committeeColor   – hex colour string
 *   allMembers       – [{ userId, name }]  — all committee members from `users`
 *   suggestedMembers – [{ userId, name }]  — members suggested from role schedule
 *   alreadyAssigned  – [{ userId, name }]  — people already on this shift
 *   onSelect         – (members: { userId, name }[]) => void  — receives the full array
 */
export default function AddAssigneeDialog({
  open,
  onClose,
  committeeName,
  committeeColor,
  allMembers = [],
  suggestedMembers = [],
  alreadyAssigned = [],
  onSelect,
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const inputRef = useRef(null);

  // Reset selection + search each time dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIds(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Fast sets for lookups
  const assignedSet = useMemo(
    () => new Set(alreadyAssigned.map((a) => a.userId)),
    [alreadyAssigned]
  );

  const suggestedSet = useMemo(
    () => new Set(suggestedMembers.map((m) => m.userId)),
    [suggestedMembers]
  );

  // Filtered + split into suggested vs others
  const { suggested, others } = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = allMembers.filter((m) => {
      if (assignedSet.has(m.userId)) return false; // already on shift — hidden
      if (!q) return true;
      return m.name.toLowerCase().includes(q);
    });

    const sug = [];
    const oth = [];
    for (const m of filtered) {
      if (suggestedSet.has(m.userId)) sug.push(m);
      else oth.push(m);
    }
    return { suggested: sug, others: oth };
  }, [allMembers, search, assignedSet, suggestedSet]);

  // Fast lookup by userId for the confirm step
  const memberById = useMemo(() => {
    const map = {};
    for (const m of allMembers) map[m.userId] = m;
    return map;
  }, [allMembers]);

  const toggleMember = (m) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.userId)) next.delete(m.userId);
      else next.add(m.userId);
      return next;
    });
  };

  const handleConfirm = () => {
    const membersToAdd = [...selectedIds]
      .map((id) => memberById[id])
      .filter(Boolean);
    if (membersToAdd.length === 0) return;
    onSelect(membersToAdd);
    onClose();
  };

  const selectedCount = selectedIds.size;
  const accentColor = committeeColor || "#C8102E";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-assignee-overlay"
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm px-2 pb-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, pointerEvents: "auto" }}
          exit={{ opacity: 0, pointerEvents: "none" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="w-full max-w-sm rounded-lg border border-gc-steel/60 bg-gc-night shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 44, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            style={{ maxHeight: "85dvh" }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between border-b border-gc-steel/40 px-4 py-3"
              style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-gc-night"
                  style={{ backgroundColor: accentColor }}
                />
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold tracking-wider text-gc-white leading-none truncate">
                    ADD TO {committeeName?.toUpperCase()}
                  </h3>
                  <p className="font-body text-[10px] text-gc-mist mt-0.5">
                    Tap to select · confirm below
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {/* Selection count badge */}
                <AnimatePresence>
                  {selectedCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", damping: 18, stiffness: 350 }}
                      className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gc-crimson px-1.5 font-mono text-[11px] font-bold text-white leading-none"
                    >
                      {selectedCount}
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Search ── */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-mist pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="gc-input pl-9 text-sm"
                />
              </div>
            </div>

            {/* ── Member list (scrollable) ── */}
            <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2">
              {/* Suggested section */}
              {suggested.length > 0 && (
                <div className="px-2 pt-2 pb-1">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gc-warning mb-1.5">
                    <Star className="h-3 w-3" />
                    Scheduled This Day
                  </p>
                  <div className="space-y-1">
                    {suggested.map((m) => (
                      <MemberRow
                        key={m.userId}
                        member={m}
                        isSuggested
                        isSelected={selectedIds.has(m.userId)}
                        onToggle={() => toggleMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other committee members */}
              {others.length > 0 && (
                <div className="px-2 pt-2 pb-1">
                  {suggested.length > 0 && (
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gc-mist mb-1.5">
                      <Users className="h-3 w-3" />
                      Other Committee Members
                    </p>
                  )}
                  <div className="space-y-1">
                    {others.map((m) => (
                      <MemberRow
                        key={m.userId}
                        member={m}
                        isSelected={selectedIds.has(m.userId)}
                        onToggle={() => toggleMember(m)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {suggested.length === 0 && others.length === 0 && (() => {
                const q = search.toLowerCase().trim();
                const alreadyMatch = q
                  ? alreadyAssigned.some((a) =>
                      (a.name || "").toLowerCase().includes(q)
                    )
                  : false;

                if (alreadyMatch) {
                  return (
                    <div className="py-10 px-4 flex flex-col items-center gap-3 text-center">
                      <span className="flex items-center justify-center h-10 w-10 rounded-full bg-gc-iron border border-gc-steel/40 text-gc-success">
                        <Check className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-display tracking-wide text-gc-cloud">
                        Already on this shift.
                      </p>
                      <p className="text-xs font-body text-gc-mist max-w-xs leading-relaxed">
                        The person you searched for is already assigned to{" "}
                        <span className="text-gc-crimson font-semibold">{committeeName}</span>{" "}
                        for this block.
                      </p>
                    </div>
                  );
                }

                if (search) {
                  return (
                    <div className="py-10 px-4 flex flex-col items-center gap-3 text-center">
                      <span className="flex items-center justify-center h-10 w-10 rounded-full bg-gc-iron border border-gc-steel/40 text-gc-mist">
                        <UserX className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-display tracking-wide text-gc-cloud">
                        Not a member of {committeeName}.
                      </p>
                      <p className="text-xs font-body text-gc-mist max-w-xs leading-relaxed">
                        This list only shows people assigned to{" "}
                        <span className="text-gc-crimson font-semibold">{committeeName}</span>{" "}
                        in the Role Sheet. If they&rsquo;re not appearing, they haven&rsquo;t
                        been assigned to this committee yet &mdash; ask an{" "}
                        <span className="text-gc-crimson font-semibold">admin</span>{" "}
                        to add them under Role Tasking first.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="py-10 px-4 flex flex-col items-center gap-3 text-center">
                    <span className="flex items-center justify-center h-10 w-10 rounded-full bg-gc-iron border border-gc-steel/40 text-gc-mist">
                      <Users className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-display tracking-wide text-gc-cloud">
                      All members are already assigned.
                    </p>
                    <p className="text-xs font-body text-gc-mist max-w-xs leading-relaxed">
                      Everyone in{" "}
                      <span className="text-gc-crimson font-semibold">{committeeName}</span>{" "}
                      has been added to this shift block.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* ── Confirm bar ── */}
            <div className="shrink-0 border-t border-gc-steel/40 bg-gc-iron/60 px-4 py-3 flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="rounded border border-gc-steel/60 bg-transparent px-4 py-2 font-display text-sm tracking-wider text-gc-mist hover:text-gc-white hover:border-gc-steel transition-colors"
              >
                CANCEL
              </button>

              <motion.button
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                whileHover={selectedCount > 0 ? { scale: 1.02 } : {}}
                whileTap={selectedCount > 0 ? { scale: 0.97 } : {}}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded px-4 py-2 font-display text-sm tracking-wider transition-all",
                  selectedCount > 0
                    ? "bg-gc-crimson text-white hover:bg-gc-scarlet shadow-lg shadow-gc-crimson/25"
                    : "bg-gc-steel/25 text-gc-mist/50 cursor-not-allowed"
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                {selectedCount > 0
                  ? `ADD ${selectedCount} MEMBER${selectedCount !== 1 ? "S" : ""}`
                  : "SELECT MEMBERS"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Individual toggleable member row ── */
function MemberRow({ member, isSuggested = false, isSelected, onToggle }) {
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-all duration-150",
        isSelected
          ? "bg-gc-crimson/12 border border-gc-crimson/45"
          : isSuggested
          ? "bg-gc-warning/5 border border-gc-warning/15 hover:bg-gc-warning/10 hover:border-gc-warning/30"
          : "bg-gc-iron border border-gc-steel/50 hover:bg-gc-iron/80 hover:border-gc-steel"
      )}
    >
      {/* Avatar */}
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isSelected
            ? "bg-gc-crimson/25 text-gc-crimson"
            : isSuggested
            ? "bg-gc-warning/15 text-gc-warning"
            : "bg-gc-steel/40 text-gc-mist"
        )}
      >
        {initials(member.name)}
      </span>

      {/* Name */}
      <span
        className={cn(
          "flex-1 truncate text-sm font-body font-medium transition-colors",
          isSelected ? "text-gc-white" : "text-gc-cloud"
        )}
      >
        {member.name}
      </span>

      {/* Schedule tag (only when not selected) */}
      {isSuggested && !isSelected && (
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-gc-warning/70 bg-gc-warning/8 border border-gc-warning/15 rounded px-1.5 py-0.5">
          Today
        </span>
      )}

      {/* Check / Add icon — animated swap */}
      <AnimatePresence mode="wait" initial={false}>
        {isSelected ? (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 380 }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gc-crimson"
          >
            <Check className="h-3 w-3 text-white" />
          </motion.span>
        ) : (
          <motion.span
            key="plus"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <UserPlus
              className={cn(
                "h-4 w-4 shrink-0",
                isSuggested ? "text-gc-warning/60" : "text-gc-mist/60"
              )}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
