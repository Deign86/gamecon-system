import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ChevronDown, Trash2, UserPlus, Flag, MapPin } from "lucide-react";
import { cn, initials } from "../../lib/utils";
import { getAssignablePeople } from "../../lib/assigneePicker";
import { COMMITTEE_NAMES } from "../../lib/roleConfig";

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "text-gc-success border-gc-success/30 bg-gc-success/10" },
  { value: "medium", label: "Medium", color: "text-gc-warning border-gc-warning/30 bg-gc-warning/10" },
  { value: "high",   label: "High",   color: "text-gc-danger  border-gc-danger/30  bg-gc-danger/10" },
];

const STATUSES = [
  { value: "todo",        label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done",        label: "Done" },
];

const DAYS = ["DAY 1", "DAY 2"];

/**
 * TaskFormDrawer — modal drawer for creating / editing a task.
 *
 * Props:
 *   open       – boolean
 *   onClose    – fn()
 *   onSave     – fn(data) — receives the task data to create/update
 *   onDelete   – fn() | null — if provided, shows delete button
 *   initial    – existing task object (edit mode) or null (create mode)
 */
export default function TaskFormDrawer({ open, onClose, onSave, onDelete, initial = null }) {
  const overlayRef = useRef(null);

  const isEdit = !!initial;

  /* ─── form state ─── */
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState("medium");
  const [status, setStatus]           = useState("todo");
  const [committee, setCommittee]     = useState("");
  const [zoneId, setZoneId]           = useState("");
  const [day, setDay]                 = useState("DAY 1");
  const [assignees, setAssignees]     = useState([]);
  const [saving, setSaving]           = useState(false);

  /* ─── assignee picker state ─── */
  const [people, setPeople]           = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [search, setSearch]           = useState("");
  const [showPicker, setShowPicker]   = useState(false);
  const [filterCommittee, setFilterCommittee] = useState("");

  /* Populate form on open / initial change */
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setPriority(initial.priority || "medium");
      setStatus(initial.status || "todo");
      setCommittee(initial.committee || "");
      setZoneId(initial.zoneId || "");
      setDay(initial.day || "DAY 1");
      setAssignees(initial.assignees || []);
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setCommittee("");
      setZoneId("");
      setDay("DAY 1");
      setAssignees([]);
    }
    setSearch("");
    setShowPicker(false);
    setFilterCommittee("");
  }, [open, initial]);

  /* Fetch assignable people when picker is opened or day/filter changes */
  useEffect(() => {
    if (!showPicker) return;
    let cancelled = false;
    setLoadingPeople(true);
    getAssignablePeople(day, filterCommittee || null)
      .then((data) => { if (!cancelled) setPeople(data); })
      .catch(() => { if (!cancelled) setPeople([]); })
      .finally(() => { if (!cancelled) setLoadingPeople(false); });
    return () => { cancelled = true; };
  }, [showPicker, day, filterCommittee]);

  /* Filtered people for search */
  const filteredPeople = useMemo(() => {
    if (!search.trim()) return people;
    const q = search.toLowerCase();
    return people.filter((p) => p.name?.toLowerCase().includes(q));
  }, [people, search]);

  /* Assignee toggle */
  const toggleAssignee = useCallback((person) => {
    setAssignees((prev) => {
      const exists = prev.some((a) => a.personId === person.id);
      if (exists) return prev.filter((a) => a.personId !== person.id);
      return [...prev, { personId: person.id, name: person.name }];
    });
  }, []);

  const isAssigned = useCallback(
    (personId) => assignees.some((a) => a.personId === personId),
    [assignees]
  );

  /* Submit */
  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        committee: committee || null,
        zoneId: zoneId.trim() || null,
        day,
        assignees,
      });
      onClose();
    } catch {
      /* error handled by parent via toast */
    } finally {
      setSaving(false);
    }
  };

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="task-drawer-overlay"
          ref={overlayRef}
          onClick={(e) => e.target === overlayRef.current && onClose()}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-lg rounded-t-xl sm:rounded-xl border border-gc-steel/40 bg-gc-night shadow-2xl shadow-black/50 overflow-hidden"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
          >
            {/* Top accent */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gc-crimson/50 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gc-steel/30 px-5 py-3.5">
              <h2 className="font-display text-xl font-bold tracking-[0.1em] text-gc-white">
                {isEdit ? "EDIT TASK" : "NEW TASK"}
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form body */}
            <div className="max-h-[75vh] overflow-y-auto p-5 space-y-4">

              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Restock water at RCY"
                  className="gc-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional details…"
                  className="gc-input resize-none"
                />
              </div>

              {/* Day + Status row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Day */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                    Day
                  </label>
                  <div className="flex gap-1.5">
                    {DAYS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setDay(d)}
                        className={cn(
                          "flex-1 rounded border px-2 py-1.5 text-xs font-display tracking-wider transition-colors",
                          day === d
                            ? "border-gc-crimson/60 bg-gc-crimson/15 text-gc-crimson"
                            : "border-gc-steel/40 bg-gc-iron text-gc-mist hover:text-gc-cloud"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="gc-input appearance-none !py-1.5 pr-8 !text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gc-mist" />
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                  <Flag className="inline h-3 w-3 mr-1 -translate-y-px" />
                  Priority
                </label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={cn(
                        "flex-1 rounded border px-2 py-1.5 text-xs font-display tracking-wider transition-colors",
                        priority === p.value ? p.color : "border-gc-steel/40 bg-gc-iron text-gc-mist hover:text-gc-cloud"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Committee */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                  Committee
                </label>
                <div className="relative">
                  <select
                    value={committee}
                    onChange={(e) => setCommittee(e.target.value)}
                    className="gc-input appearance-none pr-8"
                  >
                    <option value="">None</option>
                    {COMMITTEE_NAMES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gc-mist" />
                </div>
              </div>

              {/* Zone ID */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                  <MapPin className="inline h-3 w-3 mr-1 -translate-y-px" />
                  Zone (optional)
                </label>
                <input
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  placeholder="e.g. ES-1, RCY, Booth-3"
                  className="gc-input"
                />
              </div>

              {/* ─── Assignees ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                  Assignees
                </label>

                {/* Current assignees */}
                {assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {assignees.map((a) => (
                      <span
                        key={a.personId}
                        className="inline-flex items-center gap-1 rounded-full border border-gc-crimson/30 bg-gc-crimson/10 px-2 py-0.5 text-xs font-body text-gc-crimson"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gc-crimson/20 text-[7px] font-mono font-bold">
                          {initials(a.name)}
                        </span>
                        {a.name}
                        <button
                          onClick={() => setAssignees((prev) => prev.filter((x) => x.personId !== a.personId))}
                          className="ml-0.5 hover:text-gc-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Toggle picker button */}
                <button
                  type="button"
                  onClick={() => setShowPicker((v) => !v)}
                  className="gc-btn-ghost w-full"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {showPicker ? "HIDE PEOPLE" : "ADD PEOPLE FROM ROLES"}
                </button>

                {/* Picker dropdown */}
                <AnimatePresence>
                  {showPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded border border-gc-steel/30 bg-gc-slate p-2.5 space-y-2">
                        {/* Search + committee filter */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gc-mist" />
                            <input
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Search names…"
                              className="gc-input !py-1.5 !text-xs !pl-8"
                            />
                          </div>
                          <div className="relative">
                            <select
                              value={filterCommittee}
                              onChange={(e) => setFilterCommittee(e.target.value)}
                              className="gc-input appearance-none !py-1.5 !text-xs !w-auto pr-7"
                            >
                              <option value="">All</option>
                              {COMMITTEE_NAMES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gc-mist" />
                          </div>
                        </div>

                        {/* People list */}
                        <div className="max-h-40 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gc-steel scrollbar-track-transparent">
                          {loadingPeople && (
                            <div className="flex h-16 items-center justify-center">
                              <span className="text-xs text-gc-mist animate-pulse font-body">Loading…</span>
                            </div>
                          )}
                          {!loadingPeople && filteredPeople.length === 0 && (
                            <div className="flex h-16 items-center justify-center">
                              <span className="text-xs font-body text-gc-mist/50 italic">No people found</span>
                            </div>
                          )}
                          {!loadingPeople && filteredPeople.map((p) => {
                            const selected = isAssigned(p.id);
                            return (
                              <button
                                key={p.id}
                                onClick={() => toggleAssignee(p)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
                                  selected
                                    ? "bg-gc-crimson/10 border border-gc-crimson/30"
                                    : "hover:bg-gc-iron/60 border border-transparent"
                                )}
                              >
                                <span className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-mono font-bold",
                                  selected ? "bg-gc-crimson/20 text-gc-crimson" : "bg-gc-iron text-gc-mist"
                                )}>
                                  {initials(p.name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className={cn("block text-xs font-body truncate", selected ? "text-gc-crimson" : "text-gc-cloud")}>
                                    {p.name}
                                  </span>
                                  {p.assignments?.length > 0 && (
                                    <span className="block text-[9px] font-mono text-gc-mist truncate">
                                      {p.assignments.map((a) => a.committee).filter(Boolean).slice(0, 2).join(", ")}
                                    </span>
                                  )}
                                </div>
                                {selected && (
                                  <span className="text-[8px] font-display tracking-widest text-gc-crimson">ASSIGNED</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── Action buttons ─── */}
              <div className="flex items-center gap-2 pt-2 border-t border-gc-steel/20">
                {isEdit && onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex items-center gap-1 rounded-md border border-gc-danger/30 bg-gc-danger/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gc-danger hover:bg-gc-danger/20 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    DELETE
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={onClose}
                  className="gc-btn-ghost"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!title.trim() || saving}
                  className={cn(
                    "gc-btn-primary",
                    (!title.trim() || saving) && "opacity-40 pointer-events-none"
                  )}
                >
                  {saving ? "SAVING…" : isEdit ? "UPDATE" : "CREATE"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
