import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, CheckCircle, UserRound, BarChart3, ClipboardCheck, CloudUpload } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useQueuedWrite } from "../../hooks/useQueuedWrite";
import { logActivity } from "../../lib/auditLog";
import { createContribution, subscribeAllContributions } from "../../lib/contributionsFirestore";
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
  const { isOnline } = useOnlineStatus();
  const { execute: queuedWrite } = useQueuedWrite();
  const isViewer = profile?.role === "viewer";
  const [contributions, setContributions] = useState([]);
  const [task, setTask]     = useState("");
  const [desc, setDesc]     = useState("");

  function normalizeCommitteeId(value) {
    if (!value) return "";
    const normalized = String(value).trim().toLowerCase();

    const byId = COMMITTEES.find((c) => c.id === normalized);
    if (byId) return byId.id;

    const byName = COMMITTEES.find((c) => c.name.toLowerCase() === normalized);
    if (byName) return byName.id;

    const firstWord = normalized.split(/[\s/&,-]+/)[0];
    const byFirst = COMMITTEES.find((c) =>
      c.name.toLowerCase().startsWith(firstWord) || c.id.startsWith(firstWord)
    );

    return byFirst?.id || "";
  }

  const defaultComm =
    Array.isArray(profile?.committees) && profile.committees.length > 0
      ? profile.committees[0].committee || profile.committees[0]
      : profile?.committee || "";
  const [comm, setComm]     = useState(normalizeCommitteeId(defaultComm));
  const [busy, setBusy]     = useState(false);
  const [success, setSuccess] = useState(false);
  const [queued, setQueued]   = useState(false);
  // RC-6 fix: store timer IDs so they can be cancelled if the component
  // unmounts before the feedback banners auto-dismiss.
  const successTimerRef = useRef(null);
  const queuedTimerRef  = useRef(null);
  useEffect(() => {
    const unsub = subscribeAllContributions((docs) => setContributions(docs));
    return unsub;
  }, []);
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    if (queuedTimerRef.current)  clearTimeout(queuedTimerRef.current);
  }, []);

  // Legacy compat: older docs may identify the subject by name, not auth uid.
  const myContribs = contributions.filter((c) => {
    const uid = user?.uid || "";
    const myName = String(profile?.name || "").trim().toLowerCase();
    const docUserId = String(c.userId || "").trim().toLowerCase();
    const docUserName = String(c.userName || "").trim().toLowerCase();

    if (uid && c.userId === uid) return true;
    if (myName && docUserName === myName) return true;
    if (myName && docUserId === myName) return true;

    return uid && c.loggedBy === uid && !c.userId && !c.userName;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (isViewer || !task.trim()) return;
    setBusy(true);
    try {
      const { queued: wasQueued } = await queuedWrite(() =>
        createContribution({
          userId: user.uid,
          userName: profile?.name || "Unknown",
          committee: normalizeCommitteeId(comm),
          task: task.trim(),
          details: desc.trim(),
          loggedBy: user.uid,
        })
      );
      logActivity({
        action: "contribution.create",
        category: "contribution",
        details: `Self-logged contribution: ${task.trim()}${wasQueued ? " [queued offline]" : ""}`,
        meta: { committee: comm, task: task.trim(), queued: wasQueued },
        userId: user.uid,
        userName: profile?.name || "Unknown",
      });
      setTask("");
      setDesc("");
      if (wasQueued) {
        setQueued(true);
        if (queuedTimerRef.current) clearTimeout(queuedTimerRef.current);
        queuedTimerRef.current = setTimeout(() => setQueued(false), 3000);
      } else {
        setSuccess(true);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setSuccess(false), 2000);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Add form — hidden for viewer role */}
      {!isViewer && (
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
            success && "!bg-gc-success/80",
            queued && "!bg-gc-warning/80 !border-gc-warning/50"
          )}
        >
          {queued ? (
            <><CloudUpload className="h-4 w-4" /> Queued for sync!</>
          ) : success ? (
            <><CheckCircle className="h-4 w-4" /> Logged!</>
          ) : busy ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <><Send className="h-4 w-4" /> {!isOnline ? "Log (Offline)" : "Log Contribution"}</>
          )}
        </button>

        {/* Offline queue notice */}
        {!isOnline && (
          <p className="text-[10px] font-mono text-gc-warning/70 flex items-center gap-1">
            <CloudUpload className="h-3 w-3" />
            Offline — contributions will sync automatically when signal returns
          </p>
        )}
      </form>
      )}

      {/* Recent contributions (my own) */}
      <div>
        <h3 className="mb-3 font-display text-base font-bold tracking-wider text-gc-mist">
          MY RECENT
        </h3>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {myContribs.length === 0 && (
            <p className="text-sm text-gc-hint text-center py-6">No contributions logged yet.</p>
          )}
          {myContribs.map((c) => {
            const committee = COMMITTEES.find((cm) => cm.id === normalizeCommitteeId(c.committee));
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
                  <p className="text-sm font-semibold text-gc-cloud">{c.task}</p>
                  {(c.details || c.description) && (
                    <p className="text-xs text-gc-mist mt-0.5">{c.details || c.description}</p>
                  )}
                  <p className="text-[10px] text-gc-hint mt-1 font-mono">
                    {committee?.name || "General"} · {fmtDate(c.createdAt || c.timestamp)}
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
