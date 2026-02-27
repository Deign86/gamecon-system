import { AnimatePresence, motion } from "framer-motion";
import { Plus, KanbanSquare } from "lucide-react";
import { cn } from "../../lib/utils";
import TaskCard from "./TaskCard";

const COLUMN_CONFIG = {
  todo:        { label: "TO DO",        accent: "text-gc-cloud",   dot: "bg-gc-cloud/60" },
  in_progress: { label: "IN PROGRESS", accent: "text-gc-warning", dot: "bg-gc-warning" },
  done:        { label: "DONE",         accent: "text-gc-success", dot: "bg-gc-success" },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
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
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
          <h3 className={cn("font-display text-base font-bold tracking-wider", cfg.accent)}>
            {cfg.label}
          </h3>
          <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded bg-gc-iron/80 px-1.5 text-[10px] font-mono text-gc-mist">
            {count}
          </span>
        </div>

        {canCreate && status === "todo" && (
          <button
            onClick={onAddClick}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
              "text-[10px] font-bold uppercase tracking-wider",
              "bg-gc-crimson/10 text-gc-crimson border border-gc-crimson/20",
              "hover:bg-gc-crimson/20 transition-colors"
            )}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Cards container */}
      <motion.div
        className="flex-1 space-y-2.5"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
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
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <KanbanSquare className="h-6 w-6 text-gc-faded" />
            <span className="text-xs font-body text-gc-hint italic">No tasks</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
