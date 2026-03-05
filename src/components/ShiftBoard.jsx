import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Users,
  ChevronsRight,
  Zap,
} from "lucide-react";
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { ShiftBoardSkeleton } from "./Skeleton";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { SHIFT_BLOCKS, COMMITTEES } from "../lib/constants";
import { COMMITTEE_NAMES } from "../lib/roleConfig";
import { cn } from "../lib/utils";
import {
  subscribeShiftsForBlock,
  getShiftsForBlock,
  addAssigneeToShift,
  removeAssigneeFromShift,
  initialiseBlockShifts,
} from "../lib/shiftFirestore";
import {
  subscribeCommitteeSchedules,
  subscribeRoleAssignments,
} from "../lib/roleFirestore";
import ShiftCommitteeRow from "./shifts/ShiftCommitteeRow";
import AddAssigneeDialog from "./shifts/AddAssigneeDialog";
import ConfirmDialog from "./ConfirmDialog";
import { logActivity } from "../lib/auditLog";
import { useToast } from "./Toast";
import { exportShifts } from "../lib/exportExcel";

/* ── Map shift-block IDs to role-schedule DAY labels ── */
function blockToDay(blockId) {
  if (blockId.startsWith("d1")) return "DAY 1";
  if (blockId.startsWith("d2")) return "DAY 2";
  return null;
}

/* ── Return the other block on the same day (morning ↔ afternoon) ── */
function siblingBlock(blockId) {
  if (blockId === "d1-morning")   return "d1-afternoon";
  if (blockId === "d1-afternoon") return "d1-morning";
  if (blockId === "d2-morning")   return "d2-afternoon";
  if (blockId === "d2-afternoon") return "d2-morning";
  return null;
}

/* ── Map seed COMMITTEES ids to roleConfig committee names (fuzzy) ── */
const COMMITTEE_ROLE_MAP = {
  proctors:        "Proctors",
  marketing:       "Marketing",
  creatives:       "Creatives",
  "awards-prizes": "Awards & Prizes",
  documentation:   "Documentation/Photographers",
  "crowd-control": "Crowd Control",
  exhibitors:      "Exhibitors",
  "venue-design":  "Venue Designer & Management",
  ticketing:       "Ticketing",
  voting:          "Voting",
  "guest-relations": "Guest Relations Officers",
  technical:       "Technical Committee",
  esports:         ["E-Sport Organizers", "Esports Technical", "Shoutcaster"],
};

/* Helper: check if a committee name matches the map entry (string or array) */
function matchesRoleNames(scheduleCommittee, roleNames) {
  if (Array.isArray(roleNames)) return roleNames.includes(scheduleCommittee);
  return scheduleCommittee === roleNames;
}

