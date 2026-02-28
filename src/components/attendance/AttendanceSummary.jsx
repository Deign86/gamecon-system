import { useMemo } from "react";
import { motion } from "motion/react";
import { Users, Check, Clock, ShieldCheck, X, Download, FileSpreadsheet } from "lucide-react";
import { ATTENDANCE_STATUSES, STATUS_META } from "../../lib/attendanceConfig";
import { exportAttendance } from "../../lib/exportExcel";
import { cn } from "../../lib/utils";

const STAT_ICONS = { present: Check, late: Clock, excused: ShieldCheck, absent: X };

const cardVar = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 280 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

export default function AttendanceSummary({ volunteers, records, blockId, blockLabel }) {
  /* ── aggregate counts ── */
  const stats = useMemo(() => {
    const counts = { total: volunteers.length, present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 };
    const commMap = {}; // committee → { present, late, excused, absent, total }

    // initialise committee buckets
    for (const person of volunteers) {
      for (const c of person.committees || []) {
        if (!commMap[c]) commMap[c] = { present: 0, late: 0, excused: 0, absent: 0, total: 0 };
        commMap[c].total++;
      }
    }

    // tally statuses
    for (const person of volunteers) {
      const rec = records[person.id];
      if (rec) {
        counts[rec.status]++;
        for (const c of person.committees || []) {
          if (commMap[c]) commMap[c][rec.status]++;
        }
      } else {
        counts.unmarked++;
      }
    }

    return { counts, commMap };
  }, [volunteers, records]);

  /* ── CSV export ── */
  function exportCSV() {
    const header = "Name,Committees,Status,Checked In At\n";
    const rows = volunteers.map((p) => {
      const rec = records[p.id];
      const comms = (p.committees || []).join("; ");
      const status = rec?.status || "unmarked";
      const time = rec?.checkedInAt?.toDate?.()?.toLocaleTimeString() || "";
      return `"${p.name}","${comms}","${status}","${time}"`;
    });
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${blockId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── JSON export ── */
  function exportJSON() {
    const data = volunteers.map((p) => {
      const rec = records[p.id];
      return {
        name: p.name,
        committees: p.committees || [],
        status: rec?.status || "unmarked",
        checkedInAt: rec?.checkedInAt?.toDate?.()?.toISOString() || null,
        markedBy: rec?.markedBy || null,
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${blockId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const { counts, commMap } = stats;

  /* Committees sorted alphabetically, only those present */
  const commEntries = Object.keys(commMap)
    .sort()
    .map((c) => ({ name: c, ...commMap[c] }));

  return (
    <div className="space-y-5">
      {/* ── Summary cards ── */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-5"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Total */}
        <motion.div variants={cardVar} className="rounded border border-gc-steel/30 bg-gc-slate/60 p-4 flex flex-col items-center gap-1">
          <Users className="h-5 w-5 text-gc-crimson" />
          <span className="font-mono text-2xl text-gc-white">{counts.total}</span>
          <span className="text-[10px] font-display tracking-widest uppercase text-gc-mist">Expected</span>
        </motion.div>

        {/* Per-status cards */}
        {ATTENDANCE_STATUSES.map((s) => {
          const Icon = STAT_ICONS[s];
          const meta = STATUS_META[s];
          return (
            <motion.div
              key={s}
              variants={cardVar}
              className={cn(
                "rounded border p-4 flex flex-col items-center gap-1 bg-gc-slate/60",
                `border-${meta.color}/20`
              )}
            >
              <Icon className={cn("h-5 w-5", `text-${meta.color}`)} />
              <span className={cn("font-mono text-2xl", `text-${meta.color}`)}>{counts[s]}</span>
              <span className="text-[10px] font-display tracking-widest uppercase text-gc-mist">{meta.label}</span>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Unmarked indicator ── */}
      {counts.unmarked > 0 && (
        <div className="flex items-center gap-2 rounded border border-gc-warning/20 bg-gc-warning/5 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-gc-warning animate-pulse" />
          <span className="text-sm font-body text-gc-warning">
            {counts.unmarked} volunteer{counts.unmarked !== 1 && "s"} not yet marked
          </span>
        </div>
      )}

      {/* ── Committee breakdown table ── */}
      {commEntries.length > 0 && (
        <div>
          <h3 className="font-display text-lg tracking-wide text-gc-white mb-3">
            Committee Breakdown
          </h3>
          <div className="overflow-x-auto rounded border border-gc-steel/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gc-steel/30 bg-gc-iron/40">
                  <th className="px-3 py-2 text-left font-display tracking-wider text-gc-mist uppercase text-xs">Committee</th>
                  <th className="px-3 py-2 text-center font-display tracking-wider text-gc-mist uppercase text-xs">Total</th>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <th key={s} className={cn("px-3 py-2 text-center font-display tracking-wider uppercase text-xs", `text-${STATUS_META[s].color}`)}>
                      {STATUS_META[s].short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commEntries.map((c, i) => (
                  <tr key={c.name} className={cn("border-b border-gc-steel/15", i % 2 === 0 ? "bg-gc-slate/30" : "bg-gc-night/30")}>
                    <td className="px-3 py-2 font-body text-gc-cloud truncate max-w-[180px]">{c.name}</td>
                    <td className="px-3 py-2 text-center font-mono text-gc-mist">{c.total}</td>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <td key={s} className={cn("px-3 py-2 text-center font-mono", c[s] > 0 ? `text-${STATUS_META[s].color}` : "text-gc-steel")}>
                        {c[s]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Export buttons ── */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => exportAttendance(volunteers, records, blockId, blockLabel)}
          className="flex items-center gap-2 rounded border border-gc-success/30 bg-gc-success/8 px-4 py-2 text-sm font-display tracking-wider text-gc-success hover:bg-gc-success/15 hover:border-gc-success/50 transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded border border-gc-steel/40 bg-gc-iron/60 px-4 py-2 text-sm font-display tracking-wider text-gc-cloud hover:border-gc-crimson/40 hover:text-gc-crimson transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button
          onClick={exportJSON}
          className="flex items-center gap-2 rounded border border-gc-steel/40 bg-gc-iron/60 px-4 py-2 text-sm font-display tracking-wider text-gc-cloud hover:border-gc-crimson/40 hover:text-gc-crimson transition-colors"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </button>
      </div>
    </div>
  );
}
