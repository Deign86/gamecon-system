import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search, UserPlus, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { COMMITTEE_NAMES } from "../../lib/roleConfig";
import {
  addMemberToCommitteeSchedule,
  removeMemberFromCommitteeSchedule,
  slugify,
} from "../../lib/rolesEditor";

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

/**
 * CommitteeScheduleEditor
 *
 * Shown alongside the committee view when admin enables editing.
 * Allows removing existing members and adding new ones (existing or brand-new person).
 */
export default function CommitteeScheduleEditor({
  committee,
  day,
  members = [],
  allPersons = [],
  userId,
}) {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(null); // "add" | "add-new" | "remove-<name>" | null
  const [showAdd, setShowAdd] = useState(false);

  /* ── filter persons not already in this committee/day ── */
  const suggestions = useMemo(() => {
    const currentSet = new Set(members.map((m) => m.toLowerCase()));
    const q = search.toLowerCase().trim();
    return allPersons
      .filter((p) => !currentSet.has(p.name.toLowerCase()))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allPersons, members, search]);

  /* ── remove member ── */
  async function handleRemove(name) {
    if (busy) return;
    setBusy(`remove-${name}`);
    try {
      await removeMemberFromCommitteeSchedule(committee, day, name, userId);
    } catch (err) {
      // error handled silently
    } finally {
      setBusy(null);
    }
  }

  /* ── add existing person ── */
  async function handleAddExisting(person) {
    if (busy) return;
    setBusy("add");
    try {
      await addMemberToCommitteeSchedule(committee, day, person, userId);
      setSearch("");
    } catch (err) {
      // error handled silently
    } finally {
      setBusy(null);
    }
  }

  /* ── add brand-new person ── */
  async function handleAddNew() {
    const trimmed = newName.trim();
    if (!trimmed || busy) return;
    setBusy("add-new");
    try {
      const id = slugify(trimmed);
      await addMemberToCommitteeSchedule(committee, day, { id, name: trimmed }, userId);
      setNewName("");
      setShowAdd(false);
    } catch (err) {
      // error handled silently
    } finally {
      setBusy(null);
    }
  }

  const accentColor = committeeColor(committee);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* ── Current members with remove ── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gc-mist">
          Members &middot; Edit
        </p>

        {members.length === 0 && (
          <p className="py-3 text-center text-xs text-gc-hint italic">
            No members assigned
          </p>
        )}

        <AnimatePresence mode="popLayout">
          {members.map((name, i) => (
            <motion.div
              key={name}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, x: -20 }}
              className="flex items-center gap-3 rounded border border-gc-steel/50 bg-gc-iron px-3 py-2"
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                }}
              >
                {name[0]?.toUpperCase()}
              </div>
              <span className="flex-1 truncate text-xs font-medium text-gc-cloud">
                {name}
              </span>
              <span className="text-[9px] text-gc-mist font-mono mr-1">
                #{i + 1}
              </span>
              <button
                disabled={!!busy}
                onClick={() => handleRemove(name)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-gc-mist hover:text-gc-danger hover:bg-gc-danger/10 transition-colors disabled:opacity-40"
                title={`Remove ${name}`}
              >
                {busy === `remove-${name}` ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Add member controls ── */}
      <div className="rounded border border-gc-crimson/20 bg-gc-crimson/5 p-3 space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gc-crimson">
          Add Member
        </p>

        {/* Search existing persons */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gc-mist" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search existing people…"
            className="gc-input pl-8 text-xs"
          />
        </div>

        {/* Suggestions dropdown */}
        {search.trim() && suggestions.length > 0 && (
          <div className="max-h-36 overflow-y-auto rounded border border-gc-steel/50 bg-gc-iron divide-y divide-gc-steel/40">
            {suggestions.map((p) => (
              <button
                key={p.id}
                disabled={!!busy}
                onClick={() => handleAddExisting(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gc-cloud hover:bg-gc-crimson/10 transition-colors disabled:opacity-40"
              >
                <Plus className="h-3 w-3 text-gc-crimson shrink-0" />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto text-[9px] text-gc-mist">
                  {p.assignments?.length || 0} role{(p.assignments?.length || 0) !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        {search.trim() && suggestions.length === 0 && (
          <p className="text-[10px] text-gc-hint italic px-1">
            No matching people found
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gc-steel/30" />
          <span className="text-[9px] text-gc-mist uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-gc-steel/30" />
        </div>

        {/* Create new person inline */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gc-crimson hover:text-gc-scarlet transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add new person
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
              placeholder="Full name…"
              className="gc-input text-xs flex-1"
              autoFocus
            />
            <button
              onClick={handleAddNew}
              disabled={!newName.trim() || !!busy}
              className="gc-btn-primary text-[10px] px-3 py-1.5 gap-1 shrink-0 disabled:opacity-40"
            >
              {busy === "add-new" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="gc-btn-ghost text-[10px] px-2 py-1.5 shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
