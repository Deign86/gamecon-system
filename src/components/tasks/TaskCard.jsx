import { forwardRef } from "react";
import { motion } from "motion/react";
import { Clock, Flag, MapPin, Users } from "lucide-react";
import { cn, initials } from "../../lib/utils";

const PRIORITY_CHIP = {
  high:   { label: "HIGH",   cls: "gc-chip-red" },
  medium: { label: "MED",    cls: "gc-chip-yellow" },
  low:    { label: "LOW",    cls: "gc-chip-green" },
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

const TaskCard = forwardRef(function TaskCard({ task, onClick, onStatusChange }, ref) {
  const prio = PRIORITY_CHIP[task.priority] || PRIORITY_CHIP.medium;

  return (
    <motion.div
      ref={ref}
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 24, stiffness: 280 }}
      onClick={() => onClick?.(task)}
      className="gc-card gc-slash group cursor-pointer p-3"
    >
      {/* Title */}
      <p className="text-sm font-bold text-gc-cloud leading-snug">
        {task.title}
      </p>

      {/* Description teaser */}
      {task.description && (
        <p className="text-xs text-gc-mist mt-0.5 line-clamp-2">{task.description}</p>
      )}

      {/* Badge row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* Priority chip */}
        <span className={cn(prio.cls, "text-[10px]")}>
          <Flag className="h-2.5 w-2.5" />
          {prio.label}
        </span>

        {/* Committee */}
        {task.committee && (
          <span className="gc-chip text-[10px] bg-gc-iron/60 border border-gc-steel/30 text-gc-cloud">
            <Users className="h-2.5 w-2.5 text-gc-mist" />
            {task.committee.length > 16 ? task.committee.slice(0, 14) + "…" : task.committee}
          </span>
        )}

        {/* Zone */}
        {task.zoneId && (
          <span className="gc-chip text-[10px] bg-gc-iron/60 border border-gc-steel/30 text-gc-cloud">
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
              className="flex h-5 w-5 items-center justify-center rounded-full border border-gc-slate bg-gc-crimson/20 text-[8px] font-mono font-bold text-gc-crimson"
            >
              {initials(a.name)}
            </div>
          ))}
          {(task.assignees || []).length > 4 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gc-slate bg-gc-iron text-[8px] font-mono text-gc-mist">
              +{task.assignees.length - 4}
            </div>
          )}
        </div>

        {/* Created time */}
        <span className="flex items-center gap-1 text-[10px] text-gc-hint font-mono">
          <Clock className="h-2.5 w-2.5" />
          {relativeTime(task.createdAt)}
        </span>
      </div>

      {/* Mobile status change chip row */}
      {onStatusChange && (
        <div className="mt-2.5 pt-2 border-t border-gc-steel/30 flex gap-1.5 sm:hidden">
          {task.status !== "todo" && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "todo"); }}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1",
                "text-[9px] font-bold uppercase tracking-wider",
                "bg-gc-iron/60 text-gc-cloud border border-gc-steel/30",
                "hover:border-gc-mist/40 transition-colors"
              )}
            >
              To Do
            </button>
          )}
          {task.status !== "in_progress" && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "in_progress"); }}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1",
                "text-[9px] font-bold uppercase tracking-wider",
                "bg-gc-warning/10 text-gc-warning border border-gc-warning/20",
                "hover:bg-gc-warning/20 transition-colors"
              )}
            >
              In Progress
            </button>
          )}
          {task.status !== "done" && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "done"); }}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1",
                "text-[9px] font-bold uppercase tracking-wider",
                "bg-gc-success/10 text-gc-success border border-gc-success/20",
                "hover:bg-gc-success/20 transition-colors"
              )}
            >
              Done
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
});

export default TaskCard;
