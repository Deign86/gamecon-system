import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { setUserActiveStatus, sendPasswordReset, deleteUser } from "../../lib/adminApi";
import { cn } from "../../lib/utils";
import UserManagementTable from "./UserManagementTable";
import EditUserDrawer from "./EditUserDrawer";
import CreateUserForm from "./CreateUserForm";
import Modal from "../Modal";

/**
 * Admin Users Page — real-time user list with edit, toggle, and password reset.
 * Rendered as a tab inside the AppShell (tab === "users") or as a standalone route.
 */
export default function AdminUsersPage({ standalone = false, onBack }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [editUser, setEditUser]       = useState(null);
  const [confirmUser, setConfirmUser]   = useState(null); // for disable confirmation
  const [deleteTarget, setDeleteTarget] = useState(null); // for delete confirmation
  const [togglingUid, setTogglingUid]   = useState(null);
  const [resetingUid, setResetingUid]   = useState(null);
  const [deletingUid, setDeletingUid]   = useState(null);
  const [toast, setToast]               = useState(null);

  /* ── Real-time Firestore subscription ── */
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "users"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [isAdmin]);

  /* ── Auto-dismiss toast ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Handlers ── */
  const handleEdit = useCallback((u) => setEditUser(u), []);

  const handleToggleActive = useCallback((u) => {
    if (u.active !== false) {
      // About to disable → show confirmation
      setConfirmUser(u);
    } else {
      // Re-enable immediately
      doToggle(u.id, true);
    }
  }, []);

  const doToggle = async (uid, active) => {
    setTogglingUid(uid);
    try {
      await setUserActiveStatus(uid, active);
      setToast({
        type: "success",
        msg: active ? "Account enabled." : "Account disabled.",
      });
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Toggle failed." });
    } finally {
      setTogglingUid(null);
      setConfirmUser(null);
    }
  };

  const handleSendReset = useCallback(async (u) => {
    setResetingUid(u.id);
    try {
      await sendPasswordReset(u.email);
      setToast({
        type: "success",
        msg: `Password reset sent to ${u.email}`,
      });
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Reset email failed." });
    } finally {
      setResetingUid(null);
    }
  }, []);

  const handleDelete = useCallback((u) => setDeleteTarget(u), []);

  const doDelete = async (uid) => {
    setDeletingUid(uid);
    try {
      await deleteUser(uid);
      setToast({ type: "success", msg: "Account deleted." });
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Delete failed." });
    } finally {
      setDeletingUid(null);
      setDeleteTarget(null);
    }
  };

  const handleDrawerSaved = useCallback((updatedUser) => {
    setToast({ type: "success", msg: `${updatedUser.name} updated.` });
    // Firestore snapshot will auto-refresh the table
  }, []);

  /* ── Guard ── */
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gc-mist font-body text-sm gap-3">
        <ShieldAlert className="h-10 w-10 text-gc-crimson" />
        <p className="font-display text-xl text-gc-crimson tracking-wide">ACCESS DENIED</p>
        <p>You need admin privileges to view this page.</p>
      </div>
    );
  }

  return (
    <motion.div
      key="admin-users"
      className={cn("mx-auto w-full", standalone ? "max-w-6xl px-4 py-6" : "max-w-5xl")}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
    >
      {/* ── Page header ── */}
      <div className="mb-6 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gc-steel/40 text-gc-mist hover:text-gc-white hover:border-gc-mist/60 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #C8102E, #E31837)" }}
          >
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-gc-white leading-none">
              USER ACCOUNTS
            </h1>
            <p className="text-xs font-body text-gc-mist mt-0.5">
              Manage roles, committees, and account status
            </p>
          </div>
        </div>
      </div>

      {/* ── Create user form ── */}
      <CreateUserForm
        onCreated={() =>
          setToast({ type: "success", msg: "New proctor account created." })
        }
      />

      {/* ── Table ── */}
      <UserManagementTable
        users={users}
        loading={loading}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onSendReset={handleSendReset}
        onDelete={handleDelete}
        togglingUid={togglingUid}
        resetingUid={resetingUid}
        deletingUid={deletingUid}
      />

      {/* ── Edit drawer ── */}
      <EditUserDrawer
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSaved={handleDrawerSaved}
      />

      {/* ── Disable confirmation modal ── */}
      <Modal
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        title="Disable Account"
      >
        <div className="space-y-4 font-body text-sm">
          <div className="flex items-start gap-3 rounded-lg border border-gc-danger/20 bg-gc-danger/8 p-4">
            <AlertCircle className="h-5 w-5 text-gc-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-gc-cloud font-medium">
                Are you sure you want to disable this account?
              </p>
              <p className="text-gc-mist mt-1 text-xs leading-relaxed">
                <span className="text-gc-white font-semibold">{confirmUser?.name}</span>{" "}
                ({confirmUser?.email}) will lose access to the system immediately.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirmUser(null)}
              className="gc-btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => doToggle(confirmUser.id, false)}
              disabled={togglingUid === confirmUser?.id}
              className={cn(
                "gc-btn flex-1 text-white",
                "bg-gc-danger hover:bg-gc-danger/80",
                togglingUid === confirmUser?.id && "opacity-50 pointer-events-none"
              )}
              style={{ boxShadow: "0 2px 12px rgba(239,68,68,0.3)" }}
            >
              {togglingUid === confirmUser?.id ? "Disabling…" : "Disable Account"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Account"
      >
        <div className="space-y-4 font-body text-sm">
          <div className="flex items-start gap-3 rounded-lg border border-gc-danger/20 bg-gc-danger/8 p-4">
            <AlertCircle className="h-5 w-5 text-gc-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-gc-cloud font-medium">
                This action is permanent and cannot be undone.
              </p>
              <p className="text-gc-mist mt-1 text-xs leading-relaxed">
                <span className="text-gc-white font-semibold">{deleteTarget?.name}</span>{" "}
                ({deleteTarget?.email}) will be permanently removed from the system.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="gc-btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => doDelete(deleteTarget.id)}
              disabled={deletingUid === deleteTarget?.id}
              className={cn(
                "gc-btn flex-1 text-white",
                "bg-gc-danger hover:bg-gc-danger/80",
                deletingUid === deleteTarget?.id && "opacity-50 pointer-events-none"
              )}
              style={{ boxShadow: "0 2px 12px rgba(239,68,68,0.3)" }}
            >
              {deletingUid === deleteTarget?.id ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Global toast ── */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                "pointer-events-auto flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-body font-medium shadow-2xl shadow-black/40 border backdrop-blur-md",
                toast.type === "success"
                  ? "bg-gc-success/15 text-gc-success border-gc-success/25"
                  : "bg-gc-danger/15 text-gc-danger border-gc-danger/25"
              )}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {toast.msg}
              <button
                onClick={() => setToast(null)}
                className="ml-2 text-gc-mist hover:text-gc-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
