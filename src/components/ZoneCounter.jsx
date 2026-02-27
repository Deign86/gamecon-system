import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, TrendingUp, Maximize2 } from "lucide-react";
import { useHeadcount } from "../hooks/useHeadcount";
import { useAuth } from "../hooks/useAuth";
import { getZoneIcon, cn } from "../lib/utils";

export default function ZoneCounter() {
  const { zones, incrementZone, decrementZone, loading } = useHeadcount();
  const { user } = useAuth();
  const [pulsing, setPulsing] = useState(null);

  async function handleIncrement(zoneId) {
    setPulsing(zoneId);
    await incrementZone(zoneId, user?.uid);
    setTimeout(() => setPulsing(null), 400);
  }

  async function handleDecrement(zoneId) {
    setPulsing(zoneId);
    await decrementZone(zoneId, user?.uid);
    setTimeout(() => setPulsing(null), 400);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gc-mist text-sm">No zones found. Run the seed script to populate zones.</p>
        <p className="text-gc-hint text-xs mt-1 font-mono">npm run seed</p>
      </div>
    );
  }

  const totalCount = zones.reduce((sum, z) => sum + (z.currentCount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Total banner */}
      <div className="flex items-center justify-between rounded bg-gc-crimson/10 border border-gc-crimson/25 px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gc-crimson" />
          <span className="text-sm font-semibold text-gc-cloud">Event Total</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold text-gc-crimson">
            {totalCount}
          </span>
          <a
            href="/headcount/fullscreen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded bg-gc-iron border border-gc-steel px-2.5 py-1.5 text-[11px] font-semibold text-gc-mist hover:text-gc-cloud hover:border-gc-crimson/50 transition-all"
            title="Open fullscreen display"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </a>
        </div>
      </div>

      {/* Zone grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {zones.map((zone) => {
          const count = zone.currentCount || 0;
          const isPulsing = pulsing === zone.id;

          return (
            <div
              key={zone.id}
              className="gc-card flex items-center gap-3 p-3 sm:p-4"
            >
              {/* Icon */}
              <div className="shrink-0 w-9 flex items-center justify-center">
                {(() => { const Icon = getZoneIcon(zone.name); return <Icon className="h-6 w-6 text-gc-mist" />; })()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gc-cloud">
                  {zone.name}
                </h3>
              </div>

              {/* Counter controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDecrement(zone.id)}
                  disabled={count <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded bg-gc-iron border border-gc-steel text-gc-cloud hover:bg-gc-steel hover:border-gc-crimson/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <motion.div
                  className={cn("gc-counter min-w-[3rem] text-lg px-3", isPulsing && "animate-count-pop")}
                  animate={isPulsing ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {count}
                </motion.div>

                <button
                  onClick={() => handleIncrement(zone.id)}
                  className="flex h-9 w-9 items-center justify-center rounded bg-gc-crimson/20 border border-gc-crimson/40 text-gc-crimson hover:bg-gc-crimson/30 hover:border-gc-crimson transition-all active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
