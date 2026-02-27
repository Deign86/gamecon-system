import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Pencil, Trash2, Shield, UserRound, ChevronRight, ClipboardList } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { COMMITTEES } from "../../data/seed";
import { subscribeRoleAssignments } from "../../lib/roleFirestore";
import { fmtDate, initials, cn } from "../../lib/utils";
import {
  subscribeContributionsByUser,
  deleteContribution,
} from "../../lib/contributionsFirestore";
import ContributionFormModal from "./ContributionFormModal";

const CAN_WRITE_ROLES = ["admin", "proctor", "head", "committee-head"];

/**
 * Map a canonical committee name (from roleAssignments, e.g. "Proctors",
 * "Documentation/Photographers") to a seed.js committee ID ("proctors",
 * "documentation"). Falls back to empty string if nothing matches.
 */
function committeeNameToId(name) {
  if (!name) return "";
  const n = name.toLowerCase().trim();
  // 1. exact id
  const byId = COMMITTEES.find((c) => c.id === n);
  if (byId) return byId.id;
  // 2. exact display name
  const byName = COMMITTEES.find((c) => c.name.toLowerCase() === n);
  if (byName) return byName.id;
  // 3. first significant word (handles "Documentation/Photographers" → "documentation")
  const firstWord = n.split(/[\s/&,-]+/)[0];
  const byFirst = COMMITTEES.find((c) =>
    c.name.toLowerCase().startsWith(firstWord) ||
    c.id.startsWith(firstWord)
  );
  return byFirst?.id || "";
}

