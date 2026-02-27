import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, X, Users, Star } from "lucide-react";
import { cn, initials } from "../../lib/utils";

/**
 * Searchable dialog for adding an assignee to a committee shift.
 *
 * Props:
 *   open             – boolean
 *   onClose          – () => void
 *   committeeName    – display name of the committee
 *   committeeColor   – hex colour string
 *   allMembers       – [{ userId, name }]  — all committee members from `users`
 *   suggestedMembers – [{ userId, name }]  — members suggested from role schedule
 *   alreadyAssigned  – [{ userId, name }]  — people already on this shift
 *   onSelect         – (user: { userId, name }) => void
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
  const inputRef = useRef(null);

  // Auto-focus search on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Set of already-assigned user IDs for quick lookup
  const assignedSet = useMemo(
    () => new Set(alreadyAssigned.map((a) => a.userId)),
    [alreadyAssigned]
  );

  // Set of suggested user IDs
  const suggestedSet = useMemo(
    () => new Set(suggestedMembers.map((m) => m.userId)),
    [suggestedMembers]
  );

  // Filter candidates based on search, split into suggested vs others
  const { suggested, others } = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = allMembers.filter((m) => {
      if (assignedSet.has(m.userId)) return false; // already on shift
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

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-2 pb-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-sm rounded-2xl border border-gc-steel/60 bg-gc-night shadow-2xl shadow-black/40 overflow-hidden"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-gc-steel/40 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: committeeColor || "#C8102E" }}
              />
              <h3 className="font-display text-lg font-bold tracking-wide text-gc-white truncate">
                ADD TO {committeeName?.toUpperCase()}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Search bar ── */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-mist" />
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

          {/* ── Member list ── */}
          <div className="max-h-[45vh] overflow-y-auto px-2 pb-3">
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
                      onSelect={() => {
                        onSelect(m);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other members section */}
            {others.length > 0 && (
              <div className="px-2 pt-2 pb-1">
                {suggested.length > 0 && (
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gc-mist mb-1.5">
                    <Users className="h-3 w-3" />
                    Other Committee Members (Role Sheet)
                  </p>
                )}
                <div className="space-y-1">
                  {others.map((m) => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      onSelect={() => {
                        onSelect(m);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {suggested.length === 0 && others.length === 0 && (
              <div className="py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-gc-mist/30 mb-2" />
                <p className="text-sm text-gc-mist/60">
                  {search
                    ? "No matching members found."
                    : "All members are already assigned."}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Individual member row ── */
function MemberRow({ member, isSuggested = false, onSelect }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
        isSuggested
          ? "bg-gc-warning/5 border border-gc-warning/15 hover:bg-gc-warning/10"
          : "bg-gc-iron/30 border border-gc-steel/20 hover:bg-gc-iron/60 hover:border-gc-steel/40"
      )}
    >
      {/* Avatar */}
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
          isSuggested
            ? "bg-gc-warning/15 text-gc-warning"
            : "bg-gc-steel/40 text-gc-mist"
        )}
      >
        {initials(member.name)}
      </span>

      {/* Name */}
      <span className="flex-1 truncate text-sm font-body font-medium text-gc-cloud">
        {member.name}
      </span>

      {/* Add icon */}
      <UserPlus
        className={cn(
          "h-4 w-4 shrink-0",
          isSuggested ? "text-gc-warning" : "text-gc-mist"
        )}
      />
    </motion.button>
  );
}
