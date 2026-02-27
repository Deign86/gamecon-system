import { motion } from "framer-motion";
import { ScrollText, TrendingUp, AlertTriangle, ClipboardCheck, DollarSign } from "lucide-react";
import { useCollection } from "../hooks/useFirestore";
import { COMMITTEES, ZONES } from "../data/seed";
import { fmtDate, peso, cn } from "../lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", damping: 24, stiffness: 260 } },
};

export default function LogsPanel() {
  const { docs: headcountLogs } = useCollection("headcounts", "timestamp", 50);
  const { docs: contributions } = useCollection("contributions", "timestamp", 50);
  const { docs: incidents }     = useCollection("incidents", "timestamp", 50);
  const { docs: expenses }      = useCollection("expenses", "timestamp", 50);

  // Combine all into a unified timeline
  const allEvents = [
    ...headcountLogs.map((h) => ({
      ...h, type: "headcount",
      label: `${h.change > 0 ? "+" : ""}${h.change} at ${ZONES.find((z) => z.id === h.zoneId)?.name || h.zoneId}`,
    })),
    ...contributions.map((c) => ({
      ...c, type: "contribution",
      label: c.task,
    })),
    ...incidents.map((i) => ({
      ...i, type: "incident",
      label: i.title,
    })),
    ...expenses.map((e) => ({
      ...e, type: "expense",
      label: `${e.item} — ${peso(e.amount)}`,
    })),
  ];

  // Sort by timestamp desc
  allEvents.sort((a, b) => {
    const ta = a.timestamp?.toDate?.() || new Date(0);
    const tb = b.timestamp?.toDate?.() || new Date(0);
    return tb - ta;
  });

  function typeConfig(type) {
    switch (type) {
      case "headcount":
        return { Icon: TrendingUp, color: "#C8102E", bg: "rgba(200,16,46,0.1)" };
      case "contribution":
        return { Icon: ClipboardCheck, color: "#22C55E", bg: "rgba(34,197,94,0.1)" };
      case "incident":
        return { Icon: AlertTriangle, color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
      case "expense":
        return { Icon: DollarSign, color: "#EAB308", bg: "rgba(234,179,8,0.1)" };
      default:
        return { Icon: ScrollText, color: "#888", bg: "rgba(136,136,136,0.1)" };
    }
  }

  return (
    <motion.div
      className="mx-auto max-w-2xl"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
    >
      <motion.div variants={fadeUp} className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-gc-crimson animate-pulse" />
          <span className="text-[9px] font-mono text-gc-hint uppercase tracking-[0.2em]">SYS.LOG — LIVE FEED</span>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-wider text-gc-white">
          ACTIVITY <span className="text-gc-crimson">LOG</span>
        </h2>
        <p className="text-xs text-gc-mist mt-0.5 font-mono">
          All events across the system, most recent first.
        </p>
      </motion.div>

      <div className="space-y-2">
        {allEvents.length === 0 && (
          <motion.div variants={fadeUp} className="text-center py-12">
            <ScrollText className="mx-auto h-10 w-10 text-gc-faded mb-3" />
            <p className="text-sm text-gc-hint">No activity yet. Start using the dashboard!</p>
          </motion.div>
        )}

        {allEvents.map((event, i) => {
          const { Icon, color, bg } = typeConfig(event.type);
          return (
            <motion.div
              key={`${event.type}-${event.id}-${i}`}
              variants={fadeUp}
              className="gc-card flex items-center gap-3 p-3"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded"
                style={{ background: bg, border: `1px solid ${color}25` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gc-cloud truncate">
                  {event.label}
                </p>
                <p className="text-[10px] text-gc-hint font-mono">
                  {event.type} · {event.userName || event.reporterName || event.updatedBy || "system"} · {fmtDate(event.timestamp)}
                </p>
              </div>

              <span
                className="shrink-0 rounded px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider"
                style={{ background: bg, color, border: `1px solid ${color}25` }}
              >
                {event.type}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
