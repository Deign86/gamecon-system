import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  draggingTask = null,
  onDragStart,
  onDragEnd,
  onDrop,
}) {
  const cfg = COLUMN_CONFIG[status] || COLUMN_CONFIG.todo;
  const count = tasks.length;
  const [isOver, setIsOver] = useState(false);

  const canDrop = draggingTask && draggingTask.fromStatus !== status;

  const DROP_ACCENT = {
    todo:        "border-gc-cloud/50 bg-gc-cloud/5 shadow-[0_0_18px_0_rgba(204,204,204,0.08)]",
    in_progress: "border-gc-warning/50 bg-gc-warning/5 shadow-[0_0_18px_0_rgba(234,179,8,0.12)]",
    done:        "border-gc-success/50 bg-gc-success/5 shadow-[0_0_18px_0_rgba(34,197,94,0.12)]",
  };

  function handleDragOver(e) {
    if (!canDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  }

  function handleDragLeave(e) {
    // only fire when leaving the column wrapper itself, not its children
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsOver(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    const fromStatus = e.dataTransfer.getData("fromStatus");
    if (taskId && fromStatus !== status) {
      onDrop?.(taskId, status);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col min-w-0 rounded-lg border transition-all duration-200",
        isOver && canDrop
          ? cn("border", DROP_ACCENT[status])
          : "border-transparent"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full transition-transform duration-150", cfg.dot, isOver && canDrop && "scale-150")} />
          <h3 className={cn("font-display text-base font-bold tracking-wider", cfg.accent)}>
            {cfg.label}
          </h3>
          <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded bg-gc-iron/80 px-1.5 text-[10px] font-mono text-gc-mist">
            {count}
          </span>
          {isOver && canDrop && (
            <span className={cn("text-[9px] font-bold uppercase tracking-widest animate-pulse", cfg.accent)}>
              Drop here
            </span>
          )}
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
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingTask?.id === task.id}
            />
          ))}
        </AnimatePresence>

        {/* Empty state / drop hint */}
        {count === 0 && (
          <div className={cn(
            "flex flex-col items-center justify-center py-8 gap-2 rounded-md border-2 border-dashed transition-colors duration-200",
            isOver && canDrop ? cn("border-current/40", cfg.accent) : "border-gc-steel/20"
          )}>
            <KanbanSquare className={cn("h-6 w-6 transition-colors", isOver && canDrop ? cfg.accent : "text-gc-faded")} />
            <span className="text-xs font-body text-gc-hint italic">
              {isOver && canDrop ? "Release to drop" : "No tasks"}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
