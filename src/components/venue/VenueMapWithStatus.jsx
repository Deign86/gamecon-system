import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Loader2, AlertTriangle, Shield, ArrowLeft } from "lucide-react";
import { useVenueStatus } from "../../hooks/useVenueStatus";
import { VENUE_ZONES, HALL_BOUNDS, BOOTH_GRID, getZonesForDay, getZoneTypeLegend } from "../../lib/venueZones";
import ZoneOverlay from "./ZoneOverlay";
import ZoneDetailDrawer from "./ZoneDetailDrawer";

const DAY_OPTIONS = [
  { key: "day1", label: "DAY 1", date: "MAR 5" },
  { key: "day2", label: "DAY 2", date: "MAR 6" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

export default function VenueMapWithStatus({ onNavigate }) {
  const [day, setDay] = useState("day1");
  const [selectedZone, setSelectedZone] = useState(null);
  const { statuses, loading } = useVenueStatus(day);

  const zones = getZonesForDay(day);
  const legend = getZoneTypeLegend();

  const handleZoneClick = useCallback((zone) => {
    setSelectedZone(zone);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedZone(null);
  }, []);

  /* ── Aggregate stats for the top bar ── */
  const totalIncidents = Object.values(statuses).reduce((s, z) => s + (z.incidentsOpen || 0), 0);
  const staffSum = Object.values(statuses).reduce((s, z) => s + (z.staffOnDuty || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-gc-crimson animate-spin" />
          <span className="font-display text-sm tracking-[0.2em] text-gc-mist">
            LOADING VENUE MAP…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header: Day toggle + aggregate stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Day toggle */}
        <div className="flex rounded-md border border-gc-steel/40 bg-gc-void overflow-hidden">
          {DAY_OPTIONS.map(({ key, label, date }) => (
            <button
              key={key}
              onClick={() => setDay(key)}
              className={
                "relative px-4 py-2 text-xs font-display tracking-[0.15em] transition-all duration-200 " +
                (day === key
                  ? "bg-gc-crimson/15 text-gc-crimson border-gc-crimson/30"
                  : "text-gc-mist hover:text-gc-cloud hover:bg-gc-iron/50")
              }
            >
              {day === key && (
                <motion.span
                  layoutId="day-indicator"
                  className="absolute inset-0 border-b-2 border-gc-crimson"
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                />
              )}
              <span className="relative z-10 font-bold">{label}</span>
              <span className="relative z-10 ml-1.5 text-[9px] font-mono opacity-60">
                {date}
              </span>
            </button>
          ))}
        </div>

        {/* Aggregate badges */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          {totalIncidents > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded bg-gc-danger/10 border border-gc-danger/20 px-2 py-1 text-gc-cloud">
              <AlertTriangle className="h-3 w-3 text-gc-danger" />
              <span className="font-bold text-gc-danger">{totalIncidents}</span> open
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded bg-gc-iron border border-gc-steel/30 px-2 py-1 text-gc-cloud">
            <Shield className="h-3 w-3 text-gc-mist" />
            <span className="font-bold text-gc-white">{staffSum}</span> staff
          </span>
        </div>
      </div>

      {/* Map title — outside the map box, centered below day toggle */}
      <div className="text-center">
        <span className="text-[9px] font-mono tracking-[0.3em] text-gc-hint/50 uppercase">
          COED Assembly Hall — {day === "day1" ? "Day 1" : "Day 2"} Layout
        </span>
      </div>

      {/* ── Map container ── */}
      <div className="relative rounded-md border border-gc-steel/40 bg-gc-slate overflow-hidden">
        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-gc-crimson/25 z-20 pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-gc-crimson/25 z-20 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-gc-crimson/25 z-20 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-gc-crimson/25 z-20 pointer-events-none" />

        {/* Aspect-ratio wrapper — hall dominates; ticketing sits below */}
        <div className="relative w-full" style={{ paddingBottom: "130%" }}>
          {/* Grid overlay (subtle) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(200,16,46,0.5) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(200,16,46,0.5) 1px, transparent 1px)",
              backgroundSize: "6.25% 5%",
            }}
          />

          {/* Hall outline — main 16m × 21m rectangle */}
          <div
            className="absolute border-2 border-gc-steel/25 rounded-sm z-[1]"
            style={{
              left: `${HALL_BOUNDS.x}%`,
              top: `${HALL_BOUNDS.y}%`,
              width: `${HALL_BOUNDS.width}%`,
              height: `${HALL_BOUNDS.height}%`,
            }}
          >
            {/* Hall top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gc-crimson/15 via-gc-crimson/30 to-gc-crimson/15" />
            {/* Hall bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gc-steel/20 to-transparent" />
          </div>

          {/* Dimension markers */}
          {/* "16 METERS" — horizontal at top of hall */}
          <div
            className="absolute z-[3] pointer-events-none flex items-center gap-1"
            style={{ left: "30%", top: "0.5%", width: "40%" }}
          >
            <div className="flex-1 h-[1px] bg-gc-mist/25" />
            <span className="text-[7px] font-mono tracking-[0.15em] text-gc-mist/40 whitespace-nowrap">
              16 METERS
            </span>
            <div className="flex-1 h-[1px] bg-gc-mist/25" />
          </div>

          {/* "21 METERS" — vertical along right edge of hall */}
          <div
            className="absolute z-[3] pointer-events-none flex flex-col items-center gap-0.5"
            style={{
              left: "96%",
              top: `${HALL_BOUNDS.y + 2}%`,
              height: `${HALL_BOUNDS.height - 4}%`,
            }}
          >
            <div className="flex-1 w-[1px] bg-gc-mist/20" />
            <span
              className="text-[7px] font-mono tracking-[0.15em] text-gc-mist/35 whitespace-nowrap"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              21 METERS
            </span>
            <div className="flex-1 w-[1px] bg-gc-mist/20" />
          </div>

          {/* One-way flow indicator — Entrance (right) → Exit (left) */}
          <div
            className="absolute z-[3] pointer-events-none flex items-center gap-1.5"
            style={{ left: "18%", top: "74%", width: "56%" }}
          >
            <ArrowLeft className="h-2.5 w-2.5 text-gc-warning/50 shrink-0" />
            <div className="flex-1 h-[1px] border-t border-dashed border-gc-warning/30" />
            <span className="text-[6px] font-mono tracking-[0.15em] text-gc-warning/45 whitespace-nowrap">
              ONE WAY · NO RE-ENTRY
            </span>
            <div className="flex-1 h-[1px] border-t border-dashed border-gc-warning/30" />
          </div>

          {/* Zone overlays */}
          <AnimatePresence mode="wait">
            <motion.div
              key={day}
              className="absolute inset-0 z-10"
              initial="hidden"
              animate="show"
              variants={stagger}
            >
              {zones.map((zone) => {
                const pos = zone.layoutPositions[day];
                if (!pos) return null;
                const status = statuses[zone.id] || {
                  currentCount: 0,
                  peakCount: 0,
                  incidentsOpen: 0,
                  incidents: [],
                  staffOnDuty: 0,
                  hasData: false,
                };
                return (
                  <ZoneOverlay
                    key={zone.id}
                    zone={zone}
                    position={pos}
                    status={status}
                    isSelected={selectedZone?.id === zone.id}
                    onClick={() => handleZoneClick(zone)}
                  />
                );
              })}

              {/* Exhibitor booth grid — individual table squares inside the gallery zone */}
              {(() => {
                const galleryZone = VENUE_ZONES.find((z) => z.id === "gallery");
                const gPos = galleryZone?.layoutPositions[day];
                const grid = BOOTH_GRID[day];
                if (!gPos || !grid) return null;

                const pad = 1.5; // % padding inside gallery
                const gap = 0.8; // % gap between booths
                const booths = [];

                if (grid.cols && grid.rows) {
                  // Uniform grid (Day 1)
                  const cellW = (gPos.width - pad * 2 - gap * (grid.cols - 1)) / grid.cols;
                  const cellH = (gPos.height - pad * 2 - gap * (grid.rows - 1)) / grid.rows;
                  for (let i = 0; i < grid.total; i++) {
                    const col = i % grid.cols;
                    const row = Math.floor(i / grid.cols);
                    booths.push({
                      key: `booth-${i}`,
                      x: gPos.x + pad + col * (cellW + gap),
                      y: gPos.y + pad + row * (cellH + gap),
                      w: cellW,
                      h: cellH,
                    });
                  }
                } else if (grid.groups) {
                  // Grouped layout (Day 2): row groups stacked vertically
                  const totalRows = grid.groups.reduce((s, g) => s + g.rows, 0);
                  const maxCols = Math.max(...grid.groups.map((g) => g.cols));
                  const cellW = (gPos.width - pad * 2 - gap * (maxCols - 1)) / maxCols;
                  const cellH = (gPos.height - pad * 2 - gap * (totalRows - 1)) / totalRows;
                  let rowOffset = 0;
                  let idx = 0;
                  for (const group of grid.groups) {
                    // Center the group horizontally if it has fewer cols than maxCols
                    const groupWidth = group.cols * cellW + (group.cols - 1) * gap;
                    const groupOffsetX = (gPos.width - pad * 2 - groupWidth) / 2;
                    for (let r = 0; r < group.rows; r++) {
                      for (let c = 0; c < group.cols; c++) {
                        booths.push({
                          key: `booth-${idx++}`,
                          x: gPos.x + pad + groupOffsetX + c * (cellW + gap),
                          y: gPos.y + pad + (rowOffset + r) * (cellH + gap),
                          w: cellW,
                          h: cellH,
                        });
                      }
                    }
                    rowOffset += group.rows;
                  }
                }

                return booths.map((b) => (
                  <div
                    key={b.key}
                    className="absolute rounded-[2px] border border-pink-400/20 bg-pink-400/[0.07]"
                    style={{
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.w}%`,
                      height: `${b.h}%`,
                    }}
                  />
                ));
              })()}
            </motion.div>
          </AnimatePresence>

          {/* "OUTSIDE" label — between hall bottom and ticketing */}
          <div
            className="absolute z-[2] pointer-events-none left-1/2 -translate-x-1/2 text-center"
            style={{ top: "80.5%" }}
          >
            <span className="text-[9px] font-mono tracking-[0.3em] text-gc-hint/50 uppercase font-bold">
              Outside
            </span>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
        <span className="text-[8px] font-mono tracking-widest text-gc-hint uppercase mr-1">
          Legend
        </span>
        {legend.map(({ type, color, label }) => (
          <span key={type} className="inline-flex items-center gap-1 text-[9px] text-gc-mist">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: color, opacity: 0.7 }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* ── Zone Detail Drawer ── */}
      <ZoneDetailDrawer
        zone={selectedZone}
        status={selectedZone ? statuses[selectedZone.id] : null}
        day={day}
        onClose={handleCloseDrawer}
        onNavigate={onNavigate}
      />
    </div>
  );
}
