import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, BarChart3, UserX, Loader2 } from "lucide-react";
import { AttendanceSkeleton } from "../Skeleton";
import { ATTENDANCE_SESSIONS } from "../../lib/attendanceConfig";
import {
  subscribeVolunteersForBlock,
  subscribeAttendanceForBlock,
  markRemainingAbsent,
} from "../../lib/attendanceFirestore";
import { logActivity } from "../../lib/auditLog";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../Toast";
import { cn } from "../../lib/utils";
import AttendanceList from "./AttendanceList";
import AttendanceSummary from "./AttendanceSummary";

const SUB_TABS = [
  { key: "take",     label: "Take Attendance", Icon: ListChecks },
  { key: "overview", label: "Overview",         Icon: BarChart3 },
];

const pageVar = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

export default function AttendancePage() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const isAdminOrHead = profile?.role === "admin" || profile?.role === "head";
  const canMark = profile?.role === "admin" || profile?.role === "proctor";

  /* ── state ── */
  const [blockIdx, setBlockIdx]     = useState(0);
  const [subTab, setSubTab]         = useState("take");
  const [volunteers, setVolunteers] = useState([]);
  const [records, setRecords]       = useState({});
  const [loadingVols, setLoadingVols] = useState(true);
  const [markingAbsent, setMarkingAbsent] = useState(false);

  const session = ATTENDANCE_SESSIONS[blockIdx];
  const blockId = session.id;

  /* ── subscribe to shift-board assignees (volunteers) for this block ── */
  useEffect(() => {
    setLoadingVols(true);
    const unsub = subscribeVolunteersForBlock(blockId, (vols) => {
      setVolunteers(vols);
      setLoadingVols(false);
    });
    return unsub;
  }, [blockId]);

  /* ── subscribe to attendance records for this block ── */
  useEffect(() => {
    const unsub = subscribeAttendanceForBlock(blockId, setRecords);
    return unsub;
  }, [blockId]);

  /* ── mark all remaining as absent ── */
  const handleMarkAbsent = useCallback(async () => {
    if (!user) return;
    setMarkingAbsent(true);
    try {
      await markRemainingAbsent(blockId, volunteers, records, user.uid);
      logActivity({
        action: "attendance.bulk_absent",
        category: "attendance",
        details: `Marked ${unmarkedCount} unmarked volunteers as absent (${blockId})`,
        meta: { blockId, unmarkedCount },
        userId: user.uid,
        userName: profile?.name || "Unknown",
      });
      toast("Unmarked volunteers set to absent", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to mark absent", "error");
    } finally {
      setMarkingAbsent(false);
    }
  }, [blockId, volunteers, records, user, toast]);

  const unmarkedCount = volunteers.filter((p) => !records[p.id]).length;

  return (
    <div className="space-y-4">
      {/* ── Block tabs (same style as ShiftBoard) ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ATTENDANCE_SESSIONS.map((s, i) => {
          const isActive = i === blockIdx;
          return (
            <button
              key={s.id}
              onClick={() => setBlockIdx(i)}
              className={cn(
                "shrink-0 rounded px-3 py-2 text-xs font-semibold transition-all border",
                isActive
                  ? "bg-gc-crimson/15 border-gc-crimson/40 text-gc-crimson"
                  : "bg-gc-iron border-gc-steel/60 text-gc-mist hover:text-gc-cloud hover:border-gc-steel"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Sub-tabs (admin/head can see overview) ── */}
      {isAdminOrHead && (
        <div className="flex gap-1 rounded border border-gc-steel/30 bg-gc-iron/50 p-1 w-fit">
          {SUB_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border",
                subTab === key
                  ? "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/30"
                  : "text-gc-mist hover:text-gc-cloud border-transparent"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Mark remaining absent (proctors + admins) ── */}
      {subTab === "take" && canMark && unmarkedCount > 0 && (
        <button
          onClick={handleMarkAbsent}
          disabled={markingAbsent}
          className="flex items-center gap-2 rounded border border-gc-danger/30 bg-gc-danger/8 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gc-danger hover:bg-gc-danger/15 transition-colors disabled:opacity-50"
        >
          <UserX className="h-4 w-4" />
          {markingAbsent ? "Marking…" : `Mark ${unmarkedCount} Remaining as Absent`}
        </button>
      )}

      {/* ── Content ── */}
      {loadingVols ? (
        <AttendanceSkeleton />
      ) : volunteers.length === 0 ? (
        <div className="text-center py-10">
          <ListChecks className="mx-auto h-10 w-10 text-gc-faded mb-3" />
          <p className="text-sm text-gc-mist">
            No volunteers assigned in the Shift Board for this block.
          </p>
          <p className="text-xs text-gc-hint mt-1">
            Assign people to committees in the Shift Board first.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {subTab === "take" ? (
            <motion.div key="take" {...pageVar} transition={{ duration: 0.15 }}>
              <AttendanceList
                volunteers={volunteers}
                records={records}
                blockId={blockId}
                canMark={canMark}
              />
            </motion.div>
          ) : (
            <motion.div key="overview" {...pageVar} transition={{ duration: 0.15 }}>
              <AttendanceSummary
                volunteers={volunteers}
                records={records}
                blockId={blockId}
                blockLabel={session.label}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
