import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Filter, Calendar, Loader2, KanbanSquare } from "lucide-react";
import { cn } from "../../lib/utils";
import { TaskBoardSkeleton } from "../Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../Toast";
import {
  subscribeTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../../lib/tasksFirestore";
import { logActivity } from "../../lib/auditLog";
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
        logActivity({
          action: "task.status_change",
          category: "task",
          details: `Moved task ${taskId} to ${newStatus}`,
          meta: { taskId, newStatus },
          userId: user?.uid || "unknown",
          userName: profile?.name || "Unknown",
        });
      } catch (err) {
        toast("Failed to update status", "error");
      }
    },
    [user, profile, toast]
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
        logActivity({
          action: "task.update",
          category: "task",
          details: `Updated task: ${data.title || editingTask.id}`,
          meta: { taskId: editingTask.id, ...data },
          userId: user?.uid || "unknown",
          userName: profile?.name || "Unknown",
        });
        toast("Task updated", "success");
      } else {
        await createTask(data, user.uid);
        logActivity({
          action: "task.create",
          category: "task",
          details: `Created task: ${data.title || "Untitled"}`,
          meta: { ...data },
          userId: user.uid,
          userName: profile?.name || "Unknown",
        });
        toast("Task created", "success");
      }
    },
    [editingTask, user, profile, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!editingTask) return;
    try {
      await deleteTask(editingTask.id);
      logActivity({
        action: "task.delete",
        category: "task",
        details: `Deleted task: ${editingTask.title || editingTask.id}`,
        meta: { taskId: editingTask.id },
        userId: user?.uid || "unknown",
        userName: profile?.name || "Unknown",
      });
      toast("Task deleted", "info");
      setDrawerOpen(false);
    } catch {
      toast("Failed to delete task", "error");
    }
  }, [editingTask, user, profile, toast]);

  /* ─── render ─── */
  return (
    <div className="space-y-5">
      {/* ── Day tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={cn(
              "shrink-0 rounded px-3 py-2 text-xs font-semibold transition-all border",
              day === d
                ? "bg-gc-crimson/15 border-gc-crimson/40 text-gc-crimson"
                : "bg-gc-iron border-gc-steel/60 text-gc-mist hover:text-gc-cloud hover:border-gc-steel"
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* ── Summary bar ── */}
      <div className="flex items-center justify-between rounded border border-gc-steel/60 bg-gc-iron px-4 py-2.5">
        <div className="flex items-center gap-4 text-xs font-body">
          <span className="flex items-center gap-1.5 text-gc-cloud">
            <Calendar className="h-3.5 w-3.5 text-gc-crimson" />
            {day}
          </span>
          <span className="text-gc-mist">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
              "text-[10px] font-bold uppercase tracking-wider transition-colors",
              showFilters || filterCommittee
                ? "bg-gc-crimson/10 text-gc-crimson border border-gc-crimson/20"
                : "bg-gc-iron text-gc-mist border border-gc-steel/40 hover:text-gc-cloud"
            )}
          >
            <Filter className="h-3 w-3" />
            Filter
            {filterCommittee && (
              <span className="ml-0.5 rounded bg-gc-crimson/20 px-1 py-px text-[8px]">1</span>
            )}
          </button>

          {/* New task button */}
          {canCreate && (
            <button onClick={handleAddClick} className="gc-btn-primary !py-1 !px-3 !text-[10px] !gap-1">
              <Plus className="h-3 w-3" /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded bg-gc-iron border border-gc-steel/50 p-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
              Committee
            </label>
            <select
              value={filterCommittee}
              onChange={(e) => setFilterCommittee(e.target.value)}
              className="gc-input !py-1.5 !text-xs w-full sm:w-64"
            >
              <option value="">All Committees</option>
              {COMMITTEE_NAMES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* ── Loading state ── */}
      {loading ? (
        <TaskBoardSkeleton />
      ) : filteredTasks.length === 0 && !filterCommittee ? (
        /* ── Empty state ── */
        <div className="text-center py-10">
          <KanbanSquare className="mx-auto h-10 w-10 text-gc-faded mb-3" />
          <p className="text-sm text-gc-hint">No tasks for {day} yet.</p>
          {canCreate && (
            <p className="text-xs text-gc-faded mt-1">
              Tap "New Task" to get started.
            </p>
          )}
        </div>
      ) : (
        /* ── Kanban columns ── */
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
