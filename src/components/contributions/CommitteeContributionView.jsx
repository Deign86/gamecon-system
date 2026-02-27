import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BarChart3 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { COMMITTEES } from "../../data/seed";
import { fmtDate, cn } from "../../lib/utils";
import { subscribeAllContributions } from "../../lib/contributionsFirestore";

export default function CommitteeContributionView({ myEntriesOnly }) {
  const { user } = useAuth();
  const [allContribs, setAllContribs] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState({}); // { committeeId: bool }

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllContributions((docs) => {
      setAllContribs(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Optionally filter to current user's logged entries
  const displayContribs = myEntriesOnly
    ? allContribs.filter((c) => c.loggedBy === user?.uid)
    : allContribs;

  // Group by committee
  const grouped = useMemo(() => {
    const map = {};
    for (const c of displayContribs) {
      const key = c.committee || "__general__";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    // Sort each group by createdAt desc (already sorted from Firestore)
    // Sort groups by count desc
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [displayContribs]);

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function committeeInfo(id) {
    if (id === "__general__") return { name: "General", color: "#64748B" };
    return COMMITTEES.find((c) => c.id === id) || { name: id, color: "#64748B" };
  }

  const total = displayContribs.length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-6 w-6 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-gc-mist/40">
        <BarChart3 className="h-10 w-10 opacity-30" />
        <p className="text-sm">No contributions logged yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gc-steel/20 bg-gc-iron/40 px-4 py-3">
        <BarChart3 className="h-4 w-4 text-gc-crimson shrink-0" />
        <span className="text-sm font-bold text-gc-cloud">
          {total} {total === 1 ? "entry" : "entries"}
        </span>
        <span className="text-xs text-gc-mist/50">across {grouped.length} committee{grouped.length !== 1 ? "s" : ""}</span>
        {/* Mini bar chart — colored segments proportional to counts */}
        <div className="ml-auto flex h-2 min-w-[80px] max-w-[140px] flex-1 overflow-hidden rounded-full bg-gc-steel/20">
          {grouped.map(([id, items]) => {
            const info = committeeInfo(id);
            const pct  = (items.length / total) * 100;
            return (
              <div
                key={id}
                style={{ width: `${pct}%`, background: info.color }}
                title={`${info.name}: ${items.length}`}
              />
            );
          })}
        </div>
      </div>

      {/* Committee groups */}
      <div className="space-y-2">
        {grouped.map(([id, items]) => {
          const info   = committeeInfo(id);
          const isOpen = expanded[id] ?? false;
          return (
            <div
              key={id}
              className="overflow-hidden rounded-xl border border-gc-steel/20 bg-gc-iron/40"
            >
              {/* Header row */}
              <button
                type="button"
                onClick={() => toggleExpand(id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gc-steel/10"
              >
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: info.color }}
                />
                <span
                  className="flex-1 text-sm font-bold text-gc-cloud"
                  style={{ color: info.color }}
                >
                  {info.name}
                </span>
                {/* Count pill */}
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    background: `${info.color}18`,
                    color:       info.color,
                    border:      `1px solid ${info.color}30`,
                  }}
                >
                  {items.length}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-gc-mist/50 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Entries */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gc-steel/15 divide-y divide-gc-steel/10">
                      {items.map((c) => (
                        <div
                          key={c.id}
                          className="px-4 py-2.5 flex items-start gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gc-cloud truncate">
                              {c.task}
                            </p>
                            {c.details && (
                              <p className="text-xs text-gc-mist line-clamp-1 mt-0.5">
                                {c.details}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] font-mono text-gc-mist/50">
                              {c.userName} · {fmtDate(c.createdAt || c.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
