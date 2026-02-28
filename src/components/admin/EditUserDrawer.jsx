import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  UserCog,
  Eye,
  ToggleLeft,
  ToggleRight,
  Mail,
  Calendar,
  User,
  Plus,
  Trash2,
} from "lucide-react";
import { cn, fmtDate } from "../../lib/utils";
import { COMMITTEE_NAMES, DAY_SLOTS, APP_ROLES, normalizeCommitteeName, normalizeCommittees } from "../../lib/roleConfig";
import { updateUserRoleAndCommittee } from "../../lib/adminApi";
import { logActivity } from "../../lib/auditLog";
import { useAuth } from "../../hooks/useAuth";

const ROLE_ICONS = {
  admin:   ShieldAlert,
  proctor: UserCog,
  viewer:  Eye,
};

const ROLE_COLORS = {
  admin:   { ring: "border-gc-crimson",  bg: "bg-gc-crimson/15", text: "text-gc-crimson",  shadow: "shadow-[0_0_14px_rgba(200,16,46,0.25)]" },
  proctor: { ring: "border-gc-success",  bg: "bg-gc-success/12", text: "text-gc-success",  shadow: "shadow-[0_0_14px_rgba(34,197,94,0.2)]" },
  viewer:  { ring: "border-gc-cloud",    bg: "bg-gc-steel/30",   text: "text-gc-cloud",    shadow: "" },
};

const ROLE_RANK = { admin: 3, proctor: 2, viewer: 0 };

/**
 * User Detail side-drawer — view user info, edit role/committee/active.
 * Uses the updateUserRoleAndCommittee Cloud Function for all changes.
 */
