/**
 * Role & Tasking — column mapping configuration.
 *
 * Each key is the canonical committee name used in the app.
 * `headers` lists every Excel column header variant that maps to this committee.
 * `days` lists the sub-column day labels expected.
 *
 * Adjust this file if the Excel layout ever changes — the parser reads from here.
 */

/* ── App-wide role definitions ── */
export const APP_ROLES = [
  { value: "admin",   label: "Admin",   description: "Full control — create users, edit roles, reset system" },
  { value: "proctor", label: "Proctor", description: "Regular operational user — headcounts, shifts, etc." },
  { value: "head",    label: "Head",    description: "Committee head — read-heavy, limited writes" },
  { value: "viewer",  label: "Viewer",  description: "Read-only access" },
];

export const VALID_ROLES = APP_ROLES.map((r) => r.value);

export const COMMITTEE_MAP = {
  "Proctors": {
    headers: ["Proctors"],
    days: ["DAY1/2"],
  },
  "Marketing": {
    headers: ["Marketing"],
    days: ["DAY1/2"],
  },
  "Creatives": {
    headers: ["Creatives"],
    days: ["DAY1/2"],
  },
  "Awards & Prizes": {
    headers: ["Awards & Prizes"],
    days: ["DAY1/2"],
  },
  "Documentation/Photographers": {
    headers: [
      "Documentation/Photographers",
      "Documentation/ Photographers",
      "Documentation / Photographers",
    ],
    days: ["DAY 1", "DAY 2"],
  },
  "Exhibitors": {
    headers: ["Exhibitors"],
    days: ["DAY 1", "DAY 2"],
  },
  "Venue Designer & Management": {
    headers: [
      "Venue Designer & Management",
      "Venue Design & Management",
      "Venue Design and Management",
      "Venue Designer and Management",
    ],
    days: ["DAY 1", "DAY 2"],
  },
  "Ticketing": {
    headers: ["Ticketing"],
    days: ["DAY 1", "DAY 2"],
  },
  "Voting": {
    headers: ["Voting"],
    days: ["DAY 1", "DAY 2"],
  },
  "Guest Relations Officers": {
    headers: ["Guest Relations Officers"],
    days: ["DAY 1", "DAY 2"],
  },
  "Technical Committee": {
    headers: ["Technical Committee", "Technical"],
    days: ["DAY 1", "DAY 2"],
  },
  "E-Sport Organizers": {
    headers: ["E-Sport Organizers", "E-Sports Organizers"],
    days: ["DAY 1", "DAY 2"],
  },
  "Esports Technical": {
    headers: ["Esports Technical", "E-Sport Game Technicals"],
    days: ["DAY 1", "DAY 2"],
  },
  "Shoutcaster": {
    headers: ["Shoutcaster"],
    days: ["DAY1/2"],
  },
  "Crowd Control": {
    headers: ["Crowd Control", "CrowdControl", "Crowd_Control"],
    days: ["DAY 1", "DAY 2"],
  },
};

/** All canonical committee names in display order */
export const COMMITTEE_NAMES = Object.keys(COMMITTEE_MAP);

/** All recognised day slots */
export const DAY_SLOTS = ["DAY 1", "DAY 2", "DAY1/2"];

/**
 * Map of slug IDs (used in seed data / Firestore `committees` collection)
 * to canonical committee names (used in user profiles & dropdowns).
 */
const SLUG_TO_CANONICAL = {
  "proctors":        "Proctors",
  "marketing":       "Marketing",
  "creatives":       "Creatives",
  "awards-prizes":   "Awards & Prizes",
  "documentation":   "Documentation/Photographers",
  "exhibitors":      "Exhibitors",
  "venue-design":    "Venue Designer & Management",
  "ticketing":       "Ticketing",
  "voting":          "Voting",
  "guest-relations": "Guest Relations Officers",
  "technical":       "Technical Committee",
  "esports":         "E-Sport Organizers",
  "esports-technical": "Esports Technical",
  "shoutcaster":     "Shoutcaster",
  "crowd-control":   "Crowd Control",
  "crowd_control":   "Crowd Control",
};

/**
 * Build a reverse lookup: every known header variant / slug / short name → canonical name.
 * This is generated once at module load.
 */
const _variantMap = new Map();

// 1. Canonical names map to themselves
for (const name of COMMITTEE_NAMES) {
  _variantMap.set(name.toLowerCase(), name);
}

// 2. All header variants from COMMITTEE_MAP
for (const [canonical, { headers }] of Object.entries(COMMITTEE_MAP)) {
  for (const h of headers) {
    _variantMap.set(h.toLowerCase(), canonical);
  }
}

// 3. Slug IDs from seed data
for (const [slug, canonical] of Object.entries(SLUG_TO_CANONICAL)) {
  _variantMap.set(slug.toLowerCase(), canonical);
}

// 4. Common shortened names that appear in seed COMMITTEES list
const SHORT_NAME_OVERRIDES = {
  "venue design":     "Venue Designer & Management",
  "technical":        "Technical Committee",
  "documentation":    "Documentation/Photographers",
  "guest relations":  "Guest Relations Officers",
  "esports":          "E-Sport Organizers",
};
for (const [short, canonical] of Object.entries(SHORT_NAME_OVERRIDES)) {
  _variantMap.set(short.toLowerCase(), canonical);
}

/**
 * Normalise any committee string (slug, short name, header variant, etc.)
 * to its canonical COMMITTEE_MAP key. Returns the original string if no match is found.
 *
 * @param {string} raw — the committee value to normalise
 * @returns {string} canonical committee name, or the original if unrecognised
 */
export function normalizeCommitteeName(raw) {
  if (!raw || typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  return _variantMap.get(trimmed.toLowerCase()) || trimmed;
}

/**
 * Normalise an entire committees array (used for user profiles).
 * Deduplicates entries that resolve to the same canonical name + day.
 *
 * @param {Array<{committee: string, day: string}>} arr
 * @returns {Array<{committee: string, day: string}>}
 */
export function normalizeCommittees(arr) {
  if (!Array.isArray(arr)) return arr;
  const seen = new Set();
  const result = [];
  for (const entry of arr) {
    const canonical = normalizeCommitteeName(entry.committee);
    const key = `${canonical}::${entry.day}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ committee: canonical, day: entry.day });
    }
  }
  return result;
}
