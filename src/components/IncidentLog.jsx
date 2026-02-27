import { useState } from "react";
import { AlertTriangle, Send, Shield, Clock, MapPin } from "lucide-react";
import { useCollection } from "../hooks/useFirestore";
import { useAuth } from "../hooks/useAuth";
import { ZONES } from "../data/seed";
import { fmtDate, cn } from "../lib/utils";

const SEVERITY = [
  { value: "low",    label: "Low",    color: "gc-chip-green" },
  { value: "medium", label: "Medium", color: "gc-chip-yellow" },
  { value: "high",   label: "High",   color: "gc-chip-red" },
];

export default function IncidentLog() {
  const { user, profile } = useAuth();
  const { docs: incidents, add } = useCollection("incidents");
  const [title, setTitle]     = useState("");
  const [zone, setZone]       = useState("");
  const [severity, setSeverity] = useState("low");
  const [details, setDetails] = useState("");
  const [busy, setBusy]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
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
      setTitle("");
      setZone("");
      setSeverity("low");
      setDetails("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Quick report form */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-gc-danger/5 border border-gc-danger/15 p-4">
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

      {/* Incident list */}
      <div>
        <h3 className="mb-3 font-display text-base font-bold tracking-wide text-gc-mist">
          RECENT INCIDENTS
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {incidents.length === 0 && (
            <div className="text-center py-8">
              <Shield className="mx-auto h-8 w-8 text-gc-success/30 mb-2" />
              <p className="text-sm text-gc-mist/60">No incidents reported. All clear!</p>
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
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gc-mist/60 font-mono">
                      {zoneName && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {zoneName}</span>}
                      <span>· {inc.reporterName}</span>
                      <span>· {fmtDate(inc.timestamp)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn(sev?.color || "gc-chip", "text-[10px]")}>
                      {inc.severity}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        inc.status === "open"     ? "text-gc-danger" :
                        inc.status === "resolved" ? "text-gc-success" :
                        "text-gc-warning"
                      )}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
