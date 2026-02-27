import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  Users,
  ChevronRight,
  ChevronDown,
  Upload,
  ClipboardList,
  Calendar,
  X,
  Pencil,
  UserPlus,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { COMMITTEE_NAMES, DAY_SLOTS } from "../lib/roleConfig";
import {
  subscribeRoleAssignments,
  subscribeCommitteeSchedules,
} from "../lib/roleFirestore";
import Modal from "./Modal";
import ImportRoleSheet from "./ImportRoleSheet";
import PersonRolesEditor from "./roles/PersonRolesEditor";
import CommitteeScheduleEditor from "./roles/CommitteeScheduleEditor";
import AddPersonDialog from "./roles/AddPersonDialog";

/* ── animation variants ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 24, stiffness: 280 },
  },
};

/* ── tiny pill for a day slot ── */
function DayPill({ day }) {
  const colors = {
    "DAY 1": "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/25",
    "DAY 2": "bg-blue-500/15 text-blue-400 border-blue-500/25",
    "DAY1/2": "bg-gc-warning/15 text-gc-warning border-gc-warning/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        colors[day] || "bg-gc-steel/30 text-gc-mist border-gc-steel/30"
      )}
    >
      {day}
    </span>
  );
}

/* ── Committee colour strip on the left of cards ── */
const PALETTE = [
  "#C8102E", "#3B82F6", "#22C55E", "#EAB308", "#A855F7",
  "#EC4899", "#F97316", "#06B6D4", "#10B981", "#6366F1",
  "#E11D48", "#84CC16", "#F59E0B", "#8B5CF6",
];
function committeeColor(name) {
  const idx = COMMITTEE_NAMES.indexOf(name);
  return PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export default function RoleTasking() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  /* ── Firestore subscriptions (hooks MUST be called unconditionally) ── */
  const [persons, setPersons]     = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }

    let loaded = 0;
    const done = () => { if (++loaded >= 2) setLoading(false); };

    const unsub1 = subscribeRoleAssignments((docs) => {
      setPersons(docs);
      done();
    }, () => done());

    const unsub2 = subscribeCommitteeSchedules((docs) => {
      setSchedules(docs);
      done();
    }, () => done());

    return () => { unsub1(); unsub2(); };
  }, [isAdmin]);

  /* ── tab state ── */
  const [view, setView] = useState("person"); // "person" | "committee"

  /* ── modals ── */
  const [importOpen, setImportOpen]       = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);

  /* ── editing state ── */
  const [editingPerson, setEditingPerson]       = useState(null); // person id or null
  const [editingCommittee, setEditingCommittee] = useState(false);

  /* ── search / filter ── */
  const [search, setSearch]             = useState("");
  const [selectedComm, setSelectedComm] = useState(COMMITTEE_NAMES[0]);
  const [selectedDay, setSelectedDay]   = useState("DAY 1");

  /* ── person detail expand ── */
  const [expandedPerson, setExpandedPerson] = useState(null);

  /* ── derived data ── */
  const filteredPersons = useMemo(() => {
    if (!search.trim()) return persons;
    const q = search.toLowerCase();
    return persons.filter((p) => p.name.toLowerCase().includes(q));
  }, [persons, search]);

  const currentSchedule = useMemo(() => {
    if (selectedDay === "DAY1/2") {
      return schedules.find(
        (s) => s.committee === selectedComm && s.day === "DAY1/2"
      );
    }

    const exactMatch = schedules.find(
      (s) => s.committee === selectedComm && s.day === selectedDay
    );
    const bothDays = schedules.find(
      (s) => s.committee === selectedComm && s.day === "DAY1/2"
    );

    const members = [
      ...(exactMatch?.members || []),
      ...(bothDays?.members || []),
    ];

    if (members.length === 0) return undefined;

    return { committee: selectedComm, day: selectedDay, members };
  }, [schedules, selectedComm, selectedDay]);

  /* ── Admin gate — non-admins see nothing ── */
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gc-iron text-gc-mist">
          <ClipboardList className="h-8 w-8" />
        </div>
        <p className="font-display text-xl font-bold text-gc-cloud">ACCESS RESTRICTED</p>
        <p className="text-sm text-gc-mist">Only admins can view Role &amp; Tasking data.</p>
      </div>
    );
  }

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
        <span className="text-sm text-gc-mist font-medium">Loading role data…</span>
      </div>
    );
  }

  const isEmpty = persons.length === 0 && schedules.length === 0;

  return (
    <motion.div
      className="mx-auto max-w-5xl"
      initial="hidden"
      animate="show"
      variants={stagger}
    >
      {/* ── Header row ── */}
      <motion.div
        variants={itemVariant}
        className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-display text-3xl font-bold tracking-wider text-gc-white">
            ROLE <span className="text-gc-crimson text-shadow-red">&amp; TASKING</span>
          </h2>
          <p className="mt-0.5 text-xs text-gc-mist font-body">
            {persons.length} students &middot; {new Set(schedules.map((s) => s.committee)).size} committees
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2 self-start">
            <button
              onClick={() => setAddPersonOpen(true)}
              className="gc-btn-ghost gap-2 text-xs"
            >
              <UserPlus className="h-4 w-4" />
              Add Person
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="gc-btn-primary gap-2 text-xs"
            >
              <Upload className="h-4 w-4" />
              Import Sheet
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Tab switcher ── */}
      <motion.div variants={itemVariant} className="mb-4 flex gap-1.5">
        {[
          { key: "person",    label: "By Person",    Icon: User },
          { key: "committee", label: "By Committee", Icon: Users },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200",
              view === key
                ? "bg-gc-crimson/15 text-gc-crimson border border-gc-crimson/30"
                : "bg-gc-iron text-gc-mist border border-gc-steel/60 hover:text-gc-cloud hover:bg-gc-iron/80"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </motion.div>

      {/* ── Empty state ── */}
      {isEmpty && (
        <motion.div
          variants={itemVariant}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gc-iron text-gc-mist">
            <ClipboardList className="h-8 w-8" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-gc-cloud">NO DATA YET</p>
            <p className="mt-1 text-sm text-gc-mist">
              Upload a Role &amp; Tasking sheet to get started.
            </p>
          </div>
          <button
            onClick={() => setImportOpen(true)}
            className="gc-btn-primary gap-2 text-xs mt-2"
          >
            <Upload className="h-4 w-4" />
            Import Sheet
          </button>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════
          TAB 1: BY PERSON
         ═══════════════════════════════════════ */}
      {!isEmpty && view === "person" && (
        <motion.div
          key="person-view"
          initial="hidden"
          animate="show"
          variants={stagger}
          className="space-y-3"
        >
          {/* Search */}
          <motion.div variants={itemVariant} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-mist" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="gc-input pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gc-mist hover:text-gc-cloud"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>

          {/* Result count */}
          <motion.p variants={itemVariant} className="text-[11px] text-gc-mist font-medium">
            Showing {filteredPersons.length} of {persons.length}
          </motion.p>

          {/* Person cards */}
          <motion.div variants={stagger} className="space-y-2">
            {filteredPersons.map((person) => {
              const isExpanded = expandedPerson === person.name;
              const isEditing  = editingPerson === person.id;
              return (
                <motion.div
                  key={person.name}
                  variants={itemVariant}
                  className="gc-card overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedPerson(isExpanded ? null : person.name)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${committeeColor(
                          person.assignments?.[0]?.committee || ""
                        )}, ${committeeColor(
                          person.assignments?.[1]?.committee || person.assignments?.[0]?.committee || ""
                        )})`,
                      }}
                    >
                      {(person.name || "?")[0].toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gc-cloud">
                        {person.name}
                      </p>
                      <p className="text-[10px] text-gc-mist">
                        {person.assignments?.length || 0} assignment{(person.assignments?.length || 0) !== 1 ? "s" : ""}
                        {person.source && (
                          <span className={cn(
                            "ml-1.5 inline-flex items-center rounded-full border px-1.5 py-px text-[8px] font-bold uppercase tracking-widest",
                            person.source === "excel"  ? "bg-blue-500/12 text-blue-400 border-blue-500/20" :
                            person.source === "mixed"  ? "bg-gc-warning/12 text-gc-warning border-gc-warning/20" :
                                                         "bg-gc-success/12 text-gc-success border-gc-success/20"
                          )}>
                            {person.source}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Admin edit toggle */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPerson(isEditing ? null : person.id);
                        }}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors mr-1",
                          isEditing
                            ? "bg-gc-crimson/20 text-gc-crimson"
                            : "text-gc-mist hover:text-gc-crimson hover:bg-gc-crimson/10"
                        )}
                        title="Edit assignments"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gc-mist" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gc-mist" />
                    )}
                  </button>

                  {/* ── Read-only assignment list ── */}
                  <AnimatePresence initial={false}>
                    {isExpanded && !isEditing && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gc-steel/30 px-4 py-3 space-y-2">
                          {(person.assignments || []).map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2.5"
                            >
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ background: committeeColor(a.committee) }}
                              />
                              <span className="text-xs text-gc-cloud flex-1">
                                {a.committee}
                              </span>
                              <DayPill day={a.day} />
                            </div>
                          ))}
                          {(person.assignments || []).length === 0 && (
                            <p className="text-xs text-gc-hint italic">No assignments</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Inline editor panel (admin only) ── */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gc-crimson/20 px-3 py-3">
                          <PersonRolesEditor
                            person={person}
                            userId={profile?.id || user?.uid}
                            onClose={() => setEditingPerson(null)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredPersons.length === 0 && (
            <p className="py-10 text-center text-sm text-gc-mist">
              No students match &ldquo;{search}&rdquo;
            </p>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════
          TAB 2: BY COMMITTEE
         ═══════════════════════════════════════ */}
      {!isEmpty && view === "committee" && (
        <motion.div
          key="comm-view"
          initial="hidden"
          animate="show"
          variants={stagger}
          className="space-y-4"
        >
          {/* Committee + Day selectors */}
          <motion.div
            variants={itemVariant}
            className="flex flex-col gap-2 sm:flex-row sm:gap-3"
          >
            {/* Committee dropdown */}
            <div className="relative flex-1">
              <select
                value={selectedComm}
                onChange={(e) => setSelectedComm(e.target.value)}
                className="gc-input appearance-none pr-8 cursor-pointer"
              >
                {COMMITTEE_NAMES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-mist" />
            </div>

            {/* Day pills */}
            <div className="flex gap-1.5">
              {DAY_SLOTS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-xs font-semibold border transition-all duration-200",
                    selectedDay === d
                      ? "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/30"
                      : "bg-gc-iron text-gc-mist border-gc-steel/60 hover:text-gc-cloud"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Committee header card */}
          <motion.div
            variants={itemVariant}
            className="gc-card-accent overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: committeeColor(selectedComm) }}
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold tracking-wide text-gc-white">
                  {selectedComm.toUpperCase()}
                </h3>
                <p className="text-xs text-gc-mist">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {selectedDay} &middot; {currentSchedule?.members?.length || 0} member{(currentSchedule?.members?.length || 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Admin edit toggle */}
          {isAdmin && (
            <motion.div variants={itemVariant} className="flex justify-end">
              <button
                onClick={() => setEditingCommittee(!editingCommittee)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all duration-200",
                  editingCommittee
                    ? "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/30"
                    : "bg-gc-iron text-gc-mist border-gc-steel/60 hover:text-gc-cloud hover:bg-gc-iron/80"
                )}
              >
                <Pencil className="h-3 w-3" />
                {editingCommittee ? "Done Editing" : "Edit Members"}
              </button>
            </motion.div>
          )}

          {/* Read-only member list */}
          {!editingCommittee && (
            <>
              {currentSchedule?.members?.length > 0 ? (
                <motion.div variants={stagger} className="grid gap-2 sm:grid-cols-2">
                  {currentSchedule.members.map((name, i) => (
                    <motion.div
                      key={name}
                      variants={itemVariant}
                      className="flex items-center gap-3 rounded-xl border border-gc-steel/60 bg-gc-iron px-4 py-3"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${committeeColor(selectedComm)}, ${committeeColor(selectedComm)}cc)`,
                        }}
                      >
                        {name[0]?.toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-medium text-gc-cloud">
                        {name}
                      </span>
                      <span className="ml-auto text-[10px] text-gc-mist font-mono">
                        #{i + 1}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="py-10 text-center text-sm text-gc-mist">
                  No members assigned to <strong>{selectedComm}</strong> on {selectedDay}.
                </p>
              )}
            </>
          )}

          {/* Admin committee editor */}
          {editingCommittee && isAdmin && (
            <motion.div variants={itemVariant}>
              <CommitteeScheduleEditor
                committee={selectedComm}
                day={selectedDay}
                members={currentSchedule?.members || []}
                allPersons={persons}
                userId={profile?.id || user?.uid}
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── Import modal ── */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="IMPORT ROLE & TASKING"
        wide
      >
        <ImportRoleSheet onDone={() => setImportOpen(false)} />
      </Modal>

      {/* ── Add Person modal ── */}
      <AddPersonDialog
        open={addPersonOpen}
        onClose={() => setAddPersonOpen(false)}
        userId={profile?.id || user?.uid}
      />
    </motion.div>
  );
}

