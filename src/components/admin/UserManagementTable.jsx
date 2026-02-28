import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  Pencil,
  ToggleLeft,
  ToggleRight,
  MailWarning,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Eye,
} from "lucide-react";
import { cn, fmtDate, initials } from "../../lib/utils";
import { COMMITTEE_NAMES } from "../../lib/roleConfig";
import UserStatusBadge from "./UserStatusBadge";
import { UserTableSkeleton } from "../Skeleton";

const ROLES_FILTER = [
  { value: "",        label: "All Roles" },
  { value: "admin",   label: "Admin" },
  { value: "proctor", label: "Proctor" },
  { value: "head",    label: "Head" },
  { value: "viewer",  label: "Viewer" },
];

const PAGE_SIZE = 12;

const ROLE_STYLE = {
  admin:   { icon: ShieldAlert, color: "text-gc-crimson",  bg: "bg-gc-crimson/12", border: "border-gc-crimson/25" },
  proctor: { icon: UserCog,     color: "text-gc-success",  bg: "bg-gc-success/12", border: "border-gc-success/25" },
  head:    { icon: ShieldCheck, color: "text-gc-warning",  bg: "bg-gc-warning/12", border: "border-gc-warning/25" },
  viewer:  { icon: Eye,         color: "text-gc-cloud",    bg: "bg-gc-steel/30",   border: "border-gc-steel/40" },
};

const ROLE_LABEL = { admin: "Admin", proctor: "Proctor", head: "Head", viewer: "Viewer" };

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.proctor;
  const Icon = s.icon;
  const label = ROLE_LABEL[role] || role;
  return (
    <span
      className={cn(
        "gc-chip border",
        s.bg,
        s.color,
        s.border
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

/**
 * Full-featured user management table with search, filters, pagination, and row actions.
 */
export default function UserManagementTable({
  users,
  loading,
  onEdit,
  onToggleActive,
  onSendReset,
  onDelete,
  togglingUid,
  resetingUid,
  deletingUid,
}) {
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState("");
  const [commFilter, setCommFilter]   = useState("");
  const [page, setPage]               = useState(0);

  /* Filtered list */
  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (commFilter) {
      list = list.filter((u) => {
        // Support new `committees` array and legacy single `committee` field
        if (Array.isArray(u.committees) && u.committees.length > 0) {
          return u.committees.some((c) => c.committee === commFilter);
        }
        return u.committee === commFilter;
      });
    }
    return list;
  }, [users, search, roleFilter, commFilter]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* Reset page when filters change */
  const applySearch = (v) => { setSearch(v); setPage(0); };
  const applyRole   = (v) => { setRoleFilter(v); setPage(0); };
  const applyComm   = (v) => { setCommFilter(v); setPage(0); };

  /* ── Row animation variants ── */
  const rowVariants = {
    hidden: { opacity: 0, y: 12 },
    show:   (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.03, type: "spring", damping: 24, stiffness: 300 },
    }),
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gc-mist pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => applySearch(e.target.value)}
            placeholder="Search by name or email…"
            className="gc-input pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gc-mist shrink-0 hidden sm:block" />
          <select
            value={roleFilter}
            onChange={(e) => applyRole(e.target.value)}
            className="gc-input w-auto min-w-[130px] appearance-none"
          >
            {ROLES_FILTER.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={commFilter}
            onChange={(e) => applyComm(e.target.value)}
            className="gc-input w-auto min-w-[170px] appearance-none"
          >
            <option value="">All Committees</option>
            {COMMITTEE_NAMES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Count bar ── */}
      <div className="flex items-center gap-2 text-xs font-body text-gc-mist">
        <Users className="h-3.5 w-3.5" />
        <span>
          <span className="text-gc-cloud font-semibold">{filtered.length}</span>{" "}
          user{filtered.length !== 1 && "s"} found
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded border border-gc-steel/40 bg-gc-slate/60">
        {loading ? (
          <UserTableSkeleton />
        ) : pageData.length === 0 ? (
          <div className="py-16 text-center text-sm text-gc-mist font-body">
            No users match the current filters.
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-sm font-body">
            <thead>
              <tr className="border-b border-gc-steel/30 text-left text-[11px] uppercase tracking-wider text-gc-mist">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Committee</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {pageData.map((u, idx) => (
                  <motion.tr
                    key={u.id}
                    custom={idx}
                    variants={rowVariants}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    layout
                    className="group border-b border-gc-steel/15 last:border-0 hover:bg-gc-iron/40 transition-colors"
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                            u.active ? "text-white" : "text-gc-white"
                          )}
                          style={{
                            background: u.active
                              ? "linear-gradient(135deg, rgb(var(--gc-crimson)), rgb(var(--gc-scarlet)))"
                              : "linear-gradient(135deg, rgb(var(--gc-steel)), rgb(var(--gc-mist)))",
                          }}
                        >
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gc-white truncate">
                            {u.name || "—"}
                          </p>
                          <p className="text-[11px] text-gc-mist truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>

                    {/* Committee */}
                    <td className="px-4 py-3 hidden md:table-cell text-gc-cloud text-xs">
                      {(() => {
                        // Display committees from new array or legacy field
                        if (Array.isArray(u.committees) && u.committees.length > 0) {
                          const names = [...new Set(u.committees.map((c) => c.committee))];
                          return (
                            <span title={names.join(", ")} className="truncate block max-w-[200px]">
                              {names.join(", ")}
                            </span>
                          );
                        }
                        return u.committee || <span className="text-gc-steel">—</span>;
                      })()}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <UserStatusBadge active={u.active !== false} />
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gc-mist whitespace-nowrap">
                      {fmtDate(u.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => onEdit(u)}
                          className="flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-crimson hover:bg-gc-crimson/10 transition-colors"
                          title="Edit role / committee"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {/* Toggle active */}
                        <button
                          onClick={() => onToggleActive(u)}
                          disabled={togglingUid === u.id}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded transition-colors",
                            u.active !== false
                              ? "text-gc-success hover:text-gc-danger hover:bg-gc-danger/10"
                              : "text-gc-danger hover:text-gc-success hover:bg-gc-success/10",
                            togglingUid === u.id && "opacity-50 pointer-events-none"
                          )}
                          title={u.active !== false ? "Disable account" : "Enable account"}
                        >
                          {togglingUid === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : u.active !== false ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>

                        {/* Password reset */}
                        <button
                          onClick={() => onSendReset(u)}
                          disabled={resetingUid === u.id}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-warning hover:bg-gc-warning/10 transition-colors",
                            resetingUid === u.id && "opacity-50 pointer-events-none"
                          )}
                          title="Send password reset email"
                        >
                          {resetingUid === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MailWarning className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDelete(u)}
                          disabled={deletingUid === u.id}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-danger hover:bg-gc-danger/10 transition-colors",
                            deletingUid === u.id && "opacity-50 pointer-events-none"
                          )}
                          title="Delete account"
                        >
                          {deletingUid === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-body text-gc-mist">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded border border-gc-steel/40 transition-colors",
                page === 0
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-gc-iron/60 hover:border-gc-mist/40"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded border border-gc-steel/40 transition-colors",
                page >= totalPages - 1
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-gc-iron/60 hover:border-gc-mist/40"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
