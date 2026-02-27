import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Filter, KanbanSquare } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../Toast";
import {
  subscribeTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../../lib/tasksFirestore";
import { COMMITTEE_NAMES } from "../../lib/roleConfig";
import TaskColumn from "./TaskColumn";
import TaskFormDrawer from "./TaskFormDrawer";

const STATUSES = ["todo", "in_progress", "done"];
const DAYS = ["DAY 1", "DAY 2"];

export default function TaskBoard() {
  const { user, profile } = useAuth();
  const toast = useToast();

  /* ─── state ─── */
  const [day, setDay]                     = useState("DAY 1");
  const [tasks, setTasks]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [editingTask, setEditingTask]     = useState(null);
  const [filterCommittee, setFilterCommittee] = useState("");
  const [showFilters, setShowFilters]     = useState(false);

  /* Permissions: admin + proctor can create/update; only admin can delete */
  const canCreate = ["admin", "proctor"].includes(profile?.role);
  const canDelete = profile?.role === "admin";

  /* ─── real-time subscription ─── */
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeTasks(day, (data) => {
      setTasks(data);
      setLoading(false);
    });
    return unsub;
  }, [day]);

  /* ─── filtered + grouped tasks ─── */
  const filteredTasks = useMemo(() => {
    if (!filterCommittee) return tasks;
    return tasks.filter((t) => t.committee === filterCommittee);
  }, [tasks, filterCommittee]);

  const columns = useMemo(() => {
    const result = {};
    for (const s of STATUSES) {
      result[s] = filteredTasks.filter((t) => t.status === s);
    }
    return result;
  }, [filteredTasks]);

  /* ─── handlers ─── */
  const handleStatusChange = useCallback(
    async (taskId, newStatus) => {
      try {
        await updateTask(taskId, { status: newStatus });
      } catch (err) {
        toast("Failed to update status", "error");
      }
    },
    [toast]
  );

  const handleCardClick = useCallback((task) => {
    if (!canCreate) return; // viewers can only read
    setEditingTask(task);
    setDrawerOpen(true);
  }, [canCreate]);

  const handleAddClick = useCallback(() => {
    setEditingTask(null);
    setDrawerOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data) => {
      if (editingTask) {
        await updateTask(editingTask.id, data);
        toast("Task updated", "success");
      } else {
        await createTask(data, user.uid);
        toast("Task created", "success");
      }
    },
    [editingTask, user, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!editingTask) return;
    try {
      await deleteTask(editingTask.id);
      toast("Task deleted", "info");
      setDrawerOpen(false);
    } catch {
      toast("Failed to delete task", "error");
    }
  }, [editingTask, toast]);

  /* ─── render ─── */
  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="mb-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-gc-crimson/30 bg-gc-crimson/10">
            <KanbanSquare className="h-4.5 w-4.5 text-gc-crimson" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-[0.08em] text-gc-white leading-none">
              TASK BOARD
            </h1>
            <p className="text-[10px] font-mono text-gc-mist tracking-wider mt-0.5">
              KANBAN &bull; {filteredTasks.length} TASKS
            </p>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day switcher */}
          <div className="flex rounded border border-gc-steel/40 overflow-hidden">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-display tracking-wider transition-colors",
                  day === d
                    ? "bg-gc-crimson/20 text-gc-crimson border-r border-gc-crimson/30"
                    : "bg-gc-slate text-gc-mist hover:text-gc-cloud border-r border-gc-steel/30 last:border-r-0"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-display tracking-wider transition-colors",
              showFilters || filterCommittee
                ? "border-gc-crimson/40 text-gc-crimson bg-gc-crimson/10"
                : "border-gc-steel/40 text-gc-mist hover:text-gc-cloud bg-gc-slate"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            FILTER
            {filterCommittee && (
              <span className="ml-1 rounded bg-gc-crimson/20 px-1.5 py-0.5 text-[9px]">
                1
              </span>
            )}
          </button>

          <div className="flex-1" />

          {/* New task button */}
          {canCreate && (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 rounded border border-gc-crimson/50 bg-gc-crimson/15 px-4 py-1.5 text-xs font-display tracking-wider text-gc-crimson hover:bg-gc-crimson/25 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              NEW TASK
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="rounded border border-gc-steel/30 bg-gc-slate p-3">
              <label className="block text-[9px] font-display tracking-[0.2em] text-gc-mist uppercase mb-1.5">
                Committee
              </label>
              <select
                value={filterCommittee}
                onChange={(e) => setFilterCommittee(e.target.value)}
                className="w-full sm:w-64 appearance-none rounded border border-gc-steel/40 bg-gc-iron px-3 py-1.5 text-xs font-body text-gc-cloud focus:border-gc-crimson/60 focus:outline-none transition-colors"
              >
                <option value="">All Committees</option>
                {COMMITTEE_NAMES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded border-2 border-gc-crimson border-t-transparent animate-spin" />
            <span className="text-[10px] font-display tracking-[0.2em] text-gc-crimson animate-pulse">
              LOADING TASKS…
            </span>
          </div>
        </div>
      )}

      {/* ── Kanban columns ── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUSES.map((status, i) => (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", damping: 24, stiffness: 280 }}
            >
              <TaskColumn
                status={status}
                tasks={columns[status]}
                onCardClick={handleCardClick}
                onStatusChange={canCreate ? handleStatusChange : undefined}
                onAddClick={handleAddClick}
                canCreate={canCreate}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Task Form Drawer ── */}
      <TaskFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        onDelete={canDelete && editingTask ? handleDelete : null}
        initial={editingTask}
      />
    </div>
  );
}