/* ── Stagger variants ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export default function ShiftBoard({ highlightCommittee }) {
  const toast = useToast();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const canManageShifts = isAdmin || profile?.role === "proctor";

  /* ── active block state ── */
  const [activeBlock, setActiveBlock] = useState(SHIFT_BLOCKS[0]?.id || "");

  // Determine which block is "now"
  const now = new Date();
  const currentBlock = SHIFT_BLOCKS.find((b) => {
    const start = new Date(`${b.date}T${b.start}:00`);
    const end   = new Date(`${b.date}T${b.end}:00`);
    return now >= start && now <= end;
  });

  const displayBlock = activeBlock || currentBlock?.id || SHIFT_BLOCKS[0]?.id;

  /* ── committee shifts for the selected block (real-time) ── */
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  useEffect(() => {
    setLoadingShifts(true);
    const unsub = subscribeShiftsForBlock(displayBlock, (docs) => {
      setShifts(docs);
      setLoadingShifts(false);
    });
    return unsub;
  }, [displayBlock]);

  /* ── users collection (only for UID resolution) ── */
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  /* ── committee schedules (from role Excel import — PRIMARY data source) ── */
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const unsub = subscribeCommitteeSchedules(
      (docs) => setSchedules(docs),
      () => setSchedules([])
    );
    return unsub;
  }, []);

  /* ── role assignments (person-centric, from Excel import) ── */
  const [roleAssignments, setRoleAssignments] = useState([]);

  useEffect(() => {
    const unsub = subscribeRoleAssignments(
      (docs) => setRoleAssignments(docs),
      () => setRoleAssignments([])
    );
    return unsub;
  }, []);

  /** Resolve a name string to { userId, name } — prefer real UID if user exists */
  const resolveUser = useCallback(
    (name) => {
      const found = allUsers.find(
        (u) => (u.name || "").toLowerCase().trim() === name.toLowerCase().trim()
      );
      return found
        ? { userId: found.id, name: found.name || found.email }
        : { userId: `_name_${name}`, name };
    },
    [allUsers]
  );

  /* ── build a lookup: committeeId → [ { userId, name } ] from role sheet (ALL days) ── */
  const membersByCommittee = useMemo(() => {
    const map = {};
    for (const c of COMMITTEES) {
      const roleName = COMMITTEE_ROLE_MAP[c.id];
      if (!roleName) { map[c.id] = []; continue; }

      const nameSet = new Set();

      // Crowd Control draws candidates from ALL committees
      if (c.id === "crowd-control") {
        for (const sched of schedules) {
          for (const name of sched.members || []) if (name.trim()) nameSet.add(name.trim());
        }
      } else {
        const matchingSchedules = schedules.filter((s) => matchesRoleNames(s.committee, roleName));
        for (const sched of matchingSchedules) {
          for (const name of sched.members || []) if (name.trim()) nameSet.add(name.trim());
        }
      }

      map[c.id] = [...nameSet].sort().map(resolveUser);
    }
    return map;
  }, [schedules, resolveUser]);

  /* ── build a lookup: committeeId → [ { userId, name } ] for THIS block's day (suggested) ── */
  const suggestedByCommittee = useMemo(() => {
    const dayLabel = blockToDay(displayBlock);
    const map = {};
    for (const c of COMMITTEES) {
      const roleName = COMMITTEE_ROLE_MAP[c.id];
      if (!roleName) { map[c.id] = []; continue; }

      const nameSet = new Set();
      // Crowd Control suggested members come from ALL committees for this day
      if (c.id === "crowd-control") {
        const daySchedules = schedules.filter(
          (s) => s.day === dayLabel || s.day === "DAY1/2"
        );
        for (const sched of daySchedules) {
          for (const name of sched.members || []) if (name.trim()) nameSet.add(name.trim());
        }
      } else {
        const matchingSchedules = schedules.filter(
          (s) => matchesRoleNames(s.committee, roleName) && (s.day === dayLabel || s.day === "DAY1/2")
        );
        for (const sched of matchingSchedules) {
          for (const name of sched.members || []) if (name.trim()) nameSet.add(name.trim());
        }
      }

      map[c.id] = [...nameSet].sort().map(resolveUser);
    }
    return map;
  }, [schedules, resolveUser, displayBlock]);

  /* ── quick-access map: committeeId → shift doc ── */
  const shiftMap = useMemo(() => {
    const m = {};
    for (const s of shifts) m[s.committeeId] = s;
    return m;
  }, [shifts]);

  /* ── admin: initialise block (create empty docs for all committees) ── */
  const [initialising, setInitialising] = useState(false);

  const handleInitialise = useCallback(async () => {
    if (!isAdmin || !user) return;
    setInitialising(true);
    try {
      await initialiseBlockShifts(displayBlock, COMMITTEES, user.uid);
      logActivity({
        action: "shift.initialise",
        category: "shift",
        details: `Initialised shift rows for block ${displayBlock}`,
        meta: { dayBlock: displayBlock },
        userId: user.uid,
        userName: profile?.name || "Admin",
      });
      toast("Shift rows created for all committees.", "success");
    } catch (err) {
      toast("Failed to initialise shifts.", "error");
    } finally {
      setInitialising(false);
    }
  }, [isAdmin, user, displayBlock, toast]);

  /* ── Committee row refs for scroll-to-highlight ── */
  const committeeRefs = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (!highlightCommittee || loadingShifts) return;
    // Small delay to let the DOM render the rows
    const timer = setTimeout(() => {
      const el = committeeRefs.current[highlightCommittee];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(highlightCommittee);
        // Remove highlight after animation completes
        const clearTimer = setTimeout(() => setHighlightedId(null), 2800);
        return () => clearTimeout(clearTimer);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightCommittee, loadingShifts]);

  /* ── Remove assignee confirm state ── */
  const [removeConfirm, setRemoveConfirm] = useState({
    open: false,
    shiftId: null,
    userId: null,
    userName: null,
  });

  /* ── Conflict warning state ── */
  const [conflictWarning, setConflictWarning] = useState({
    open: false,
    members: [],
    // Same block, different committee: [{ member, committees: string[] }]
    conflicts: [],
    // Same day, other block: [{ member, blockLabel: string, committees: string[] }]
    sameDayConflicts: [],
    committeeId: null,
  });

  /* ── Add assignee dialog state ── */
  const [addDialog, setAddDialog] = useState({ open: false, committeeId: null });

  const openAddDialog = useCallback(
    (committeeId) => setAddDialog({ open: true, committeeId }),
    []
  );
  const closeAddDialog = useCallback(
    () => setAddDialog({ open: false, committeeId: null }),
    []
  );

  /* ── Core write: actually add members to a shift ── */
  const doAddAssignees = useCallback(
    async (cId, members) => {
      const comm = COMMITTEES.find((c) => c.id === cId);
      if (!comm || !user) return;
      try {
        await Promise.all(
          members.map((member) =>
            addAssigneeToShift(displayBlock, cId, comm.name, member, user.uid)
          )
        );
        for (const member of members) {
          logActivity({
            action: "shift.add_assignee",
            category: "shift",
            details: `Added ${member.name} to ${comm.name} (${displayBlock})`,
            meta: { dayBlock: displayBlock, committeeId: cId, assignee: member.name },
            userId: user.uid,
            userName: profile?.name || "Admin",
          });
        }
        const label =
          members.length === 1
            ? `${members[0].name} added to ${comm.name}.`
            : `${members.length} members added to ${comm.name}.`;
        toast(label, "success");
      } catch (err) {
        toast("Failed to add assignee.", "error");
      }
    },
    [displayBlock, user, toast]
  );

  const handleAddAssignee = useCallback(
    async (membersInput) => {
      const cId = addDialog.committeeId;
      if (!cId || !user) return;
      const members = Array.isArray(membersInput) ? membersInput : [membersInput];
      if (members.length === 0) return;

      // ── Conflict detection 1: already in another committee THIS block ──
      const conflictMap = {};
      for (const member of members) {
        for (const shift of shifts) {
          if (shift.committeeId === cId) continue;
          if (shift.assignees?.some((a) => a.userId === member.userId)) {
            if (!conflictMap[member.userId]) {
              conflictMap[member.userId] = { member, committees: [] };
            }
            conflictMap[member.userId].committees.push(
              shift.committeeName || shift.committeeId
            );
          }
        }
      }
      const conflicts = Object.values(conflictMap);

      // ── Conflict detection 2: already assigned on the OTHER block of the same day ──
      const sameDayMap = {};
      const sibId = siblingBlock(displayBlock);
      if (sibId) {
        const sibShifts = await getShiftsForBlock(sibId);
        const sibLabel = SHIFT_BLOCKS.find((b) => b.id === sibId)?.label || sibId;
        for (const member of members) {
          for (const sShift of sibShifts) {
            if (sShift.assignees?.some((a) => a.userId === member.userId)) {
              if (!sameDayMap[member.userId]) {
                sameDayMap[member.userId] = { member, blockLabel: sibLabel, committees: [] };
              }
              sameDayMap[member.userId].committees.push(
                sShift.committeeName || sShift.committeeId
              );
            }
          }
        }
      }
      const sameDayConflicts = Object.values(sameDayMap);

      if (conflicts.length > 0 || sameDayConflicts.length > 0) {
        setConflictWarning({ open: true, members, conflicts, sameDayConflicts, committeeId: cId });
        return;
      }

      await doAddAssignees(cId, members);
    },
    [addDialog.committeeId, displayBlock, user, shifts, doAddAssignees]
  );

  // Step 1: open confirmation dialog
  const handleRemoveAssignee = useCallback(
    (shiftId, userId, userName) => {
      setRemoveConfirm({ open: true, shiftId, userId, userName });
    },
    []
  );

  // Step 2: confirmed — execute the Firestore removal
  const handleRemoveConfirmed = useCallback(async () => {
    const { shiftId, userId, userName } = removeConfirm;
    setRemoveConfirm((s) => ({ ...s, open: false }));
    if (!user || !shiftId || !userId) return;
    try {
      await removeAssigneeFromShift(shiftId, userId, user.uid);
      logActivity({
        action: "shift.remove_assignee",
        category: "shift",
        details: `Removed ${userName} from shift ${shiftId}`,
        meta: { shiftId, removedUserId: userId, removedUserName: userName },
        userId: user.uid,
        userName: profile?.name || "Admin",
      });
      toast(`${userName} removed from shift.`, "warning");
    } catch (err) {
      toast("Failed to remove assignee.", "error");
    }
  }, [removeConfirm, user, toast]);

  /* ── Summary stats ── */
  const { totalAssigned, underStaffedCount } = useMemo(() => {
    let total = 0;
    let under = 0;
    for (const c of COMMITTEES) {
      const s = shiftMap[c.id];
      const count = s?.assignees?.length || 0;
      total += count;
      if (count < (s?.minRequired ?? s?.requiredCount ?? 1)) under++;
    }
    // If no shifts exist yet, all committees are under-staffed
    if (shifts.length === 0) under = COMMITTEES.length;
    return { totalAssigned: total, underStaffedCount: under };
  }, [shiftMap, shifts]);

  /* ── The add-dialog's data derivation ── */
  const dialogCommittee = COMMITTEES.find((c) => c.id === addDialog.committeeId);
  const dialogShift = addDialog.committeeId ? shiftMap[addDialog.committeeId] : null;

  return (
    <div className="space-y-5">
      {/* ── Block tabs — 2×2 grid on mobile, scrollable row on sm+ ── */}
      {/* Mobile: tactical 2×2 grid — all 4 blocks visible without scroll */}
      <div className="grid grid-cols-2 gap-1.5 sm:hidden">
        {SHIFT_BLOCKS.map((block) => {
          const isActive  = displayBlock === block.id;
          const isCurrent = currentBlock?.id === block.id;
          return (
            <button
              key={block.id}
              onClick={() => setActiveBlock(block.id)}
              className={cn(
                "relative rounded border px-3 py-2.5 text-center overflow-hidden transition-all duration-200",
                isActive
                  ? "bg-gc-crimson/15 border-gc-crimson/40 text-gc-crimson"
                  : "bg-gc-iron border-gc-steel/50 text-gc-mist hover:text-gc-cloud hover:border-gc-steel"
              )}
            >
              {/* Active — crimson bottom bar indicator */}
              {isActive && (
                <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gc-crimson" />
              )}
              {/* Live-now dot */}
              {isCurrent && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gc-success animate-pulse" />
              )}
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-display text-[12px] font-bold tracking-[0.12em] uppercase leading-none">
                  {block.id.startsWith("d1") ? "Day 1" : "Day 2"}
                </span>
                <span className="font-mono text-[9px] leading-none mt-0.5 opacity-70 uppercase">
                  {block.id.includes("morning") ? "Morning" : "Afternoon"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {/* sm+: Scrollable single row */}
      <div className="hidden sm:flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SHIFT_BLOCKS.map((block) => {
          const isActive  = displayBlock === block.id;
          const isCurrent = currentBlock?.id === block.id;
          return (
            <button
              key={block.id}
              onClick={() => setActiveBlock(block.id)}
              className={cn(
                "shrink-0 rounded px-3 py-2 text-xs font-display tracking-[0.08em] uppercase transition-all border",
                isActive
                  ? "bg-gc-crimson/15 border-gc-crimson/40 text-gc-crimson"
                  : "bg-gc-iron border-gc-steel/60 text-gc-mist hover:text-gc-cloud hover:border-gc-steel"
              )}
            >
              {isCurrent && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gc-success animate-pulse" />
              )}
              {block.label}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="text-xs text-gc-mist px-1">
        Min. staff — Exhibitors: 2 · Ticketing/Voting: 3 · Crowd Control: 12 · Documentation: 2 · Guest Relations: 4 · Marketing: 2 · Awards (Day 2): 2
      </div>

      {/* ── Summary bar ── */}
      <div className="flex items-center justify-between rounded border border-gc-steel/60 bg-gc-iron px-4 py-2.5">
        <div className="flex items-center gap-4 text-xs font-body">
          <span className="flex items-center gap-1.5 text-gc-cloud">
            <Calendar className="h-3.5 w-3.5 text-gc-crimson" />
            {SHIFT_BLOCKS.find((b) => b.id === displayBlock)?.label}
          </span>
          <span className="text-gc-mist">
            {totalAssigned} assigned
          </span>
        </div>
        <div className="flex items-center gap-3">
          {shifts.length > 0 && (
            <button
              onClick={() => exportShifts(shifts, displayBlock, SHIFT_BLOCKS.find((b) => b.id === displayBlock)?.label)}
              className="flex items-center gap-1.5 rounded border border-gc-success/30 bg-gc-success/8 px-3 py-1 text-[10px] font-display tracking-wider text-gc-success hover:bg-gc-success/15 hover:border-gc-success/50 transition-colors"
              title="Export shifts to Excel"
            >
              <FileSpreadsheet className="h-3 w-3" />
              Export
            </button>
          )}
          {underStaffedCount > 0 ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-gc-danger">
              <AlertTriangle className="h-3 w-3" />
              {underStaffedCount} need{underStaffedCount > 1 ? "" : "s"} staff
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-gc-success">
              <CheckCircle2 className="h-3 w-3" />
              All committees staffed
            </span>
          )}
        </div>
      </div>

      {/* ── Loading state ── */}
      {loadingShifts ? (
        <ShiftBoardSkeleton />
      ) : shifts.length === 0 ? (
        /* ── Empty state ── */
        <div className="text-center py-10">
          <Clock className="mx-auto h-10 w-10 text-gc-faded mb-3" />
          {isAdmin ? (
            <>
              <p className="text-sm text-gc-mist mb-1">
                No shifts assigned for this block yet.
              </p>
              <p className="text-xs text-gc-hint mb-4">
                Start assigning committees below.
              </p>
              <button
                onClick={handleInitialise}
                disabled={initialising}
                className="gc-btn-primary text-xs gap-2"
              >
                {initialising ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {initialising ? "Creating…" : "Initialise All Committees"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gc-hint">
                No shifts assigned for this block yet.
              </p>
              <p className="text-xs text-gc-faded mt-1">
                Check back later — an admin will set up shift assignments.
              </p>
            </>
          )}
        </div>
      ) : (
        /* ── Committee rows ── */
        <motion.div
          className="space-y-2.5"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {COMMITTEES.map((committee) => {
            const shift = shiftMap[committee.id];
            // Only show committees that have a shift doc, or all if admin/proctor
            if (!shift && !canManageShifts) return null;
            return (
              <ShiftCommitteeRow
                key={committee.id}
                committee={committee}
                shift={shift}
                isAdmin={isAdmin}
                canAdd={canManageShifts}
                canRemove={canManageShifts}
                currentUserId={user?.uid}
                dayBlock={displayBlock}
                onAdd={openAddDialog}
                onRemove={handleRemoveAssignee}
                highlighted={highlightedId === committee.id}
                rowRef={(el) => { committeeRefs.current[committee.id] = el; }}
              />
            );
          })}

          {/* Admin CTA if some committees missing shift docs */}
          {isAdmin && shifts.length > 0 && shifts.length < COMMITTEES.length && (
            <div className="text-center pt-2">
              <button
                onClick={handleInitialise}
                disabled={initialising}
                className="gc-btn-ghost text-xs gap-1.5"
              >
                {initialising ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                Add Missing Committee Rows
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Add Assignee Dialog ── */}
      <AddAssigneeDialog
        open={addDialog.open}
        onClose={closeAddDialog}
        committeeName={dialogCommittee?.name || ""}
        committeeColor={dialogCommittee?.color || "#C8102E"}
        allMembers={addDialog.committeeId ? (membersByCommittee[addDialog.committeeId] || []) : []}
        suggestedMembers={addDialog.committeeId ? (suggestedByCommittee[addDialog.committeeId] || []) : []}
        alreadyAssigned={dialogShift?.assignees || []}
        onSelect={handleAddAssignee}
      />

      {/* ── Remove Assignee Confirm Dialog ── */}
      <ConfirmDialog
        open={removeConfirm.open}
        onClose={() => setRemoveConfirm((s) => ({ ...s, open: false }))}
        onConfirm={handleRemoveConfirmed}
        title="Remove Member"
        message={`Remove ${removeConfirm.userName} from this shift? This cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
      />

      {/* ── Double-Assignment Conflict Warning ── */}
      <AnimatePresence>
        {conflictWarning.open && (
          <motion.div
            key="conflict-overlay"
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setConflictWarning((s) => ({ ...s, open: false }))}
          >
            <motion.div
              className="w-full max-w-sm rounded-lg border border-gc-warning/40 bg-gc-night shadow-2xl shadow-black/60 overflow-hidden"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
            >
              {/* Warning accent bar */}
              <div className="h-0.5 w-full bg-gc-warning" />

              {/* Header */}
              <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gc-warning/15 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-gc-warning" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-wider text-gc-white leading-tight">
                    ASSIGNMENT CONFLICT
                  </h3>
                  <p className="font-body text-xs text-gc-mist mt-0.5">
                    Scheduling conflicts detected for the selected{" "}
                    {conflictWarning.conflicts.length + conflictWarning.sameDayConflicts.length === 1
                      ? "member"
                      : "members"}
                    . Review before proceeding.
                  </p>
                </div>
              </div>

              {/* Same-block cross-committee conflicts */}
              {conflictWarning.conflicts.length > 0 && (
                <div className="px-5 pb-3 space-y-2">
                  <p className="font-display text-[10px] tracking-widest uppercase text-gc-warning/70 mb-1.5">
                    Already assigned — this shift
                  </p>
                  {conflictWarning.conflicts.map(({ member, committees }) => (
                    <div
                      key={member.userId}
                      className="flex items-start gap-2.5 rounded border border-gc-warning/20 bg-gc-warning/5 px-3 py-2.5"
                    >
                      <Users className="h-4 w-4 text-gc-warning shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold text-gc-white truncate">
                          {member.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {committees.map((cName) => (
                            <span
                              key={cName}
                              className="inline-flex items-center gap-1 rounded bg-gc-warning/10 border border-gc-warning/20 px-1.5 py-0.5 font-mono text-[9px] text-gc-warning uppercase tracking-wider"
                            >
                              <ChevronsRight className="h-2.5 w-2.5" />
                              {cName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Same-day cross-block conflicts */}
              {conflictWarning.sameDayConflicts.length > 0 && (
                <div className="px-5 pb-3 space-y-2">
                  {conflictWarning.conflicts.length > 0 && (
                    <div className="border-t border-gc-steel/30 mb-3" />
                  )}
                  <p className="font-display text-[10px] tracking-widest uppercase text-gc-danger/70 mb-1.5">
                    Assigned on the other block today
                  </p>
                  {conflictWarning.sameDayConflicts.map(({ member, blockLabel, committees }) => (
                    <div
                      key={member.userId}
                      className="flex items-start gap-2.5 rounded border border-gc-danger/20 bg-gc-danger/5 px-3 py-2.5"
                    >
                      <Zap className="h-4 w-4 text-gc-danger shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold text-gc-white truncate">
                          {member.name}
                        </p>
                        <p className="font-mono text-[10px] text-gc-mist mt-0.5">
                          Also on: <span className="text-gc-cloud">{blockLabel}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {committees.map((cName) => (
                            <span
                              key={cName}
                              className="inline-flex items-center gap-1 rounded bg-gc-danger/10 border border-gc-danger/20 px-1.5 py-0.5 font-mono text-[9px] text-gc-danger uppercase tracking-wider"
                            >
                              <ChevronsRight className="h-2.5 w-2.5" />
                              {cName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Fatigue note */}
                  <div className="flex items-start gap-2 rounded border border-gc-danger/15 bg-gc-danger/5 px-3 py-2 mt-1">
                    <Zap className="h-3.5 w-3.5 text-gc-danger/70 shrink-0 mt-0.5" />
                    <p className="font-body text-[11px] text-gc-danger/80 leading-snug">
                      This member will be working <span className="font-semibold text-gc-danger">both morning and afternoon</span>. Consider the physical and mental fatigue of a full-day assignment.
                    </p>
                  </div>
                </div>
              )}

              <p className="px-5 pb-4 font-body text-xs text-gc-mist">
                You can still proceed — this is a warning only.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2.5 border-t border-gc-steel/40 bg-gc-iron/60 px-5 py-3">
                <button
                  onClick={() => setConflictWarning((s) => ({ ...s, open: false }))}
                  className="rounded border border-gc-steel/60 bg-transparent px-4 py-2 font-display text-sm tracking-wider text-gc-mist hover:text-gc-white hover:border-gc-steel transition-colors"
                >
                  CANCEL
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const { committeeId, members } = conflictWarning;
                    setConflictWarning((s) => ({ ...s, open: false }));
                    await doAddAssignees(committeeId, members);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-gc-warning/15 border border-gc-warning/40 px-4 py-2 font-display text-sm tracking-wider text-gc-warning hover:bg-gc-warning/25 hover:border-gc-warning/60 transition-all"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  PROCEED ANYWAY
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
