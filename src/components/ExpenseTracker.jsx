import { useState } from "react";
import { Plus, Receipt, TrendingDown, FileSpreadsheet } from "lucide-react";
import { useCollection } from "../hooks/useFirestore";
import { useAuth } from "../hooks/useAuth";
import { logActivity } from "../lib/auditLog";
import { ROLE_COMMITTEES as COMMITTEES, EXPENSE_CATEGORIES } from "../lib/constants";
import { peso, fmtDate, cn } from "../lib/utils";
import { exportExpenses } from "../lib/exportExcel";

export default function ExpenseTracker() {
  const { user, profile }     = useAuth();
  const isViewer = profile?.role === "viewer";
  const { docs: expenses, add } = useCollection("expenses");
  const [showForm, setShowForm] = useState(false);
  const [item, setItem]       = useState("");
  const [amount, setAmount]   = useState("");
  const [category, setCategory] = useState("");
  const [comm, setComm]       = useState(profile?.committee || "");
  const [busy, setBusy]       = useState(false);

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!item.trim() || !amount) return;
    setBusy(true);
    try {
      await add({
        item: item.trim(),
        amount: parseFloat(amount),
        category,
        committee: comm,
        status: "pending",
        userId: user.uid,
        userName: profile?.name || "Unknown",
      });
      logActivity({
        action: "expense.create",
        category: "expense",
        details: `Added expense: ${item.trim()} — ₱${parseFloat(amount).toLocaleString()}`,
        meta: { item: item.trim(), amount: parseFloat(amount), category, committee: comm },
        userId: user.uid,
        userName: profile?.name || "Unknown",
      });
      setItem("");
      setAmount("");
      setCategory("");
      setShowForm(false);
    } catch (err) {
      // Silently handled — error will show via ErrorBoundary or toast if available
      if (import.meta.env.DEV) console.error("[ExpenseTracker] submit failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center justify-between rounded bg-gc-warning/8 border border-gc-warning/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-gc-warning" />
          <span className="text-sm font-semibold text-gc-cloud">Total Spent</span>
        </div>
        <div className="flex items-center gap-3">
          {expenses.length > 0 && (
            <button
              onClick={() => exportExpenses(expenses)}
              className="flex items-center gap-1.5 rounded border border-gc-success/30 bg-gc-success/8 px-3 py-1.5 text-[11px] font-display tracking-wider text-gc-success hover:bg-gc-success/15 hover:border-gc-success/50 transition-colors"
              title="Export expenses to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export
            </button>
          )}
          <span className="font-mono text-2xl font-bold text-gc-warning">
            {peso(total)}
          </span>
        </div>
      </div>

      {/* Add button */}
      {!isViewer && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="gc-btn-ghost w-full"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      )}

      {/* Form */}
      {!isViewer && showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded bg-gc-iron border border-gc-steel/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                Item
              </label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="gc-input"
                placeholder="e.g. Tarpaulin printing"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                Amount (₱)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="gc-input font-mono"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gc-mist">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="gc-input"
              >
                <option value="">Select…</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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

          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="gc-btn-primary flex-1">
              {busy ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <><Receipt className="h-4 w-4" /> Save Expense</>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="gc-btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Expense list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {expenses.length === 0 && (
          <p className="text-sm text-gc-hint text-center py-6">No expenses recorded yet.</p>
        )}
        {expenses.map((exp) => {
          const committee = COMMITTEES.find((c) => c.id === exp.committee);
          return (
            <div
              key={exp.id}
              className="flex items-center gap-3 rounded bg-gc-iron border border-gc-steel/50 px-3 py-2.5"
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: committee?.color || "#666" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gc-cloud truncate">{exp.item}</p>
                <p className="text-[10px] text-gc-hint font-mono">
                  {exp.category || "Uncategorized"} · {committee?.name || "General"} · {fmtDate(exp.timestamp)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-sm font-bold text-gc-warning">
                  {peso(exp.amount)}
                </span>
                <span
                  className={cn(
                    "block text-[10px] font-semibold mt-0.5",
                    exp.status === "approved" ? "text-gc-success" :
                    exp.status === "rejected" ? "text-gc-danger" :
                    "text-gc-mist"
                  )}
                >
                  {exp.status || "pending"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
