import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { useCollection } from "../hooks/useFirestore";
import { useAuth } from "../hooks/useAuth";
import { COMMITTEES } from "../data/seed";
import { fmtDate, cn } from "../lib/utils";

export default function ContributionForm() {
  const { user, profile } = useAuth();
  const { docs: contributions, add } = useCollection("contributions");
  const [task, setTask]     = useState("");
  const [desc, setDesc]     = useState("");
  // Default to first committee from the committees array, or fall back to legacy field
  const defaultComm = Array.isArray(profile?.committees) && profile.committees.length > 0
    ? (profile.committees[0].committee || profile.committees[0])
    : (profile?.committee || "");
  const [comm, setComm]     = useState(defaultComm);
  const [busy, setBusy]     = useState(false);
  const [success, setSuccess] = useState(false);

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

      {/* Recent contributions */}
      <div>
        <h3 className="mb-3 font-display text-base font-bold tracking-wider text-gc-mist">
          RECENT
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {contributions.length === 0 && (
            <p className="text-sm text-gc-hint text-center py-6">No contributions logged yet.</p>
          )}
          {contributions.map((c) => {
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
                    {c.userName} · {committee?.name || "General"} · {fmtDate(c.timestamp)}
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
