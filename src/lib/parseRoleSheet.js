/**
 * parseRoleSheet.js
 *
 * Accepts an ArrayBuffer from an uploaded .xlsx file and returns:
 *   { personRoles: PersonRoles[], committeeSchedules: CommitteeSchedule[] }
 *
 * Data shapes:
 * @typedef {"DAY 1"|"DAY 2"|"DAY1/2"} DaySlot
 * @typedef {{ committee: string, day: DaySlot }} RoleAssignment
 * @typedef {{ name: string, assignments: RoleAssignment[] }} PersonRoles
 * @typedef {{ committee: string, day: DaySlot, members: string[] }} CommitteeSchedule
 */

import * as XLSX from "xlsx";
import { COMMITTEE_MAP, DAY_SLOTS } from "./roleConfig";

/* ─── helpers ─── */

/** Normalise whitespace and trim */
function norm(s) {
  return (s || "").toString().replace(/\s+/g, " ").trim();
}

/**
 * Title-case a string: capitalise the first letter of every word.
 * Handles common Filipino surname particles naturally (De, Dela, Del, Delos).
 */
function titleCase(s) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Normalize a raw name into "Lastname, Firstname M." format.
 *
 * Expects names in "LASTNAME, FIRSTNAME [MIDDLENAME(S)]" format from the
 * spreadsheet.  The last word after the given name is treated as the middle
 * name (typically the mother's maiden surname in Filipino convention) and
 * is collapsed to an initial.
 *
 * Examples:
 *   "ABAINZA, ZACH SIDENN NAYAN"      → "Abainza, Zach Sidenn N."
 *   "ACOB, ADRIAN AGCAOILI"           → "Acob, Adrian A."
 *   "Acosta, Deej Jazzen Monares"     → "Acosta, Deej Jazzen M."
 *   "DELA CRUZ, MARIA"                → "Dela Cruz, Maria"
 */
function normalizeName(raw) {
  const trimmed = norm(raw);
  if (!trimmed) return trimmed;

  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) {
    // No comma — just title-case the whole thing
    return titleCase(trimmed);
  }

  const lastName = titleCase(trimmed.slice(0, commaIdx).trim());
  const rest = trimmed.slice(commaIdx + 1).trim();
  if (!rest) return lastName;

  const parts = rest.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    // Only a first name, no middle name
    return `${lastName}, ${titleCase(parts[0])}`;
  }

  // Given name(s) = all words except the last; middle name = last word → initial
  const firstNames = parts.slice(0, -1).map((w) => titleCase(w)).join(" ");
  const middleInitial = parts[parts.length - 1].charAt(0).toUpperCase() + ".";

  return `${lastName}, ${firstNames} ${middleInitial}`;
}

/** Is a cell value truthy? Handles TRUE, "true", "TRUE", 1, etc. */
function isTruthy(v) {
  if (v === true) return true;
  if (typeof v === "string") return v.trim().toUpperCase() === "TRUE";
  if (typeof v === "number") return v === 1;
  return false;
}

/* ─── column mapping ─── */

/**
 * Build a lookup: { [committeeCanonical]: { [daySlot]: colIndex[] } }
 * by scanning the header rows of the sheet.
 *
 * Actual layout (0-indexed):
 *   Row 0: "NAME" in col 0, rest blank (merged)
 *   Row 1: committee names in their starting columns
 *   Row 2: "DAY 1" / "DAY 2" / "DAY1/2" under committees that span 2+ cols
 *
 * Some committees occupy a SINGLE column (no day sub-columns) —
 * those are treated as "DAY1/2" (both days).
 */
