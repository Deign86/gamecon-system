import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { COMMITTEES } from "../data/seed";
import { subscribeCommitteeSchedules } from "../lib/roleFirestore";

/**
 * Map each seed committee id → canonical COMMITTEE_MAP names used in the
 * imported committeeSchedules collection. This bridges the gap between the
 * UI-friendly short names and the full names coming from the Excel sheet.
 */
const SCHEDULE_NAME_MAP = {
  "proctors":        ["Proctors"],
  "marketing":       ["Marketing"],
  "creatives":       ["Creatives"],
  "awards-prizes":   ["Awards & Prizes"],
  "documentation":   ["Documentation/Photographers"],
  "exhibitors":      ["Exhibitors"],
  "venue-design":    ["Venue Designer & Management"],
  "ticketing":       ["Ticketing"],
  "voting":          ["Voting"],
  "guest-relations": ["Guest Relations Officers"],
  "technical":       ["Technical Committee"],
  "esports":         ["E-Sport Organizers", "Esports Technical", "Shoutcaster"],
};

export default function CommitteeCard() {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const unsub = subscribeCommitteeSchedules(setSchedules);
    return unsub;
  }, []);

  return (
    <div className="space-y-3">
      {COMMITTEES.map((comm) => {
        // Collect all member names for this committee across all day slots
        const canonicalNames = SCHEDULE_NAME_MAP[comm.id] || [];
        const memberSet = new Set();
        schedules.forEach((s) => {
          if (canonicalNames.includes(s.committee)) {
            (s.members || []).forEach((name) => memberSet.add(name));
          }
        });
        const commMembers = [...memberSet].sort();

        return (
          <div
            key={comm.id}
            className="gc-card overflow-hidden"
          >
            {/* Color accent bar */}
            <div className="h-1" style={{ background: comm.color }} />

            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded"
                    style={{
                      background: `${comm.color}18`,
                      border: `1px solid ${comm.color}35`,
                    }}
                  >
                    <Users className="h-4 w-4" style={{ color: comm.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gc-cloud">{comm.name}</h3>
                    <p className="text-[10px] text-gc-mist font-mono">
                      {commMembers.length} member{commMembers.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              {commMembers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {commMembers.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded bg-gc-iron border border-gc-steel/30 px-2.5 py-1 text-[10px] font-medium text-gc-cloud"
                    >
                      <span
                        className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{ background: comm.color }}
                      >
                        {name[0].toUpperCase()}
                      </span>
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {commMembers.length === 0 && (
                <p className="mt-2 text-xs text-gc-hint">No members assigned yet.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
