import { motion } from "motion/react";
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
  const { incidentsOpen, hasData } = status;

  /* People-tracking removed: use a fixed low opacity for zone fills */
  const heatOpacity = 0.08;
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

        {/* People-tracking removed: no headcount or staff badges shown on the map */}

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
