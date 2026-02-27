import { motion } from "framer-motion";
import { Clock, Flag, MapPin, Users, GripVertical } from "lucide-react";
import { cn, initials } from "../../lib/utils";

const PRIORITY_CONFIG = {
  high:   { label: "HIGH",   color: "bg-gc-danger/20 text-gc-danger border-gc-danger/30" },
  medium: { label: "MED",    color: "bg-gc-warning/20 text-gc-warning border-gc-warning/30" },
  low:    { label: "LOW",    color: "bg-gc-success/20 text-gc-success border-gc-success/30" },
};

function relativeTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TaskCard({ task, onClick, onStatusChange, compact = false }) {
  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 24, stiffness: 280 }}
      onClick={() => onClick?.(task)}
      className={cn(
        "group relative cursor-pointer rounded border border-gc-steel/40 bg-gc-slate",
        "hover:border-gc-crimson/40 hover:shadow-lg hover:shadow-gc-crimson/5",
        "transition-colors duration-200",
        compact ? "p-3" : "p-3.5"
      )}
    >
      {/* Drag handle (desktop) */}
      <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-40 transition-opacity hidden sm:block">
        <GripVertical className="h-3.5 w-3.5 text-gc-mist" />
      </div>

      {/* Title */}
      <h4 className="font-body text-sm font-medium text-gc-white leading-snug pr-5">
        {task.title}
      </h4>

      {/* Badge row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* Priority */}
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-display tracking-wider border", prio.color)}>
          <Flag className="h-2.5 w-2.5" />
          {prio.label}
        </span>

        {/* Committee */}
        {task.committee && (
          <span className="inline-flex items-center gap-1 rounded bg-gc-iron/60 border border-gc-steel/30 px-1.5 py-0.5 text-[10px] font-display tracking-wider text-gc-cloud">
            <Users className="h-2.5 w-2.5 text-gc-mist" />
            {task.committee.length > 16 ? task.committee.slice(0, 14) + "…" : task.committee}
          </span>
        )}

        {/* Zone */}
        {task.zoneId && (
          <span className="inline-flex items-center gap-1 rounded bg-gc-iron/60 border border-gc-steel/30 px-1.5 py-0.5 text-[10px] font-display tracking-wider text-gc-cloud">
            <MapPin className="h-2.5 w-2.5 text-gc-mist" />
            {task.zoneId}
          </span>
        )}
      </div>

      {/* Footer: assignees + time */}
      <div className="mt-2.5 flex items-center justify-between">
        {/* Assignee avatars */}
        <div className="flex -space-x-1.5">
          {(task.assignees || []).slice(0, 4).map((a, i) => (
            <div
              key={a.personId || i}
              title={a.name}
              className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-gc-slate bg-gc-crimson/20 text-[8px] font-mono font-bold text-gc-crimson"
            >
              {initials(a.name)}
            </div>
          ))}
          {(task.assignees || []).length > 4 && (
            <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full border border-gc-slate bg-gc-iron text-[8px] font-mono text-gc-mist">
              +{task.assignees.length - 4}
            </div>
          )}
        </div>

        {/* Created time */}
        <span className="flex items-center gap-1 text-[10px] font-mono text-gc-mist">
          <Clock className="h-2.5 w-2.5" />
          {relativeTime(task.createdAt)}
        </span>
      </div>

      {/* Mobile status change chip row */}
      {onStatusChange && (
        <div className="mt-2.5 flex gap-1.5 sm:hidden">
          {task.status !== "todo" && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "todo"); }}
              className="flex-1 rounded border border-gc-steel/30 bg-gc-iron/60 px-2 py-1 text-[9px] font-display tracking-wider text-gc-cloud uppercase hover:border-gc-mist/40 transition-colors"
            >
              To Do
            </button>
          )}
          {task.status !== "in_progress" && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "in_progress"); }}
              className="flex-1 rounded border border-gc-warning/30 bg-gc-warning/10 px-2 py-1 text-[9px] font-display tracking-wider text-gc-warning uppercase hover:bg-gc-warning/20 transition-colors"
            >
              In Progress
            </button>
          )}
          {task.status !== "done" && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "done"); }}
              className="flex-1 rounded border border-gc-success/30 bg-gc-success/10 px-2 py-1 text-[9px] font-display tracking-wider text-gc-success uppercase hover:bg-gc-success/20 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
