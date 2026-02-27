import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import TaskCard from "./TaskCard";

const COLUMN_CONFIG = {
  todo:        { label: "TO DO",        accent: "gc-cloud",   dot: "bg-gc-cloud/60" },
  in_progress: { label: "IN PROGRESS", accent: "gc-warning", dot: "bg-gc-warning" },
  done:        { label: "DONE",         accent: "gc-success", dot: "bg-gc-success" },
};

export default function TaskColumn({
  status,
  tasks,
  onCardClick,
  onStatusChange,
  onAddClick,
  canCreate = false,
}) {
  const cfg = COLUMN_CONFIG[status] || COLUMN_CONFIG.todo;
  const count = tasks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 280 }}
      className="flex flex-col min-w-0"
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
          <h3 className={cn("font-display text-sm tracking-[0.15em] uppercase", `text-${cfg.accent}`)}>
            {cfg.label}
          </h3>
          <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded bg-gc-iron/80 px-1.5 text-[10px] font-mono text-gc-mist">
            {count}
          </span>
        </div>

        {canCreate && status === "todo" && (
          <button
            onClick={onAddClick}
            className="flex h-6 w-6 items-center justify-center rounded border border-gc-steel/40 text-gc-mist hover:text-gc-crimson hover:border-gc-crimson/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Cards container */}
      <div className={cn(
        "flex-1 space-y-2.5 rounded-lg border border-gc-steel/20 bg-gc-void/40 p-2.5",
        "min-h-[120px]"
      )}>
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onCardClick}
              onStatusChange={onStatusChange}
            />
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {count === 0 && (
          <div className="flex h-20 items-center justify-center">
            <span className="text-xs font-body text-gc-mist/50 italic">No tasks</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