function buildColumnIndex(sheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const maxCol = range.e.c;

  // Build a headerLookup from COMMITTEE_MAP for fuzzy matching
  // key = normalised uppercase header → value = canonical committee name
  const headerLookup = {};
  for (const [canonical, cfg] of Object.entries(COMMITTEE_MAP)) {
    for (const h of cfg.headers) {
      headerLookup[norm(h).toUpperCase()] = canonical;
    }
  }

  // Read rows 0, 1, and 2
  const rows = [[], [], []];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c <= maxCol; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      rows[r][c] = cell ? norm(cell.v) : "";
    }
  }

  // Find the NAME column
  let nameCol = 0;
  for (let c = 0; c <= maxCol; c++) {
    const upper0 = rows[0][c].toUpperCase();
    const upper1 = rows[1][c].toUpperCase();
    if (upper0 === "NAME" || upper1 === "NAME") {
      nameCol = c;
      break;
    }
  }

  // Determine the actual header row for committee names
  // Usually row 1, but check row 0 as well
  let committeeRow = 1;
  let dayRow = 2;

  // Verify: if row 1 has recognisable committee names, use that
  let foundInRow1 = false;
  for (let c = 0; c <= maxCol; c++) {
    if (rows[1][c] && headerLookup[rows[1][c].toUpperCase()]) {
      foundInRow1 = true;
      break;
    }
  }
  if (!foundInRow1) {
    // Try row 0 for committees, row 1 for days
    for (let c = 0; c <= maxCol; c++) {
      if (rows[0][c] && headerLookup[rows[0][c].toUpperCase()]) {
        committeeRow = 0;
        dayRow = 1;
        break;
      }
    }
  }

  // First-pass: figure out which column starts each committee group
  // committeeStarts: [ { col, canonical } ]  — sorted by col ascending
  const committeeStarts = [];
  for (let c = 0; c <= maxCol; c++) {
    const val = rows[committeeRow][c].toUpperCase();
    if (val && headerLookup[val]) {
      committeeStarts.push({ col: c, canonical: headerLookup[val] });
    }
  }

  // For each committee group, determine which columns belong to it
  // and what day label each column has
  const colMap = {}; // { committee: { day: colIndex } }

  for (let i = 0; i < committeeStarts.length; i++) {
    const { col: startCol, canonical } = committeeStarts[i];
    const endCol = i + 1 < committeeStarts.length
      ? committeeStarts[i + 1].col - 1
      : maxCol;

    if (!colMap[canonical]) colMap[canonical] = {};

    const groupWidth = endCol - startCol + 1;

    if (groupWidth === 1) {
      // Single-column committee — no day sub-columns
      // Check if there's a day label in the day row
      const dayLabel = rows[dayRow][startCol].toUpperCase().replace(/\s+/g, " ").trim();
      let matched = false;
      for (const ds of DAY_SLOTS) {
        if (dayLabel === ds.toUpperCase() || dayLabel === ds.replace(/\s/g, "").toUpperCase()) {
          colMap[canonical][ds] = startCol;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // No day label → treat as "DAY1/2" (all days)
        colMap[canonical]["DAY1/2"] = startCol;
      }
    } else {
      // Multi-column committee — scan sub-columns for day labels
      for (let c = startCol; c <= endCol; c++) {
        const dayLabel = rows[dayRow][c].toUpperCase().replace(/\s+/g, " ").trim();
        for (const ds of DAY_SLOTS) {
          if (dayLabel === ds.toUpperCase() || dayLabel === ds.replace(/\s/g, "").toUpperCase()) {
            colMap[canonical][ds] = c;
          }
        }
      }
      // If NO day labels found in any sub-column, map first col as DAY1/2
      if (Object.keys(colMap[canonical]).length === 0) {
        colMap[canonical]["DAY1/2"] = startCol;
      }
    }
  }

  // Detect where data rows start (first row after headers with a non-empty name)
  let dataStartRow = 3; // default: row 0=NAME, row 1=committees, row 2=days
  for (let r = 1; r <= Math.min(range.e.r, 10); r++) {
    const nameCell = sheet[XLSX.utils.encode_cell({ r, c: nameCol })];
    const name = nameCell ? norm(nameCell.v) : "";
    if (name && name.toUpperCase() !== "NAME" && !headerLookup[name.toUpperCase()]) {
      // Check it's not a day label either
      const isDayLabel = DAY_SLOTS.some(
        (d) => name.toUpperCase() === d.toUpperCase() || name.toUpperCase() === d.replace(/\s/g, "").toUpperCase()
      );
      if (!isDayLabel) {
        dataStartRow = r;
        break;
      }
    }
  }

  return { nameCol, colMap, dataStartRow };
}

/* ─── main parser ─── */

/**
 * Parse an .xlsx ArrayBuffer into normalised role structures.
 * Reads ALL section sheets (skips "Summary" sheets).
 *
 * @param {ArrayBuffer} buffer
 * @returns {{ personRoles: PersonRoles[], committeeSchedules: CommitteeSchedule[] }}
 */
export function parseRoleSheet(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  if (wb.SheetNames.length === 0) throw new Error("Workbook has no sheets");

  // personMap: name → RoleAssignment[]
  const personMap = new Map();
  // committeeMap: `${committee}|||${day}` → Set<name>
  const committeeMap = new Map();

  // Process each sheet (skip summary/aggregate sheets)
  for (const sheetName of wb.SheetNames) {
    // Skip summary sheets
    if (sheetName.toLowerCase().includes("summary")) continue;

    const sheet = wb.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) continue;

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const { nameCol, colMap, dataStartRow } = buildColumnIndex(sheet);

    // Skip sheets where we detected zero committees
    if (Object.keys(colMap).length === 0) continue;

    for (let r = dataStartRow; r <= range.e.r; r++) {
      const nameCell = sheet[XLSX.utils.encode_cell({ r, c: nameCol })];
      const name = nameCell ? normalizeName(nameCell.v) : "";
      if (!name) continue;

      for (const [committee, dayMap] of Object.entries(colMap)) {
        for (const [day, col] of Object.entries(dayMap)) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c: col })];
          if (cell && isTruthy(cell.v)) {
            // Person → assignments
            if (!personMap.has(name)) personMap.set(name, []);
            personMap.get(name).push({ committee, day });

            // Committee → members
            const key = `${committee}|||${day}`;
            if (!committeeMap.has(key)) committeeMap.set(key, new Set());
            committeeMap.get(key).add(name);
          }
        }
      }
    }
  }

  // Build output arrays
  /** @type {PersonRoles[]} */
  const personRoles = [];
  for (const [name, assignments] of personMap) {
    personRoles.push({ name, assignments });
  }
  personRoles.sort((a, b) => a.name.localeCompare(b.name));

  /** @type {CommitteeSchedule[]} */
  const committeeSchedules = [];
  for (const [key, memberSet] of committeeMap) {
    const [committee, day] = key.split("|||");
    committeeSchedules.push({
      committee,
      day,
      members: [...memberSet].sort(),
    });
  }
  committeeSchedules.sort((a, b) => a.committee.localeCompare(b.committee) || a.day.localeCompare(b.day));

  return { personRoles, committeeSchedules };
}