export default function EditUserDrawer({ user, open, onClose, onSaved }) {
  const { user: authUser, profile: authProfile } = useAuth();
  const overlayRef = useRef(null);
  const [role, setRole]               = useState("");
  const [committees, setCommittees]   = useState([]); // [{ committee, day }]
  const [active, setActive]           = useState(true);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);

  /* inline add-assignment form */
  const [addingComm, setAddingComm] = useState(false);
  const [newComm, setNewComm]       = useState(COMMITTEE_NAMES[0]);
  const [newDay, setNewDay]         = useState(DAY_SLOTS[0]);

  /* Sync form state whenever user changes — normalise committee names to canonical form */
  useEffect(() => {
    if (user) {
      setRole(user.role || "proctor");
      // Support both legacy single `committee` and new `committees` array
      if (Array.isArray(user.committees) && user.committees.length > 0) {
        setCommittees(normalizeCommittees(user.committees));
      } else if (user.committee) {
        setCommittees([{ committee: normalizeCommitteeName(user.committee), day: "DAY1/2" }]);
      } else {
        setCommittees([]);
      }
      setActive(user.active !== false);
      setToast(null);
      setAddingComm(false);
    }
  }, [user]);

  /* Escape to close */
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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setToast(null);
    try {
      await updateUserRoleAndCommittee(user.id, {
        role,
        committees,
        active,
      });
      logActivity({
        action: "user.update",
        category: "admin",
        details: `Updated ${user.name}: role=${role}, active=${active}, committees=${committees.map(c => c.committee).join(", ") || "none"}`,
        meta: { targetUid: user.id, role, committees, active },
        userId: authUser?.uid || "admin",
        userName: authProfile?.name || "Admin",
      });
      setToast({ type: "success", msg: "User updated successfully." });
      onSaved?.({ ...user, role, committees, active });
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Failed to update user." });
    } finally {
      setSaving(false);
    }
  };

  const MAX_COMMITTEES = 3;

  /* helpers for committee pill management */
  const addCommitteeEntry = () => {
    if (committees.length >= MAX_COMMITTEES) return;
    const pair = { committee: newComm, day: newDay };
    const dup = committees.some(
      (c) => c.committee === pair.committee && c.day === pair.day
    );
    if (dup) return; // exact duplicate — silently ignore
    setCommittees((prev) => [...prev, pair]);
    setAddingComm(false);
    setNewComm(COMMITTEE_NAMES[0]);
    setNewDay(DAY_SLOTS[0]);
  };

  const removeCommitteeEntry = (idx) => {
    setCommittees((prev) => prev.filter((_, i) => i !== idx));
  };

  /* Serialise for comparison — normalise so dirty-check matches loaded state */
  const origCommittees = user
    ? (Array.isArray(user.committees) && user.committees.length > 0
        ? normalizeCommittees(user.committees)
        : user.committee
          ? [{ committee: normalizeCommitteeName(user.committee), day: "DAY1/2" }]
          : [])
    : [];

  const committeesChanged =
    JSON.stringify(committees) !== JSON.stringify(origCommittees);

  const dirty =
    user &&
    (role !== (user.role || "proctor") ||
      committeesChanged ||
      active !== (user.active !== false));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          onClick={(e) => e.target === overlayRef.current && onClose()}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.aside
            className="relative flex w-full max-w-md flex-col border-l border-gc-steel/60 bg-gc-night shadow-2xl shadow-black/60"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-gc-steel/40 px-5 py-4">
              <div>
                <h2 className="font-display text-xl font-bold tracking-wider text-gc-white">
                  USER DETAILS
                </h2>
                {user && (
                  <p className="mt-0.5 text-xs text-gc-mist font-body truncate max-w-[260px]">
                    {user.name}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* ── Read-only info section ── */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gc-mist font-body">
                  Account Information
                </h3>
                <div className="rounded border border-gc-steel/60 bg-gc-slate/50 divide-y divide-gc-steel/40">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <User className="h-4 w-4 text-gc-mist shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-gc-hint font-body">Name</p>
                      <p className="text-sm text-gc-white font-body font-medium truncate">
                        {user?.name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Mail className="h-4 w-4 text-gc-mist shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-gc-hint font-body">Email</p>
                      <p className="text-sm text-gc-white font-body font-medium truncate">
                        {user?.email || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="h-4 w-4 text-gc-mist shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-gc-hint font-body">Created</p>
                      <p className="text-sm text-gc-white font-body font-medium">
                        {fmtDate(user?.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Role selector ── */}
              <div>
                <label className="block text-[11px] font-body font-semibold uppercase tracking-wider text-gc-mist mb-2.5">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {APP_ROLES.map((r) => {
                    const Icon = ROLE_ICONS[r.value] || UserCog;
                    const colors = ROLE_COLORS[r.value] || ROLE_COLORS.viewer;
                    const selected = role === r.value;
                    const isSelf = user?.id === authUser?.uid;
                    const currentRoleRank = ROLE_RANK[user?.role || "proctor"] ?? 0;
                    const isDowngrade = (ROLE_RANK[r.value] ?? 0) < currentRoleRank;
                    const blocked = isSelf && isDowngrade; // admins can't downgrade themselves
                    return (
                      <button
                        key={r.value}
                        onClick={() => !blocked && setRole(r.value)}
                        disabled={blocked}
                        title={blocked ? "You cannot downgrade your own role" : r.description}
                        className={cn(
                          "flex items-center gap-2.5 rounded border py-3 px-3.5 text-left transition-all duration-200",
                          blocked
                            ? "border-gc-steel/40 bg-gc-iron/30 text-gc-steel cursor-not-allowed opacity-40"
                            : selected
                              ? cn(colors.ring, colors.bg, colors.text, colors.shadow)
                              : "border-gc-steel bg-gc-iron text-gc-cloud hover:border-gc-mist"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-body font-semibold">{r.label}</p>
                          <p className={cn(
                            "text-[10px] font-body leading-tight mt-0.5 truncate",
                            selected ? "opacity-80" : "text-gc-mist"
                          )}>
                            {r.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Committees (multi-assignment pills) ── */}
              <div>
                <label className="block text-[11px] font-body font-semibold uppercase tracking-wider text-gc-mist mb-2">
                  Committees
                  <span className="ml-2 font-mono text-gc-hint text-[10px]">{committees.length}/{MAX_COMMITTEES}</span>
                </label>

                {/* Existing assignment pills */}
                <div className="space-y-1.5 mb-2">
                  {committees.length === 0 && (
                    <p className="text-xs text-gc-hint italic">No committees assigned.</p>
                  )}
                  {committees.map((c, i) => (
                    <div
                      key={`${c.committee}-${c.day}-${i}`}
                      className="flex items-center gap-2 rounded border border-gc-steel/60 bg-gc-iron px-3 py-2 group"
                    >
                      <span className="text-xs text-gc-cloud flex-1 truncate">
                        {c.committee}
                      </span>
                      <span className={cn(
                        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0",
                        c.day === "DAY 1"  ? "bg-red-500/15 text-red-400 border-red-500/25" :
                        c.day === "DAY 2"  ? "bg-blue-500/15 text-blue-400 border-blue-500/25" :
                                             "bg-amber-500/15 text-amber-400 border-amber-500/25"
                      )}>
                        {c.day}
                      </span>
                      <button
                        onClick={() => removeCommitteeEntry(i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gc-mist hover:text-gc-danger"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add committee entry form */}
                {addingComm ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gc-steel/20">
                    <select
                      value={newComm}
                      onChange={(e) => setNewComm(e.target.value)}
                      className="gc-input text-xs py-1.5 flex-1 min-w-[140px]"
                    >
                      {COMMITTEE_NAMES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value)}
                      className="gc-input text-xs py-1.5 w-[100px]"
                    >
                      {DAY_SLOTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <button
                      onClick={addCommitteeEntry}
                      className="gc-btn-primary text-[10px] py-1.5 px-3"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingComm(false)}
                      className="gc-btn-ghost text-[10px] py-1.5 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : committees.length < MAX_COMMITTEES ? (
                  <button
                    onClick={() => setAddingComm(true)}
                    className="flex items-center gap-1.5 text-[10px] text-gc-mist hover:text-gc-crimson transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add committee assignment
                  </button>
                ) : (
                  <p className="text-[10px] text-gc-faded italic">Maximum {MAX_COMMITTEES} committees reached.</p>
                )}
              </div>

              {/* ── Active toggle ── */}
              <div>
                <label className="block text-[11px] font-body font-semibold uppercase tracking-wider text-gc-mist mb-2">
                  Account Status
                </label>
                <button
                  onClick={() => setActive(!active)}
                  className={cn(
                    "flex w-full items-center justify-between rounded border px-4 py-3 transition-all duration-200",
                    active
                      ? "border-gc-success/30 bg-gc-success/8 text-gc-success"
                      : "border-gc-danger/30 bg-gc-danger/8 text-gc-danger"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        active ? "bg-gc-success" : "bg-gc-danger"
                      )}
                    />
                    <span className="text-sm font-body font-semibold">
                      {active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  {active ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <p className="text-[10px] text-gc-hint font-body mt-1.5 pl-1">
                  {active
                    ? "User can sign in and access the system."
                    : "User is locked out and cannot sign in."}
                </p>
              </div>

              {/* Toast */}
              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={cn(
                      "flex items-center gap-2 rounded px-4 py-3 text-xs font-body font-medium",
                      toast.type === "success"
                        ? "bg-gc-success/10 text-gc-success border border-gc-success/20"
                        : "bg-gc-danger/10 text-gc-danger border border-gc-danger/20"
                    )}
                  >
                    {toast.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {toast.msg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-gc-steel/40 px-5 py-4 flex items-center gap-3">
              <button onClick={onClose} className="gc-btn-ghost flex-1">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className={cn(
                  "gc-btn-primary flex-1",
                  (saving || !dirty) && "opacity-50 pointer-events-none"
                )}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
