import { useState } from "react";
import { AlertTriangle, Send, Shield, Clock, MapPin, CheckCircle, RotateCcw, FileSpreadsheet } from "lucide-react";
import { useCollection } from "../hooks/useFirestore";
import { useAuth } from "../hooks/useAuth";
import { logActivity } from "../lib/auditLog";
import { ZONES } from "../lib/constants";
import { fmtDate, cn } from "../lib/utils";
import { exportIncidents } from "../lib/exportExcel";

const SEVERITY = [
  { value: "low",    label: "Low",    color: "gc-chip-green" },
  { value: "medium", label: "Medium", color: "gc-chip-yellow" },
  { value: "high",   label: "High",   color: "gc-chip-red" },
];

const CAN_RESOLVE = ["admin", "proctor", "head", "committee-head"];

export default function IncidentLog() {
  const { user, profile } = useAuth();
  const isViewer = profile?.role === "viewer";
  const { docs: incidents, add, update } = useCollection("incidents");
  const [title, setTitle]     = useState("");
  const [zone, setZone]       = useState("");
  const [severity, setSeverity] = useState("low");
  const [details, setDetails] = useState("");
  const [busy, setBusy]       = useState(false);
  const [resolving, setResolving] = useState(null);

  const canResolve = CAN_RESOLVE.includes(profile?.role);

  async function handleResolve(incId, newStatus) {
    setResolving(incId);
    try {
      await update(incId, {
        status: newStatus,
        ...(newStatus === "resolved" && {
          resolvedBy: user.uid,
          resolvedByName: profile?.name || "Unknown",
        }),
      });
      const inc = incidents.find((i) => i.id === incId);
      logActivity({
        action: newStatus === "resolved" ? "incident.resolve" : "incident.reopen",
        category: "incident",
        details: `${newStatus === "resolved" ? "Resolved" : "Reopened"} incident: ${inc?.title || incId}`,
        meta: { incidentId: incId, newStatus },
        userId: user.uid,
        userName: profile?.name || "Unknown",
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("[IncidentLog] resolve failed:", err);
    } finally {
      setResolving(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isViewer || !title.trim()) return;
    setBusy(true);
    try {
      await add({
        title: title.trim(),
        zoneId: zone,
        severity,
        details: details.trim(),
        status: "open",
        reportedBy: user.uid,
        reporterName: profile?.name || "Unknown",
      });
      logActivity({
        action: "incident.create",
        category: "incident",
        details: `Reported incident: ${title.trim()} (${severity})`,
        meta: { title: title.trim(), zoneId: zone, severity },
        userId: user.uid,
        userName: profile?.name || "Unknown",
      });
      setTitle("");
      setZone("");
      setSeverity("low");
      setDetails("");
    } catch (err) {
      if (import.meta.env.DEV) console.error("[IncidentLog] submit failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Quick report form — hidden for viewer role */}
      {!isViewer && (
      <form onSubmit={handleSubmit} className="space-y-3 rounded bg-gc-danger/5 border border-gc-danger/15 p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-gc-danger" />
          <span className="text-xs font-bold uppercase tracking-wider text-gc-danger">Quick Report</span>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="gc-input"
          placeholder="What happened?"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="gc-input"
          >
            <option value="">Zone (optional)</option>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="gc-input"
          >
            {SEVERITY.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="gc-input min-h-[60px] resize-none"
          placeholder="Additional details…"
        />

        <button type="submit" disabled={busy || !title.trim()} className="gc-btn-primary w-full sm:w-auto">
          {busy ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <><Send className="h-4 w-4" /> Report Incident</>
          )}
        </button>
      </form>
      )}

      {/* Incident list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold tracking-wider text-gc-mist">
            RECENT INCIDENTS
          </h3>
          {incidents.length > 0 && (
            <button
              onClick={() => exportIncidents(incidents)}
              className="flex items-center gap-1.5 rounded border border-gc-success/30 bg-gc-success/8 px-3 py-1.5 text-[11px] font-display tracking-wider text-gc-success hover:bg-gc-success/15 hover:border-gc-success/50 transition-colors"
              title="Export incidents to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {incidents.length === 0 && (
            <div className="text-center py-8">
              <Shield className="mx-auto h-8 w-8 text-gc-success/30 mb-2" />
              <p className="text-sm text-gc-hint">No incidents reported. All clear!</p>
            </div>
          )}
          {incidents.map((inc) => {
            const zoneName = ZONES.find((z) => z.id === inc.zoneId)?.name;
            const sev = SEVERITY.find((s) => s.value === inc.severity);
            return (
              <div
                key={inc.id}
                className="gc-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gc-cloud">{inc.title}</p>
                    {inc.details && (
                      <p className="text-xs text-gc-mist mt-0.5 line-clamp-2">{inc.details}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gc-hint font-mono">
                      {zoneName && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {zoneName}</span>}
                      <span>· {inc.reporterName}</span>
                      <span>· {fmtDate(inc.timestamp)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={cn(sev?.color || "gc-chip", "text-[10px]")}>
                      {inc.severity}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide",
                        inc.status === "open"     ? "text-gc-danger" :
                        inc.status === "resolved" ? "text-gc-success" :
                        "text-gc-warning"
                      )}
                    >
                      {inc.status}
                    </span>

                    {canResolve && inc.status === "open" && (
                      <button
                        onClick={() => handleResolve(inc.id, "resolved")}
                        disabled={resolving === inc.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                          "text-[10px] font-bold uppercase tracking-wider",
                          "bg-gc-success/10 text-gc-success border border-gc-success/20",
                          "hover:bg-gc-success/20 transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {resolving === inc.id ? (
                          <span className="h-3 w-3 rounded-full border-2 border-gc-success border-t-transparent animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Resolve
                      </button>
                    )}

                    {canResolve && inc.status === "resolved" && (
                      <button
                        onClick={() => handleResolve(inc.id, "open")}
                        disabled={resolving === inc.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                          "text-[10px] font-bold uppercase tracking-wider",
                          "bg-gc-warning/10 text-gc-warning border border-gc-warning/20",
                          "hover:bg-gc-warning/20 transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {resolving === inc.id ? (
                          <span className="h-3 w-3 rounded-full border-2 border-gc-warning border-t-transparent animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {inc.status === "resolved" && inc.resolvedByName && (
                  <div className="mt-1.5 pt-1.5 border-t border-gc-steel/50 flex items-center gap-1 text-[10px] text-gc-success font-mono">
                    <CheckCircle className="h-3 w-3" />
                    Resolved by {inc.resolvedByName}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
