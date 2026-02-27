import { useState } from "react";
import { motion } from "framer-motion";
import { UserRound, BarChart3, BookUser } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import PersonContributionView from "./PersonContributionView";
import CommitteeContributionView from "./CommitteeContributionView";

const TABS = [
  { key: "person",    label: "By Person",    Icon: UserRound },
  { key: "committee", label: "By Committee", Icon: BarChart3 },
];

export default function ContributionTabs() {
  const { user, profile } = useAuth();
  const isProctorOrAbove =
    profile?.role === "admin" ||
    profile?.role === "proctor" ||
    profile?.role === "head" ||
    profile?.role === "committee-head";

  const [activeTab, setActiveTab]           = useState("person");
  const [myEntriesOnly, setMyEntriesOnly]   = useState(false);

  return (
    <motion.div
      className="mx-auto max-w-3xl space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Page title */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-gc-crimson/15 border border-gc-crimson/25">
          <BookUser className="h-4 w-4 text-gc-crimson" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-wider text-gc-white">
            CONTRIBUTIONS
          </h1>
          <p className="text-[11px] font-mono text-gc-hint">
            GameCon 2026 · Class Tracker
          </p>
        </div>

        {/* My Entries toggle */}
        <button
          type="button"
          onClick={() => setMyEntriesOnly((p) => !p)}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-bold transition-all",
            myEntriesOnly
              ? "border-gc-crimson/50 bg-gc-crimson/15 text-gc-crimson"
              : "border-gc-steel/50 bg-gc-iron text-gc-mist hover:border-gc-steel/60"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              myEntriesOnly ? "bg-gc-crimson" : "bg-gc-mist/40"
            )}
          />
          My entries
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded border border-gc-steel/50 bg-gc-iron/60 p-1">
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-all",
                active
                  ? "bg-gc-void text-gc-white shadow-sm border border-gc-steel/50"
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

      {/* View */}
      <div className="gc-card p-4">
        {activeTab === "person" && (
          <PersonContributionView myEntriesOnly={myEntriesOnly} />
        )}
        {activeTab === "committee" && (
          <CommitteeContributionView myEntriesOnly={myEntriesOnly} />
        )}
      </div>
    </motion.div>
  );
}
