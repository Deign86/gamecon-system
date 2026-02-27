/**
 * venueZones.js
 *
 * Venue Zone configuration for the Interactive Venue Map.
 * Positions are derived from the Day 1 & Day 2 floor plan images
 * (COED Building — Assembly Hall, 16 m × 21 m).
 *
 * All coordinates are percentages (0-100) relative to the full map container.
 *   2-80%  — main COED Assembly Hall (everything inside)
 *  84-97%  — ticketing area (the only zone outside the hall)
 *
 * One-way entry policy: Entrance (bottom-right) → Exit (bottom-left).
 * No re-entry once you leave through the exit.
 *
 * Exhibitor booths are individual table positions in the centre of the hall.
 *   Day 1: 16 booths (4 cols × 4 rows)
 *   Day 2: 15 booths (5 cols × 3 rows)
 *
 * Zones with `tracked: true` have Firestore `zones/{id}` documents.
 * Display-only zones (entrance, exit, committee area, CR) are rendered
 * but have no headcount data.
 *
 * Day 2 has only 2 E-Sport Game Areas (ES-3 is removed).
 */

/* ── Zone type → accent colour (shown at low opacity as fill) ── */
export const ZONE_TYPE_COLORS = {
  esport:    "#E31837",
  booth:     "#EC4899",
  exhibitor: "#EC4899",
  holding:   "#EF4444",
  voting:    "#8B5CF6",
  ticketing: "#F472B6",
  committee: "#22C55E",
  rcy:       "#22C55E",
  photobackdrop: "#3B82F6",
  other:     "#14B8A6",
};

/**
 * Hall boundary — the main COED Assembly Hall rectangle.
 * Only Ticketing sits outside this boundary.
 */
export const HALL_BOUNDS = { x: 1, y: 2, width: 98, height: 78 };

/**
 * Booth grid config — visual table positions inside the Exhibitor Area.
 * Each cell represents one exhibitor booth / table.
 *   Day 1: 16 booths — uniform 4 cols × 4 rows
 *   Day 2: 15 booths — 3 across top row, then 4 cols × 3 rows below
 *     (groups: array of { cols, rows } sections stacked vertically)
 */
export const BOOTH_GRID = {
  day1: { cols: 4, rows: 4, total: 16 },
  day2: { groups: [{ cols: 3, rows: 1 }, { cols: 4, rows: 3 }], total: 15 },
};

/**
 * All venue zones — positions match the Day 1 & Day 2 floor plan images.
 *
 * Layout key (% coordinates within the full map container):
 *
 *  ┌─ MAIN HALL (y 2–80) ────────────────────────────────────────┐
 *  │ HOLDING │ VOTING │ PLAY w PROF │ TTRPG         (top row)    │
 *  │─────────────────────────────────────────────────────────────│
 *  │ ES-1    │                                                  │
 *  │─────────│    EXHIBITOR BOOTH GRID                            │
 *  │ ES-2    │    (4×4 = 16 / 5×3 = 15)                          │
 *  │─────────│                                                    │
 *  │ ES-3*   │                                                    │
 *  │─────────────────────────────────────────────────────────────│
 *  │ ← EXIT │ CMTE │ RCY │                                       │
 *  └─────────────────────────────────────────────────────────────┘
 *                    TICKETING (outside)
 *
 *  * ES-3 exists on Day 1 only
 */
