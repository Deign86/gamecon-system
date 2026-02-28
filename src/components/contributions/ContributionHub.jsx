import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle, UserRound, BarChart3, ClipboardCheck } from "lucide-react";
import { useCollection } from "../../hooks/useFirestore";
import { useAuth } from "../../hooks/useAuth";
import { logActivity } from "../../lib/auditLog";
import { ROLE_COMMITTEES as COMMITTEES } from "../../lib/constants";
import { fmtDate, cn } from "../../lib/utils";
import PersonContributionView from "./PersonContributionView";
import CommitteeContributionView from "./CommitteeContributionView";

const TABS = [
  { key: "my-log",     label: "My Log",        Icon: ClipboardCheck },
  { key: "person",     label: "By Person",      Icon: UserRound },
  { key: "committee",  label: "By Committee",   Icon: BarChart3 },
];

/**
 * ContributionHub — consolidated contributions view for the Dashboard modal.
 *
 * Tab 1: "My Log"  — personal contribution form + your recent entries.
 * Tab 2: "By Person"  — class-wide tracker (PersonContributionView).
 * Tab 3: "By Committee" — aggregate view (CommitteeContributionView).
 *
 * Tabs 2 & 3 are only shown to proctor / head / admin roles.
 */
export default function ContributionHub() {
  const { profile } = useAuth();
  const canTrack =
    profile?.role === "admin" ||
    profile?.role === "proctor" ||
    profile?.role === "head" ||
    profile?.role === "committee-head";

  const visibleTabs = canTrack ? TABS : TABS.filter((t) => t.key === "my-log");
  const [activeTab, setActiveTab] = useState("my-log");

  return (
    <div className="space-y-4">
      {/* Internal tab bar — only shown when multiple tabs are available */}
      {visibleTabs.length > 1 && (
        <div className="flex gap-1 rounded border border-gc-steel/20 bg-gc-iron/30 p-1">
          {visibleTabs.map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-2 text-xs sm:text-sm font-semibold transition-all",
                  active
                    ? "bg-gc-void text-gc-white shadow-sm border border-gc-steel/20"
                    : "text-gc-mist hover:text-gc-cloud"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-gc-crimson" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
        >
          {activeTab === "my-log" && <MyLogView />}
          {activeTab === "person" && <PersonContributionView myEntriesOnly={false} />}
          {activeTab === "committee" && <CommitteeContributionView myEntriesOnly={false} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── My Log sub-view (personal contribution form + recent list) ── */
function MyLogView() {
  const { user, profile } = useAuth();
  const { docs: contributions, add } = useCollection("contributions");
  const [task, setTask]     = useState("");
  const [desc, setDesc]     = useState("");

  const defaultComm =
    Array.isArray(profile?.committees) && profile.committees.length > 0
      ? profile.committees[0].committee || profile.committees[0]
      : profile?.committee || "";
  const [comm, setComm]     = useState(defaultComm);
  const [busy, setBusy]     = useState(false);
  const [success, setSuccess] = useState(false);

  // Filter to only the current user's contributions
  const myContribs = contributions.filter((c) => c.userId === user?.uid || c.userName === profile?.name);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!task.trim()) return;
    setBusy(true);
    try {
      await add({
        userId: user.uid,
        userName: profile?.name || "Unknown",
        committee: comm,
        task: task.trim(),
        description: desc.trim(),
      });
      logActivity({
        action: "contribution.create",
        category: "contribution",
        details: `Self-logged contribution: ${task.trim()}`,
        meta: { committee: comm, task: task.trim() },
        userId: user.uid,
        userName: profile?.name || "Unknown",
      });
      setTask("");
      setDesc("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
              Task
            </label>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="gc-input"
              placeholder="e.g. Printed 200 tickets"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
              Committee
            </label>
            <select
              value={comm}
              onChange={(e) => setComm(e.target.value)}
              className="gc-input"
            >
              <option value="">General</option>
              {COMMITTEES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
            Description (optional)
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="gc-input min-h-[80px] resize-none"
            placeholder="Additional details…"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !task.trim()}
          className={cn(
            "gc-btn-primary w-full sm:w-auto",
            success && "!bg-gc-success/80"
          )}
        >
          {success ? (
            <><CheckCircle className="h-4 w-4" /> Logged!</>
          ) : busy ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <><Send className="h-4 w-4" /> Log Contribution</>
          )}
        </button>
      </form>

      {/* Recent contributions (my own) */}
      <div>
        <h3 className="mb-3 font-display text-base font-bold tracking-wider text-gc-mist">
          MY RECENT
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {myContribs.length === 0 && (
            <p className="text-sm text-gc-hint text-center py-6">No contributions logged yet.</p>
          )}
          {myContribs.map((c) => {
            const committee = COMMITTEES.find((cm) => cm.id === c.committee);
            return (
              <div
                key={c.id}
                className="flex items-start gap-3 rounded bg-gc-iron border border-gc-steel/50 px-3 py-2.5"
              >
                <div
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: committee?.color || "#666" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gc-cloud truncate">{c.task}</p>
                  {c.description && (
                    <p className="text-xs text-gc-mist mt-0.5 line-clamp-2">{c.description}</p>
                  )}
                  <p className="text-[10px] text-gc-hint mt-1 font-mono">
                    {committee?.name || "General"} · {fmtDate(c.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
