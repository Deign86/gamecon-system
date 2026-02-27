import { motion } from "framer-motion";
import { Users, AlertTriangle, Shield } from "lucide-react";
import { getZoneTypeColor } from "../../lib/venueZones";

const overlayVariant = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 24, stiffness: 300 },
  },
};

/**
 * ZoneOverlay — Renders a single interactive zone rectangle on the venue map.
 *
 * @param {object}  zone       – zone definition from venueZones.js
 * @param {object}  position   – { x, y, width, height } in percentages
 * @param {object}  status     – { currentCount, incidentsOpen, staffOnDuty, hasData }
 * @param {boolean} isSelected – whether this zone is currently selected
 * @param {function} onClick   – click handler
 */
export default function ZoneOverlay({ zone, position, status, isSelected, onClick }) {
  const color = getZoneTypeColor(zone.type);
  const { currentCount, incidentsOpen, staffOnDuty, hasData } = status;

  /* Occupancy heat: 0→25+ people maps to opacity 0.08→0.35 */
  const heatOpacity = Math.min(0.08 + (currentCount / 30) * 0.27, 0.35);
  const hasIncidents = incidentsOpen > 0;

  return (
    <motion.button
      variants={overlayVariant}
      onClick={onClick}
      className={
        "absolute rounded-sm cursor-pointer transition-all duration-200 group " +
        "border focus:outline-none focus-visible:ring-2 focus-visible:ring-gc-crimson " +
        (isSelected
          ? "border-gc-crimson/70 ring-1 ring-gc-crimson/40 z-[15]"
          : "border-white/[0.07] hover:border-white/20 z-[10]")
      }
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
      }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background fill — zone type colour at dynamic opacity */}
      <div
        className="absolute inset-0 rounded-sm transition-opacity duration-300"
        style={{
          backgroundColor: color,
          opacity: isSelected ? 0.3 : heatOpacity,
        }}
      />

      {/* Incident glow border */}
      {hasIncidents && (
        <div
          className="absolute inset-0 rounded-sm animate-pulse"
          style={{
            boxShadow: `inset 0 0 12px rgba(239,68,68,0.3), 0 0 8px rgba(239,68,68,0.15)`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-1 sm:p-1.5 overflow-hidden">
        {/* Zone label */}
        <div className="flex items-start justify-between gap-0.5">
          <span
            className={
              "text-[7px] sm:text-[9px] font-display font-bold tracking-wider leading-tight truncate uppercase " +
              (isSelected ? "text-gc-white" : "text-gc-cloud/90")
            }
          >
            {zone.shortName}
          </span>

          {/* Incident dot */}
          {hasIncidents && (
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
              <span className="absolute inset-0 rounded-full bg-gc-danger animate-ping opacity-50" />
              <span className="relative rounded-full h-full w-full bg-gc-danger flex items-center justify-center">
                <span className="text-[5px] sm:text-[6px] font-mono font-bold text-white leading-none">
                  {incidentsOpen}
                </span>
              </span>
            </span>
          )}
        </div>

        {/* Status badges (bottom row) */}
        {(zone.tracked || hasData) && (
          <div className="flex items-end gap-1 mt-auto">
            {/* Headcount */}
            <span className="inline-flex items-center gap-0.5 rounded bg-black/30 px-1 py-0.5 text-[6px] sm:text-[8px] font-mono text-gc-cloud/80">
              <Users className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-gc-crimson/70" />
              {currentCount}
            </span>

            {/* Staff on duty */}
            {staffOnDuty > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded bg-black/30 px-1 py-0.5 text-[6px] sm:text-[8px] font-mono text-gc-cloud/80">
                <Shield className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-gc-success/70" />
                {staffOnDuty}
              </span>
            )}
          </div>
        )}

        {/* Untracked label */}
        {!zone.tracked && !hasData && (
          <span className="text-[5px] sm:text-[6px] font-mono text-gc-mist/40 mt-auto">
            —
          </span>
        )}
      </div>

      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 16px ${color}25, 0 0 6px ${color}15`,
        }}
      />

      {/* Outside marker */}
      {zone.isOutside && (
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-gc-steel/30 pointer-events-none" />
      )}
    </motion.button>
  );
}
