/**
 * attendanceConfig.js
 *
 * Static configuration for the Staff Attendance / Check-In system.
 * Sessions map 1-to-1 with SHIFT_BLOCKS from seed data.
 */

import { SHIFT_BLOCKS } from "../data/seed";

/* ── Attendance statuses ── */
export const ATTENDANCE_STATUSES = ["present", "late", "excused", "absent"];

export const STATUS_META = {
  present: { label: "Present", color: "gc-success", short: "P" },
  late:    { label: "Late",    color: "gc-warning", short: "L" },
  excused: { label: "Excused", color: "blue-400",   short: "E" },
  absent:  { label: "Absent",  color: "gc-danger",  short: "A" },
};

/**
 * Attendance sessions derived from SHIFT_BLOCKS.
 * Each shift block becomes an attendance session.
 * `blockId` is used to query `committeeShifts` for the volunteer pool.
 */
export const ATTENDANCE_SESSIONS = SHIFT_BLOCKS.map((b) => ({
  id: b.id,            // e.g. "d1-morning"
  label: b.label,      // e.g. "Day 1 — Morning"
  blockId: b.id,       // same — used to fetch committeeShifts
  date: b.date,
  start: b.start,
  end: b.end,
}));

/**
 * Build a deterministic Firestore document ID for an attendance record.
 * Pattern: `{blockId}_{personKey}`
 * personKey = sanitised `userId` or `_name_<name>` slug.
 */
export function attendanceDocId(blockId, personKey) {
  return `${blockId}_${personKey}`;
}
