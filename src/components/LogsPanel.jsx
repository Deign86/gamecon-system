import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogsPanelSkeleton } from "./Skeleton";
import Modal from "./Modal";
import {
  ScrollText,
  TrendingUp,
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  ShieldAlert,
  UserCog,
  Calendar,
  ListChecks,
  KeyRound,
  Settings,
  KanbanSquare,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import { useCollection } from "../hooks/useFirestore";
import { useAuth } from "../hooks/useAuth";
import { fmtDate, cn } from "../lib/utils";
import { exportLogs } from "../lib/exportExcel";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 260 } },
};

/* ── Category config ── */
const CATEGORIES = [
  { key: "all",          label: "All" },
  { key: "admin",        label: "Admin" },
  { key: "contribution", label: "Contributions" },
  { key: "incident",     label: "Incidents" },
  { key: "expense",      label: "Expenses" },
  { key: "shift",        label: "Shifts" },
  { key: "role",         label: "Roles" },
  { key: "task",         label: "Tasks" },
  { key: "attendance",   label: "Attendance" },
  { key: "headcount",    label: "Headcount" },
  { key: "auth",         label: "Auth" },
  { key: "system",       label: "System" },
];

function categoryConfig(category) {
  switch (category) {
    case "admin":
      return { Icon: UserCog, color: "#C8102E", bg: "rgba(200,16,46,0.1)" };
    case "contribution":
      return { Icon: ClipboardCheck, color: "#22C55E", bg: "rgba(34,197,94,0.1)" };
    case "incident":
      return { Icon: AlertTriangle, color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
    case "expense":
      return { Icon: DollarSign, color: "#EAB308", bg: "rgba(234,179,8,0.1)" };
    case "shift":
      return { Icon: Calendar, color: "#3B82F6", bg: "rgba(59,130,246,0.1)" };
    case "role":
      return { Icon: ShieldAlert, color: "#A855F7", bg: "rgba(168,85,247,0.1)" };
    case "task":
      return { Icon: KanbanSquare, color: "#F97316", bg: "rgba(249,115,22,0.1)" };
    case "attendance":
      return { Icon: ListChecks, color: "#06B6D4", bg: "rgba(6,182,212,0.1)" };
    case "headcount":
      return { Icon: TrendingUp, color: "#EC4899", bg: "rgba(236,72,153,0.1)" };
    case "auth":
      return { Icon: KeyRound, color: "#14B8A6", bg: "rgba(20,184,166,0.1)" };
    case "system":
      return { Icon: Settings, color: "#EF4444", bg: "rgba(239,68,68,0.15)" };
    default:
      return { Icon: ScrollText, color: "#888", bg: "rgba(136,136,136,0.1)" };
  }
}

export default function LogsPanel() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [filter, setFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);

  const { docs: logs, loading } = useCollection("logs", "timestamp", 200);

  // Filter by category
  const filtered = filter === "all"
    ? logs
    : logs.filter((l) => l.category === filter);

  /* ── Guard: admin only ── */
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gc-mist font-body text-sm gap-3">
        <ShieldAlert className="h-10 w-10 text-gc-crimson" />
        <p className="font-display text-xl text-gc-crimson tracking-wider">ACCESS DENIED</p>
        <p>You need admin privileges to view audit logs.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-2xl"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
    >
      <motion.div variants={fadeUp} className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-gc-crimson animate-pulse" />
          <span className="text-[9px] font-mono text-gc-hint uppercase tracking-[0.2em]">SYS.LOG — AUDIT TRAIL</span>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-wider text-gc-white">
          ACTIVITY <span className="text-gc-crimson">LOG</span>
        </h2>
        <p className="text-xs text-gc-mist mt-0.5 font-mono">
          Complete audit trail of all system events — admin only. Logs auto-purge after 7 days.
        </p>
        {filtered.length > 0 && (
          <button
            onClick={() => exportLogs(filtered)}
            className="mt-2 flex items-center gap-1.5 rounded border border-gc-success/30 bg-gc-success/8 px-3 py-1.5 text-[11px] font-display tracking-wider text-gc-success hover:bg-gc-success/15 hover:border-gc-success/50 transition-colors"
            title="Export logs to Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Logs
          </button>
        )}
      </motion.div>

      {/* ── Category filter pills ── */}
      <motion.div variants={fadeUp} className="mb-4 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={cn(
              "shrink-0 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border",
              filter === cat.key
                ? "bg-gc-crimson/15 border-gc-crimson/40 text-gc-crimson"
                : "bg-gc-iron border-gc-steel/60 text-gc-mist hover:text-gc-cloud hover:border-gc-steel"
            )}
          >
            {cat.label}
          </button>
        ))}
      </motion.div>

      {/* ── Log entries ── */}
      <div className="space-y-2">
        {loading && (
          <LogsPanelSkeleton />
        )}

        {!loading && filtered.length === 0 && (
          <motion.div variants={fadeUp} className="text-center py-12">
            <ScrollText className="mx-auto h-10 w-10 text-gc-faded mb-3" />
            <p className="text-sm text-gc-hint">
              {filter === "all"
                ? "No activity logged yet. Events will appear here as actions are performed."
                : `No ${filter} events found.`}
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {filtered.map((entry, i) => {
            const { Icon, color, bg } = categoryConfig(entry.category);
            return (
              <motion.div
                key={entry.id}
                variants={fadeUp}
                layout
                className="gc-card flex items-center gap-3 p-3 cursor-pointer hover:border-gc-steel transition-colors"
                onClick={() => setSelectedLog(entry)}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded"
                  style={{ background: bg, border: `1px solid ${color}25` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gc-cloud truncate">
                    {entry.details || entry.action}
                  </p>
                  <p className="text-[10px] text-gc-hint font-mono">
                    {entry.action} · {entry.userName || "system"} · {fmtDate(entry.timestamp)}
                  </p>
                </div>

                <span
                  className="shrink-0 rounded px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider"
                  style={{ background: bg, color, border: `1px solid ${color}25` }}
                >
                  {entry.category}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Log detail modal ── */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="LOG ENTRY DETAIL"
      >
        {selectedLog && (() => {
          const { Icon, color, bg } = categoryConfig(selectedLog.category);
          return (
            <div className="space-y-4">
              {/* Category badge + icon */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded"
                  style={{ background: bg, border: `1px solid ${color}30` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <span
                    className="rounded px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider"
                    style={{ background: bg, color, border: `1px solid ${color}25` }}
                  >
                    {selectedLog.category}
                  </span>
                  <p className="text-[10px] text-gc-mist font-mono mt-1">
                    {selectedLog.action}
                  </p>
                </div>
              </div>

              {/* Full details */}
              <div className="rounded border border-gc-steel bg-gc-void p-3">
                <p className="text-xs text-gc-mist font-mono uppercase tracking-wider mb-1.5">Details</p>
                <p className="text-sm text-gc-cloud font-body leading-relaxed break-words">
                  {selectedLog.details || selectedLog.action}
                </p>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-gc-steel bg-gc-void p-2.5">
                  <p className="text-[9px] text-gc-mist font-mono uppercase tracking-wider mb-0.5">User</p>
                  <p className="text-xs text-gc-cloud font-mono">{selectedLog.userName || "system"}</p>
                </div>
                <div className="rounded border border-gc-steel bg-gc-void p-2.5">
                  <p className="text-[9px] text-gc-mist font-mono uppercase tracking-wider mb-0.5">Timestamp</p>
                  <p className="text-xs text-gc-cloud font-mono">{fmtDate(selectedLog.timestamp)}</p>
                </div>
                {selectedLog.uid && (
                  <div className="col-span-2 rounded border border-gc-steel bg-gc-void p-2.5">
                    <p className="text-[9px] text-gc-mist font-mono uppercase tracking-wider mb-0.5">UID</p>
                    <p className="text-xs text-gc-cloud font-mono break-all">{selectedLog.uid}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </motion.div>
  );
}
