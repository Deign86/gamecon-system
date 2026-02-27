import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Shield,
  ExternalLink,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getZoneTypeColor } from "../../lib/venueZones";
import { fmtDate, cn } from "../../lib/utils";

const SEVERITY_COLORS = {
  low:    "gc-success",
  medium: "gc-warning",
  high:   "gc-danger",
};

/**
 * ZoneDetailDrawer — Bottom-sheet / side panel showing full zone details.
 *
 * @param {object|null} zone   – selected zone definition (null = closed)
 * @param {object|null} status – zone status from useVenueStatus
 * @param {string}      day    – "day1" | "day2"
 * @param {function}    onClose
 */
export default function ZoneDetailDrawer({ zone, status, day, onClose, onNavigate }) {
  const overlayRef = useRef(null);
  const { profile } = useAuth();
  const canAct = profile?.role === "admin" || profile?.role === "proctor";

  /* Close on Escape */
  useEffect(() => {
    if (!zone) return;
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [zone, onClose]);

  const color = zone ? getZoneTypeColor(zone.type) : "#888";
  const incidents = status?.incidents || [];
  const staffOnDuty = status?.staffOnDuty ?? 0;
  const incidentsOpen = status?.incidentsOpen ?? 0;

  return (
    <AnimatePresence>
      {zone && (
        <motion.div
          key="drawer-overlay"
          ref={overlayRef}
          onClick={(e) => e.target === overlayRef.current && onClose()}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-2 pb-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="w-full max-w-lg rounded-md border border-gc-steel/40 bg-gc-night shadow-2xl shadow-black/50 overflow-hidden"
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
          >
            {/* Top accent */}
            <div
              className="h-[2px] w-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
              }}
            />

            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-gc-steel/30 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold tracking-[0.1em] text-gc-white truncate">
                    {zone.name}
                  </h2>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-gc-hint">
                    <span className="uppercase">{zone.type}</span>
                    {zone.isOutside && (
                      <>
                        <span className="text-gc-steel">•</span>
                        <span className="text-gc-warning/70">Outside Hall</span>
                      </>
                    )}
                    {zone.committee && (
                      <>
                        <span className="text-gc-steel">•</span>
                        <span>{zone.committee}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded text-gc-mist hover:text-gc-white hover:bg-gc-steel/40 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Content ── */}
            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-5">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Incidents */}
                <div
                  className={cn(
                    "rounded p-3 text-center border",
                    incidentsOpen > 0
                      ? "bg-gc-danger/8 border-gc-danger/15"
                      : "bg-gc-iron/50 border-gc-steel/20"
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 mx-auto mb-1",
                      incidentsOpen > 0 ? "text-gc-danger" : "text-gc-mist"
                    )}
                  />
                  <span
                    className={cn(
                      "block font-mono text-xl font-bold",
                      incidentsOpen > 0 ? "text-gc-danger" : "text-gc-mist"
                    )}
                  >
                    {incidentsOpen}
                  </span>
                  <span className="text-[8px] font-mono text-gc-mist tracking-wider uppercase">
                    Incidents
                  </span>
                </div>

                {/* Staff */}
                <div className="rounded bg-gc-iron/50 border border-gc-steel/20 p-3 text-center">
                  <Shield className="h-4 w-4 text-gc-success mx-auto mb-1" />
                  <span className="block font-mono text-xl font-bold text-gc-success">
                    {staffOnDuty}
                  </span>
                  <span className="text-[8px] font-mono text-gc-mist tracking-wider uppercase">
                    Staff
                  </span>
                </div>
              </div>

              {/* Open incidents list */}
              {incidents.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-display font-bold tracking-wider text-gc-danger uppercase mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Open Incidents
                  </h3>
                  <div className="space-y-1.5">
                    {incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="flex items-start gap-2 rounded bg-gc-danger/5 border border-gc-danger/10 px-3 py-2"
                      >
                        <span
                          className={cn(
                            "mt-0.5 h-2 w-2 rounded-full shrink-0",
                            SEVERITY_COLORS[inc.severity]
                              ? `bg-${SEVERITY_COLORS[inc.severity]}`
                              : "bg-gc-mist"
                          )}
                          style={{
                            backgroundColor:
                              inc.severity === "high"
                                ? "#EF4444"
                                : inc.severity === "medium"
                                ? "#EAB308"
                                : "#22C55E",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gc-cloud truncate">
                            {inc.title}
                          </p>
                          <p className="text-[9px] font-mono text-gc-hint flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-2.5 w-2.5 inline" />
                            {fmtDate(inc.timestamp)}
                            <span className="text-gc-steel">•</span>
                            {inc.reporterName || "Unknown"}
                          </p>
                        </div>
                        <span
                          className="text-[7px] font-mono font-bold tracking-wider uppercase shrink-0 px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor:
                              inc.severity === "high"
                                ? "rgba(239,68,68,0.15)"
                                : inc.severity === "medium"
                                ? "rgba(234,179,8,0.15)"
                                : "rgba(34,197,94,0.15)",
                            color:
                              inc.severity === "high"
                                ? "#EF4444"
                                : inc.severity === "medium"
                                ? "#EAB308"
                                : "#22C55E",
                          }}
                        >
                          {inc.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No incidents placeholder */}
              {zone.tracked && incidents.length === 0 && (
                <div className="text-center py-3 rounded bg-gc-iron/30 border border-gc-steel/15">
                  <span className="text-[10px] font-mono text-gc-hint tracking-wider">
                    No open incidents in this zone
                  </span>
                </div>
              )}

              {/* Not tracked notice */}
              {!zone.tracked && (
                <div className="text-center py-3 rounded bg-gc-iron/30 border border-gc-steel/15">
                  <MapPin className="h-4 w-4 text-gc-mist mx-auto mb-1" />
                  <span className="text-[10px] font-mono text-gc-hint tracking-wider block">
                    This zone is not headcount-tracked
                  </span>
                </div>
              )}

              {/* Quick actions (admin / proctor only) */}
              {canAct && zone.tracked && (
                <div>
                  <h3 className="text-[9px] font-mono tracking-widest text-gc-hint uppercase mb-2">
                    Quick Actions
                  </h3>
                  <div className="space-y-1.5">
                    <QuickAction
                      label="Report Incident"
                      description={`File a new incident for ${zone.name}`}
                      onClick={() => {
                        onClose();
                        onNavigate?.("incidents");
                      }}
                    />
                    <QuickAction
                      label="View Shift Board"
                      description={`See staff assignments for ${zone.committee || "this zone"}`}
                      onClick={() => {
                        onClose();
                        onNavigate?.("shifts", { committeeId: zone.committee });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Quick-action link row ── */
function QuickAction({ label, description, href, external, onClick }) {
  const Tag = href ? "a" : "button";
  const extraProps = href
    ? { href, target: external ? "_blank" : undefined, rel: external ? "noopener noreferrer" : undefined }
    : { onClick };

  return (
    <Tag
      {...extraProps}
      className="flex items-center justify-between gap-3 w-full rounded bg-gc-iron/60 border border-gc-steel/20 px-3 py-2.5 text-left hover:bg-gc-iron hover:border-gc-crimson/30 transition-all group"
    >
      <div className="min-w-0">
        <span className="block text-xs font-semibold text-gc-cloud group-hover:text-gc-white transition-colors">
          {label}
        </span>
        <span className="block text-[9px] text-gc-hint mt-0.5 truncate">
          {description}
        </span>
      </div>
      {external ? (
        <ExternalLink className="h-3.5 w-3.5 text-gc-mist group-hover:text-gc-crimson transition-colors shrink-0" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-gc-mist group-hover:text-gc-crimson transition-colors shrink-0" />
      )}
    </Tag>
  );
}
