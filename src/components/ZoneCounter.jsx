import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, TrendingUp, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useHeadcount } from "../hooks/useHeadcount";
import { ZoneCounterSkeleton } from "./Skeleton";
import { useAuth } from "../hooks/useAuth";
import { logActivity } from "../lib/auditLog";
import { getZoneIcon, cn } from "../lib/utils";

/** True when running inside the Tauri desktop shell (v2). */
const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export default function ZoneCounter() {
  const { zones, incrementZone, decrementZone, setZoneCount, loading } = useHeadcount();
  const { user, profile } = useAuth();
  const isViewer = profile?.role === "viewer";
  const navigate = useNavigate();
  const [pulsing, setPulsing] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef(null);

  const openFullscreen = useCallback(() => {
    if (isTauri()) {
      // Inside Tauri: navigate in-place — same window, React Router handles it
      navigate("/headcount/fullscreen");
    } else {
      // Web browser: open in a new tab as before
      window.open("/headcount/fullscreen", "_blank", "noopener,noreferrer");
    }
  }, [navigate]);

  async function handleIncrement(zoneId) {
    if (isViewer) return;
    setPulsing(zoneId);
    await incrementZone(zoneId, user?.uid);
    const zoneName = zones.find(z => z.id === zoneId)?.name || zoneId;
    logActivity({
      action: "headcount.increment",
      category: "headcount",
      details: `+1 at ${zoneName}`,
      meta: { zoneId },
      userId: user?.uid || "unknown",
      userName: profile?.name || "Unknown",
    });
    setTimeout(() => setPulsing(null), 400);
  }

  async function handleDecrement(zoneId) {
    if (isViewer) return;
    setPulsing(zoneId);
    await decrementZone(zoneId, user?.uid);
    const zoneName = zones.find(z => z.id === zoneId)?.name || zoneId;
    logActivity({
      action: "headcount.decrement",
      category: "headcount",
      details: `-1 at ${zoneName}`,
      meta: { zoneId },
      userId: user?.uid || "unknown",
      userName: profile?.name || "Unknown",
    });
    setTimeout(() => setPulsing(null), 400);
  }

  function startEditing(zoneId, currentCount) {
    if (isViewer) return;
    setEditingZone(zoneId);
    setEditValue(String(currentCount || 0));
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitEdit(zoneId) {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed)) {
      const zone = zones.find(z => z.id === zoneId);
      const oldCount = zone?.currentCount ?? 0;
      const clamped = Math.max(0, parsed);
      if (clamped !== oldCount) {
        setPulsing(zoneId);
        await setZoneCount(zoneId, clamped, user?.uid);
        const zoneName = zone?.name || zoneId;
        logActivity({
          action: "headcount.set",
          category: "headcount",
          details: `Set ${zoneName} to ${clamped} (was ${oldCount})`,
          meta: { zoneId, oldCount, newCount: clamped },
          userId: user?.uid || "unknown",
          userName: profile?.name || "Unknown",
        });
        setTimeout(() => setPulsing(null), 400);
      }
    }
    setEditingZone(null);
    setEditValue("");
  }

  function handleEditKeyDown(e, zoneId) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit(zoneId);
    } else if (e.key === "Escape") {
      setEditingZone(null);
      setEditValue("");
    }
  }

  if (loading) {
    return <ZoneCounterSkeleton />;
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
          <button
            onClick={openFullscreen}
            className="flex items-center gap-1.5 rounded bg-gc-iron border border-gc-steel px-2.5 py-1.5 text-[11px] font-semibold text-gc-mist hover:text-gc-cloud hover:border-gc-crimson/50 transition-all"
            title="Open fullscreen display"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
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
                  disabled={isViewer || count <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded bg-gc-iron border border-gc-steel text-gc-cloud hover:bg-gc-steel hover:border-gc-crimson/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                >
                  <Minus className="h-4 w-4" />
                </button>

                {editingZone === zone.id ? (
                  <input
                    ref={inputRef}
                    type="number"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(zone.id)}
                    onKeyDown={(e) => handleEditKeyDown(e, zone.id)}
                    className="gc-counter min-w-[3rem] w-16 text-lg px-2 text-center bg-gc-iron border border-gc-crimson/60 rounded outline-none font-mono text-gc-white appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                ) : (
                  <motion.div
                    className={cn("gc-counter min-w-[3rem] text-lg px-3 cursor-text", isPulsing && "animate-count-pop")}
                    animate={isPulsing ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    onClick={() => startEditing(zone.id, count)}
                    title={isViewer ? undefined : "Click to edit"}
                  >
                    {count}
                  </motion.div>
                )}

                <button
                  onClick={() => handleIncrement(zone.id)}
                  disabled={isViewer}
                  className="flex h-9 w-9 items-center justify-center rounded bg-gc-crimson/20 border border-gc-crimson/40 text-gc-crimson hover:bg-gc-crimson/30 hover:border-gc-crimson transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
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
