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
};

/** All canonical committee names in display order */
export const COMMITTEE_NAMES = Object.keys(COMMITTEE_MAP);

/** All recognised day slots */
export const DAY_SLOTS = ["DAY 1", "DAY 2", "DAY1/2"];
