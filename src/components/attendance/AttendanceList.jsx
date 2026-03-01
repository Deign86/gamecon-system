import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Clock, ShieldCheck, X, Search, Filter, CloudUpload } from "lucide-react";
import { markAttendance } from "../../lib/attendanceFirestore";
import { logActivity } from "../../lib/auditLog";
import { STATUS_META } from "../../lib/attendanceConfig";
import { useAuth } from "../../hooks/useAuth";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useQueuedWrite } from "../../hooks/useQueuedWrite";
import { cn } from "../../lib/utils";

const STATUS_BUTTONS = [
  { key: "present", Icon: Check,       accent: "gc-success" },
  { key: "late",    Icon: Clock,       accent: "gc-warning" },
  { key: "excused", Icon: ShieldCheck, accent: "blue-400"   },
  { key: "absent",  Icon: X,           accent: "gc-danger"  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const itemVar = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 280 } },
};

export default function AttendanceList({ volunteers, records, blockId, canMark }) {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const { execute: queuedWrite } = useQueuedWrite();
  const [search, setSearch]         = useState("");
  const [filterComm, setFilterComm] = useState("all");
  const [busy, setBusy]             = useState(null);
  // Track person IDs whose last mark was done while offline (visually show QUEUED badge)
  const [queuedIds, setQueuedIds]   = useState(new Set());

  /* Clear queued badges when connectivity is restored and data syncs */
  const prevOnlineRef = useRef(isOnline);
  if (prevOnlineRef.current !== isOnline) {
    prevOnlineRef.current = isOnline;
    if (isOnline && queuedIds.size > 0) {
      // Give Firestore a moment to sync, then clear queued badges
      setTimeout(() => setQueuedIds(new Set()), 3500);
    }
  }

  /* ── committees present in current volunteer list ── */
  const presentComms = useMemo(() => {
    const set = new Set();
    volunteers.forEach((p) => p.committees?.forEach((c) => set.add(c)));
    return [...set].sort();
  }, [volunteers]);

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    let list = [...volunteers];
    if (filterComm !== "all") {
      list = list.filter((p) => p.committees?.includes(filterComm));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [volunteers, filterComm, search]);

  /* ── mark handler ── */
  async function handleMark(person, status) {
    if (busy || !canMark) return;
    setBusy(person.id);
    try {
      const { queued } = await queuedWrite(() =>
        markAttendance(blockId, person, status, user.uid)
      );

      if (queued) {
        // Mark this row as pending sync so the user sees the QUEUED badge
        setQueuedIds((prev) => {
          const next = new Set(prev);
          next.add(person.id);
          return next;
        });
      } else {
        // Confirmed synced — remove queued badge if present
        setQueuedIds((prev) => {
          if (!prev.has(person.id)) return prev;
          const next = new Set(prev);
          next.delete(person.id);
          return next;
        });
      }

      logActivity({
        action: "attendance.mark",
        category: "attendance",
        details: `Marked ${person.name} as ${status} (${blockId})${queued ? " [queued]" : ""}`,
        meta: { blockId, personId: person.id, personName: person.name, status, queued },
        userId: user.uid,
        userName: user.displayName || "Unknown",
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to mark attendance", err);
    } finally {
      setBusy(null);
    }
  }

  const totalCount  = filtered.length;
  const markedCount = filtered.filter((p) => records[p.id]).length;

  return (
    <div className="space-y-4">
      {/* ── Search & Filter bar ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-mist" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search volunteer…"
            className="gc-input w-full py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-mist pointer-events-none" />
          <select
            value={filterComm}
            onChange={(e) => setFilterComm(e.target.value)}
            className="gc-input appearance-none py-2 pl-9 pr-8 text-sm"
          >
            <option value="all">All Committees</option>
            {presentComms.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-gc-steel/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gc-crimson"
            initial={{ width: 0 }}
            animate={{ width: totalCount ? `${(markedCount / totalCount) * 100}%` : "0%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
          />
        </div>
        <span className="text-xs font-mono text-gc-mist whitespace-nowrap">
          {markedCount}/{totalCount}
        </span>
      </div>

      {/* ── Volunteer list ── */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-gc-mist font-body">
          No volunteers found for this block.
        </p>
      ) : (
        <motion.ul
          className="space-y-2"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {filtered.map((person) => {
              const rec     = records[person.id];
              const status  = rec?.status;
              const meta    = status ? STATUS_META[status] : null;
              const isQueued = queuedIds.has(person.id);

              return (
                <motion.li
                  key={person.id}
                  variants={itemVar}
                  layout
                  className={cn(
                    "rounded border p-3 bg-gc-slate/60 transition-colors",
                    isQueued
                      ? "border-gc-warning/30 bg-gc-warning/[0.04]"
                      : status
                        ? `border-${meta.color}/20 bg-${meta.color}/5`
                        : "border-gc-steel/30"
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: name + committees + badge */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "flex-shrink-0 h-2.5 w-2.5 rounded-full",
                          isQueued ? "bg-gc-warning animate-pulse" : status ? `bg-${meta.color}` : "bg-gc-steel/50"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="font-display text-base tracking-wide text-gc-white truncate">
                          {person.name}
                        </p>
                        <p className="text-[11px] font-body text-gc-mist truncate">
                          {(person.committees || []).join(", ")}
                        </p>
                      </div>
                      {/* Status badge OR queued indicator */}
                      {isQueued ? (
                        <span className="ml-auto sm:ml-2 flex-shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-display tracking-widest uppercase bg-gc-warning/15 text-gc-warning border border-gc-warning/25">
                          <CloudUpload className="h-2.5 w-2.5" />
                          Queued
                        </span>
                      ) : status ? (
                        <span
                          className={cn(
                            "ml-auto sm:ml-2 flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-display tracking-widest uppercase",
                            `bg-${meta.color}/15 text-${meta.color} border border-${meta.color}/25`
                          )}
                        >
                          {meta.label}
                        </span>
                      ) : null}
                    </div>

                    {/* Right: action buttons */}
                    {canMark && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        {STATUS_BUTTONS.map(({ key, Icon, accent }) => {
                          const isActive = status === key;
                          return (
                            <button
                              key={key}
                              disabled={busy === person.id}
                              onClick={() => handleMark(person, key)}
                              title={STATUS_META[key].label}
                              className={cn(
                                "relative flex h-8 w-8 items-center justify-center rounded transition-all",
                                isActive
                                  ? `bg-${accent}/20 text-${accent} ring-1 ring-${accent}/40`
                                  : `bg-gc-iron/60 text-gc-mist hover:bg-${accent}/10 hover:text-${accent}`
                              )}
                            >
                              <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 1.8} />
                              {isActive && (
                                <motion.span
                                  layoutId={`active-ring-${person.id}`}
                                  className={`absolute inset-0 rounded ring-2 ring-${accent}/30`}
                                  transition={{ type: "spring", damping: 22, stiffness: 300 }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
