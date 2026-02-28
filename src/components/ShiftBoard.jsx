import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { SHIFT_BLOCKS, COMMITTEES } from "../data/seed";
import { COMMITTEE_NAMES } from "../lib/roleConfig";
import { cn } from "../lib/utils";
import {
  subscribeShiftsForBlock,
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
import { logActivity } from "../lib/auditLog";
import { useToast } from "./Toast";

/* ── Map shift-block IDs to role-schedule DAY labels ── */
function blockToDay(blockId) {
  if (blockId.startsWith("d1")) return "DAY 1";
  if (blockId.startsWith("d2")) return "DAY 2";
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

  const handleAddAssignee = useCallback(
    async (member) => {
      const cId = addDialog.committeeId;
      const comm = COMMITTEES.find((c) => c.id === cId);
      if (!comm || !user) return;
      try {
        await addAssigneeToShift(
          displayBlock,
          cId,
          comm.name,
          member,
          user.uid
        );
        logActivity({
          action: "shift.add_assignee",
          category: "shift",
          details: `Added ${member.name} to ${comm.name} (${displayBlock})`,
          meta: { dayBlock: displayBlock, committeeId: cId, assignee: member.name },
          userId: user.uid,
          userName: profile?.name || "Admin",
        });
        toast(`${member.name} added to ${comm.name}.`, "success");
      } catch (err) {
        // If backend rejects due to maxAllowed, surface a helpful toast
        if (err?.message?.includes("Max staff")) {
          toast(err.message.replace(/Max staff for /, ""), "error");
        } else {
          toast("Failed to add assignee.", "error");
        }
      }
    },
    [addDialog.committeeId, displayBlock, user, toast]
  );

  const handleRemoveAssignee = useCallback(
    async (shiftId, userId, userName) => {
      if (!user) return;
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
        toast(`${userName} removed.`, "warning");
      } catch (err) {
        toast("Failed to remove assignee.", "error");
      }
    },
    [user, toast]
  );

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
      {/* ── Block tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SHIFT_BLOCKS.map((block) => {
          const isActive  = displayBlock === block.id;
          const isCurrent = currentBlock?.id === block.id;
          return (
            <button
              key={block.id}
              onClick={() => setActiveBlock(block.id)}
              className={cn(
                "shrink-0 rounded px-3 py-2 text-xs font-semibold transition-all border",
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
        Exhibitors: 2 per block · Ticketing/Voting: 3–4 · Crowd Control: 12–24 · Documentation: 2–4 · Guest Relations: 4–6 · Marketing: 2 · Awards: up to 4
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

      {/* ── Loading state ── */}
      {loadingShifts ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="h-8 w-8 text-gc-crimson animate-spin" />
          <p className="text-sm text-gc-mist font-body">Loading shift data…</p>
        </div>
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
            // Only show committees that have a shift doc, or all if admin
            if (!shift && !isAdmin) return null;
            return (
              <ShiftCommitteeRow
                key={committee.id}
                committee={committee}
                shift={shift}
                isAdmin={isAdmin}
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
    </div>
  );
}