export default function PersonContributionView({ myEntriesOnly }) {
  const { user, profile } = useAuth();
  const canWrite = CAN_WRITE_ROLES.includes(profile?.role);
  const isAdmin  = profile?.role === "admin";

  /* ── Imported roster (roleAssignments) ─────────────── */
  const [allPeople, setAllPeople]       = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  useEffect(() => {
    const unsub = subscribeRoleAssignments((docs) => {
      setAllPeople(docs);
      setLoadingPeople(false);
    });
    return unsub;
  }, []);

  /* ── Search / selection ─────────────────────────────── */
  const [search, setSearch]           = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPeople.filter(
      (p) => !q || p.name?.toLowerCase().includes(q)
    );
  }, [allPeople, search]);

  /* ── Contributions for selected user ───────────────── */
  const [contribs, setContribs]       = useState([]);
  const [loadingC, setLoadingC]       = useState(false);

  useEffect(() => {
    if (!selectedUser) { setContribs([]); return; }
    setLoadingC(true);
    const unsub = subscribeContributionsByUser(selectedUser.id, (docs) => {
      setContribs(docs);
      setLoadingC(false);
    });
    return unsub;
  }, [selectedUser?.id]);

  // "My Entries" filter override (passed from ContributionTabs)
  const displayedContribs = myEntriesOnly
    ? contribs.filter((c) => c.loggedBy === user?.uid)
    : contribs;

  /* ── Modal state ────────────────────────────────────── */
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null); // existing doc or null

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(c) {
    setEditing(c);
    setModalOpen(true);
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete "${c.task}"? This cannot be undone.`)) return;
    await deleteContribution(c.id);
  }

  /* ── Helpers ────────────────────────────────────────── */
  function personCommitteeId(person) {
    // roleAssignment persons have assignments[].committee = canonical name
    const first = Array.isArray(person?.assignments) && person.assignments.length > 0
      ? person.assignments[0]?.committee
      : null;
    return committeeNameToId(first || "");
  }
  function committeeLabel(id) {
    return COMMITTEES.find((c) => c.id === id)?.name || "General";
  }
  function committeeColor(id) {
    return COMMITTEES.find((c) => c.id === id)?.color || "#64748B";
  }
  function canEditEntry(c) {
    return isAdmin || c.loggedBy === user?.uid;
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col sm:flex-row gap-4 h-full min-h-0">
      {/* ── Left: People list ───────────────────── */}
      <div
        className={cn(
          "flex flex-col gap-2 shrink-0",
          selectedUser ? "hidden sm:flex sm:w-56 lg:w-64" : "flex w-full sm:w-56 lg:w-64"
        )}
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gc-hint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gc-input pl-8 text-sm"
            placeholder="Search classmate…"
          />
        </div>

        {/* User list */}
        <div className="flex-1 space-y-1 overflow-y-auto max-h-[55vh] sm:max-h-[calc(100vh-280px)] pr-0.5">
          {loadingPeople ? (
            <div className="flex justify-center py-8">
              <span className="h-5 w-5 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
            </div>
          ) : filteredPeople.length === 0 ? (
            <p className="text-center text-sm text-gc-hint py-6">
              {allPeople.length === 0 ? "No roster imported yet." : "No match."}
            </p>
          ) : (
            filteredPeople.map((p) => {
              const active  = selectedUser?.id === p.id;
              const commId  = personCommitteeId(p);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedUser(p)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all",
                    active
                      ? "bg-gc-crimson/15 border border-gc-crimson/40 text-gc-cloud"
                      : "border border-transparent bg-gc-iron text-gc-mist hover:border-gc-steel/50 hover:bg-gc-iron/80"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${committeeColor(commId)}, #1a1a2e)`,
                    }}
                  >
                    {initials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", active && "text-white")}>
                      {p.name}
                    </p>
                    {/* Show first committee assignment */}
                    <p className="text-[10px] font-mono text-gc-hint truncate">
                      {p.assignments?.[0]?.committee || "—"}
                    </p>
                  </div>
                  {active && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gc-crimson" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Contribution list ─────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gc-faded">
            <UserRound className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a classmate to view their contributions</p>
          </div>
        ) : (
          <>
            {/* Selected person header */}
            <div className="flex items-center gap-3 rounded-xl border border-gc-steel/50 bg-gc-iron px-4 py-3">
              {/* Back (mobile) */}
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="sm:hidden rounded-lg p-1 text-gc-mist hover:text-gc-cloud"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>

              <div
                className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${committeeColor(personCommitteeId(selectedUser))}, #1a1a2e)`,
                }}
              >
                {initials(selectedUser.name)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gc-white truncate">{selectedUser.name}</p>
                <p className="flex items-center gap-1 text-[10px] font-mono text-gc-hint">
                  <Shield className="h-2.5 w-2.5" />
                  {selectedUser.assignments?.[0]?.committee || "—"} · {displayedContribs.length} entr{displayedContribs.length === 1 ? "y" : "ies"}
                </p>
              </div>

              {canWrite && !myEntriesOnly && (
                <button
                  type="button"
                  onClick={openAdd}
                  className="gc-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>

            {/* Contributions list */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[50vh] sm:max-h-[calc(100vh-320px)] pr-0.5">
              {loadingC ? (
                <div className="flex justify-center py-10">
                  <span className="h-5 w-5 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
                </div>
              ) : displayedContribs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-gc-faded">
                  <ClipboardList className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No contributions logged yet.</p>
                  {canWrite && !myEntriesOnly && (
                    <button
                      type="button"
                      onClick={openAdd}
                      className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-gc-crimson/10 text-gc-crimson border border-gc-crimson/20 hover:bg-gc-crimson/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Log first entry
                    </button>
                  )}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {displayedContribs.map((c) => {
                    const color = committeeColor(c.committee);
                    const loggedByMe = c.loggedBy === user?.uid;
                    const editable   = canEditEntry(c);
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-start gap-3 rounded-xl border border-gc-steel/50 bg-gc-iron px-3.5 py-3"
                      >
                        {/* Committee dot */}
                        <div
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gc-cloud truncate">
                            {c.task}
                          </p>
                          {c.details && (
                            <p className="mt-0.5 text-xs text-gc-mist line-clamp-2">
                              {c.details}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: `${color}18`,
                                color,
                                border: `1px solid ${color}30`,
                              }}
                            >
                              {committeeLabel(c.committee)}
                            </span>
                            {loggedByMe && (
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-gc-crimson/10 text-gc-crimson border border-gc-crimson/20">
                                Logged by you
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-gc-hint">
                              {fmtDate(c.createdAt || c.timestamp)}
                            </span>
                          </div>
                        </div>
                        {/* Actions */}
                        {editable && !myEntriesOnly && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="rounded-lg p-1.5 text-gc-mist transition-colors hover:bg-gc-steel/20 hover:text-gc-cloud"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              className="rounded-lg p-1.5 text-gc-mist transition-colors hover:bg-gc-danger/20 hover:text-gc-danger"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <ContributionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        targetUser={selectedUser}
        existing={editing}
      />
    </div>
  );
}