export const VENUE_ZONES = [
  /* ═══════════════════════════════════════════════════════════════
     TOP ROW — Inside Hall (along the top wall)
     ═══════════════════════════════════════════════════════════════ */
  {
    id: "holding",
    name: "E-Sport Holding Area",
    shortName: "HOLD",
    type: "holding",
    committee: "guest-relations",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 2, y: 3, width: 21, height: 13 },
      day2: { x: 2, y: 3, width: 21, height: 13 },
    },
  },
  {
    id: "voting",
    name: "Voting Area",
    shortName: "VOTE",
    type: "voting",
    committee: "voting",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 25, y: 3, width: 16, height: 13 },
      day2: { x: 25, y: 3, width: 16, height: 13 },
    },
  },
  {
    id: "play-prof",
    name: "Play With Your Prof",
    shortName: "PROF",
    type: "other",
    committee: "proctors",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 43, y: 3, width: 18, height: 13 },
      day2: { x: 43, y: 3, width: 18, height: 13 },
    },
  },
  {
    id: "ttrpg",
    name: "TTRPG Gallery / Booth",
    shortName: "TTRPG",
    type: "booth",
    committee: "proctors",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 63, y: 3, width: 20, height: 13 },
      day2: { x: 63, y: 3, width: 20, height: 13 },
    },
  },

  /* ═══════════════════════════════════════════════════════════════
     LEFT SIDE — E-Sport Game Areas (stacked vertically)
     Day 1: 3 areas  |  Day 2: 2 areas (no ES-3)
     ═══════════════════════════════════════════════════════════════ */
  {
    id: "esports-1",
    name: "E-Sport Game Area 1",
    shortName: "ES-1",
    type: "esport",
    committee: "esports",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 2, y: 18, width: 25, height: 15 },
      day2: { x: 2, y: 18, width: 25, height: 23 },
    },
  },
  {
    id: "esports-2",
    name: "E-Sport Game Area 2",
    shortName: "ES-2",
    type: "esport",
    committee: "esports",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 2, y: 35, width: 25, height: 15 },
      day2: { x: 2, y: 43, width: 25, height: 23 },
    },
  },
  {
    id: "esports-3",
    name: "E-Sport Game Area 3",
    shortName: "ES-3",
    type: "esport",
    committee: "esports",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      /* Day 1 only — Day 2 removes this area */
      day1: { x: 2, y: 52, width: 25, height: 15 },
    },
  },

  /* ═══════════════════════════════════════════════════════════════
     CENTER — Exhibitor Booth Area
     This is one tracked zone; individual booth tables are rendered
     in the map component using the BOOTH_GRID config.
     ═══════════════════════════════════════════════════════════════ */
  {
    id: "gallery",
    name: "Exhibitor Area",
    shortName: "EXHB",
    type: "exhibitor",
    committee: "exhibitors",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 30, y: 18, width: 67, height: 49 },
      day2: { x: 30, y: 18, width: 67, height: 49 },
    },
  },

  /* ═══════════════════════════════════════════════════════════════
     BOTTOM OF HALL
     ═══════════════════════════════════════════════════════════════ */
  {
    id: "committee-area",
    name: "Committee Area",
    shortName: "CMTE",
    type: "committee",
    committee: null,
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 2, y: 69, width: 14, height: 10 },
      day2: { x: 2, y: 69, width: 14, height: 10 },
    },
  },
  {
    id: "rcy",
    name: "RCY",
    shortName: "RCY",
    type: "rcy",
    committee: "proctors",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 18, y: 69, width: 10, height: 10 },
      day2: { x: 18, y: 69, width: 10, height: 10 },
    },
  },
  {
    id: "photobackdrop",
    name: "Photo Backdrop",
    shortName: "PHOTO",
    type: "photobackdrop",
    committee: "documentation",
    tracked: true,
    isOutside: false,
    layoutPositions: {
      day1: { x: 55, y: 69, width: 42, height: 10 },
      day2: { x: 55, y: 69, width: 42, height: 10 },
    },
  },
  /* ═══════════════════════════════════════════════════════════════
     OUTSIDE HALL — Ticketing (below the hall)
     ═══════════════════════════════════════════════════════════════ */
  {
    id: "ticketing",
    name: "Ticketing Area",
    shortName: "TKT",
    type: "ticketing",
    committee: "ticketing",
    tracked: true,
    isOutside: true,
    layoutPositions: {
      day1: { x: 25, y: 84, width: 50, height: 13 },
      day2: { x: 25, y: 84, width: 50, height: 13 },
    },
  },
];

/* ── Helpers ── */

/** Look up a venue zone by ID */
export function getVenueZone(id) {
  return VENUE_ZONES.find((z) => z.id === id) ?? null;
}

/** Get the accent colour for a zone type */
export function getZoneTypeColor(type) {
  return ZONE_TYPE_COLORS[type] ?? ZONE_TYPE_COLORS.other;
}

/** Get zones that exist for a given day layout */
export function getZonesForDay(day) {
  return VENUE_ZONES.filter((z) => z.layoutPositions[day]);
}

/**
 * Unique zone types present in the config (for the map legend).
 * Returns array of { type, color, label }.
 */
export function getZoneTypeLegend() {
  const seen = new Set();
  const legend = [];
  for (const z of VENUE_ZONES) {
    if (!seen.has(z.type)) {
      seen.add(z.type);
      legend.push({
        type: z.type,
        color: ZONE_TYPE_COLORS[z.type] ?? ZONE_TYPE_COLORS.other,
        label: z.type.charAt(0).toUpperCase() + z.type.slice(1),
      });
    }
  }
  return legend;
}
