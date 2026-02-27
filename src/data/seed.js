/* ── Seed data for IT GameCon 2026 ── */

export const ZONES = [
  { id: "ticketing",    name: "Ticketing",          order: 1,  committee: "ticketing" },
  { id: "rcy",             name: "RCY",                order: 2,  committee: "proctors" },
  { id: "committee-area",  name: "Committee Area",     order: 3,  committee: null },
  { id: "esports-1",    name: "Esports Area 1",     order: 4,  committee: "esports" },
  { id: "esports-2",    name: "Esports Area 2",     order: 5,  committee: "esports" },
  { id: "esports-3",    name: "Esports Area 3",     order: 6,  committee: "esports" },
  { id: "holding",      name: "Holding Area",       order: 7,  committee: "guest-relations" },
  { id: "play-prof",    name: "Play w/ Prof",       order: 8,  committee: "proctors" },
  { id: "ttrpg",        name: "TTRPG Zone",         order: 9,  committee: "proctors" },
  { id: "gallery",      name: "Exhibitor Area",     order: 10, committee: "exhibitors" },
  { id: "voting",       name: "Voting Area",        order: 11, committee: "voting" },
  { id: "photobackdrop",name: "Photo Backdrop",     order: 12, committee: "documentation" },
];

export const COMMITTEES = [
  { id: "proctors",        name: "Proctors",          color: "#C8102E" },
  { id: "marketing",       name: "Marketing",         color: "#F97316" },
  { id: "creatives",       name: "Creatives",         color: "#A855F7" },
  { id: "awards-prizes",   name: "Awards & Prizes",   color: "#EAB308" },
  { id: "documentation",   name: "Documentation",     color: "#3B82F6" },
  { id: "crowd-control",   name: "Crowd Control",     color: "#B91C1C" },
  { id: "exhibitors",      name: "Exhibitors",        color: "#EC4899" },
  { id: "venue-design",    name: "Venue Design",      color: "#14B8A6" },
  { id: "ticketing",       name: "Ticketing",         color: "#22C55E" },
  { id: "voting",          name: "Voting",            color: "#8B5CF6" },
  { id: "guest-relations", name: "Guest Relations",   color: "#06B6D4" },
  { id: "technical",       name: "Technical",         color: "#64748B" },
  { id: "esports",         name: "Esports",           color: "#E31837" },
];

/** Committees excluding shift-only entries (Crowd Control) — use in pickers, contributions, etc. */
export const ROLE_COMMITTEES = COMMITTEES.filter((c) => c.id !== "crowd-control");

/**
 * Required staff count per committee per shift block.
 * Derived from the Gamecon Crowd Control Plan — "Inside-Hall Staff Distribution"
 * section (Staff Cap Y = 25–30 at any one time).
 *
 *  Proctors (4)        – Area Marshals: E-sport Holding (1), TTRPG/Gallery (1),
 *                        Play With Your Prof (1), E-Sport cluster shared (1)
 *  Marketing (2)       – Outside Queue Management & social comms
 *  Creatives (2)       – Signage & Support, photobackdrop rotation
 *  Awards & Prizes (2) – General Floaters/Runners (shared with Venue Design)
 *  Documentation (2)   – Media Team, limited inside, rotate from outside
 *  Exhibitors (2)      – Booth Staff, keep booth frontage clear
 *  Venue Design (2)    – Hall Supervisor (1) + Layout Coordination/Floater (1)
 *  Ticketing (3)       – Entrance Controllers (2–3) + Exit Controller (1)
 *  Voting (2)          – Voting Area Marshals
 *  Guest Relations (3) – VIP Lead (1) + VIP Escorts (2–3)
 *  Technical (3)       – Technical Zone Control, secure cables & tech zones
 *  Esports (3)         – Tournament Area Marshals + E-Sport area organizers
 */
export const COMMITTEE_REQUIRED_STAFF = {
  "proctors":        4,
  "marketing":       2,
  "creatives":       2,
  "awards-prizes":   2,
  "documentation":   2,
  "exhibitors":      1,
  "crowd-control":   12,
  "venue-design":    2,
  "ticketing":       3,
  "voting":          2,
  "guest-relations": 3,
  "technical":       3,
  "esports":         3,
};

export const EXPENSE_CATEGORIES = [
  "Printing",
  "Venue",
  "Equipment",
  "Food & Drinks",
  "Prizes",
  "Materials",
  "Transportation",
  "Miscellaneous",
];

export const SHIFT_BLOCKS = [
  { id: "d1-morning",   label: "Day 1 — Morning",   date: "2026-03-05", start: "09:00", end: "12:00" },
  { id: "d1-afternoon", label: "Day 1 — Afternoon",  date: "2026-03-05", start: "13:00", end: "17:00" },
  { id: "d2-morning",   label: "Day 2 — Morning",   date: "2026-03-06", start: "09:00", end: "12:00" },
  { id: "d2-afternoon", label: "Day 2 — Afternoon",  date: "2026-03-06", start: "13:00", end: "17:00" },
];
