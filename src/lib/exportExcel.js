/**
 * exportExcel.js — Centralised Excel (.xlsx) export helpers.
 *
 * Uses the `xlsx` (SheetJS) library already in the project.
 * Each helper accepts an array of documents (or processed data) and
 * triggers a browser download of a styled workbook.
 */
import * as XLSX from "xlsx";
import { COMMITTEES, EXPENSE_CATEGORIES, SHIFT_BLOCKS } from "./constants";

/* ────────────────────────────── helpers ────────────────────────────── */

/** Convert a Firestore Timestamp (or Date, or ISO string) to a readable string */
function ts(val) {
  if (!val) return "";
  const d = val.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** Trigger .xlsx download from a workbook */
function downloadWorkbook(wb, filename) {
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Set column widths on a worksheet from header array */
function autoWidth(ws, headers) {
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
}

/** Resolve committee ID → display name */
function committeeName(id) {
  if (!id) return "";
  const found = COMMITTEES.find((c) => c.id === id);
  return found ? found.name : id;
}

/* ══════════════════════════════════════════════════════════════════════
 * 1 — ATTENDANCE
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Export attendance data for a given block.
 *
 * @param {Array}  volunteers - { id, name, committees[] }
 * @param {Object} records    - personId → { status, checkedInAt, markedBy }
 * @param {string} blockId    - e.g. "d1-morning"
 * @param {string} blockLabel - e.g. "Day 1 — Morning"
 */
export function exportAttendance(volunteers, records, blockId, blockLabel) {
  const headers = ["Name", "Committees", "Status", "Checked In At", "Marked By"];
  const rows = volunteers.map((p) => {
    const rec = records[p.id];
    return [
      p.name || "",
      (p.committees || []).join(", "),
      rec?.status || "unmarked",
      ts(rec?.checkedInAt),
      rec?.markedBy || "",
    ];
  });

  // Summary counts
  const counts = { present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 };
  volunteers.forEach((p) => {
    const s = records[p.id]?.status;
    if (s) counts[s]++;
    else counts.unmarked++;
  });

  const wb = XLSX.utils.book_new();

  // Records sheet
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  autoWidth(ws, headers);
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  // Summary sheet
  const summaryHeaders = ["Metric", "Count"];
  const summaryRows = [
    ["Total Expected", volunteers.length],
    ["Present", counts.present],
    ["Late", counts.late],
    ["Excused", counts.excused],
    ["Absent", counts.absent],
    ["Unmarked", counts.unmarked],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  autoWidth(wsSummary, summaryHeaders);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  downloadWorkbook(wb, `Attendance_${blockId}_${new Date().toISOString().slice(0, 10)}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * 2 — CONTRIBUTIONS
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Export all contributions.
 *
 * @param {Array} contributions - Firestore docs array
 */
export function exportContributions(contributions) {
  const headers = ["Name", "Committee", "Task", "Description", "Logged At"];
  const rows = contributions.map((c) => [
    c.userName || "",
    committeeName(c.committee),
    c.task || "",
    c.description || c.details || "",
    ts(c.createdAt || c.timestamp),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoWidth(ws, headers);
  XLSX.utils.book_append_sheet(wb, ws, "Contributions");

  // Per-committee summary
  const byComm = {};
  contributions.forEach((c) => {
    const name = committeeName(c.committee) || "Unassigned";
    byComm[name] = (byComm[name] || 0) + 1;
  });
  const summHeaders = ["Committee", "Total Contributions"];
  const summRows = Object.entries(byComm).sort((a, b) => b[1] - a[1]);
  const wsSumm = XLSX.utils.aoa_to_sheet([summHeaders, ...summRows]);
  autoWidth(wsSumm, summHeaders);
  XLSX.utils.book_append_sheet(wb, wsSumm, "By Committee");

  // Per-person summary
  const byPerson = {};
  contributions.forEach((c) => {
    const name = c.userName || "Unknown";
    byPerson[name] = (byPerson[name] || 0) + 1;
  });
  const personHeaders = ["Name", "Total Contributions"];
  const personRows = Object.entries(byPerson).sort((a, b) => b[1] - a[1]);
  const wsPerson = XLSX.utils.aoa_to_sheet([personHeaders, ...personRows]);
  autoWidth(wsPerson, personHeaders);
  XLSX.utils.book_append_sheet(wb, wsPerson, "By Person");

  downloadWorkbook(wb, `Contributions_${new Date().toISOString().slice(0, 10)}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * 3 — SHIFTS
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Export shift assignments for a block.
 *
 * @param {Array}  shifts    - Array of shift docs { committeeId, committeeName, assignees[] }
 * @param {string} blockId   - e.g. "d1-morning"
 * @param {string} blockLabel
 */
export function exportShifts(shifts, blockId, blockLabel) {
  const headers = ["Committee", "Assignee Name", "Filled / Required", "Block"];
  const rows = [];

  shifts.forEach((shift) => {
    const assignees = shift.assignees || [];
    const required = shift.minRequired || shift.requiredCount || 0;
    if (assignees.length === 0) {
      rows.push([
        shift.committeeName || committeeName(shift.committeeId),
        "(no assignees)",
        `0 / ${required}`,
        blockLabel || blockId,
      ]);
    } else {
      assignees.forEach((a, i) => {
        rows.push([
          i === 0 ? (shift.committeeName || committeeName(shift.committeeId)) : "",
          a.name || a.userId || "",
          i === 0 ? `${assignees.length} / ${required}` : "",
          i === 0 ? (blockLabel || blockId) : "",
        ]);
      });
    }
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoWidth(ws, headers);
  XLSX.utils.book_append_sheet(wb, ws, "Shifts");

  // Coverage summary
  const summHeaders = ["Committee", "Assigned", "Required", "Status"];
  const summRows = shifts.map((s) => {
    const assigned = (s.assignees || []).length;
    const required = s.minRequired || s.requiredCount || 0;
    return [
      s.committeeName || committeeName(s.committeeId),
      assigned,
      required,
      assigned >= required ? "✓ Filled" : "✗ Short",
    ];
  });
  const wsSumm = XLSX.utils.aoa_to_sheet([summHeaders, ...summRows]);
  autoWidth(wsSumm, summHeaders);
  XLSX.utils.book_append_sheet(wb, wsSumm, "Coverage");

  downloadWorkbook(wb, `Shifts_${blockId}_${new Date().toISOString().slice(0, 10)}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * 4 — INCIDENTS
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Export all incident reports.
 *
 * @param {Array} incidents - Firestore docs array
 */
export function exportIncidents(incidents) {
  const headers = ["Title", "Zone", "Severity", "Status", "Details", "Reported By", "Resolved By", "Reported At"];
  const rows = incidents.map((inc) => [
    inc.title || "",
    inc.zoneId || "",
    inc.severity || "",
    inc.status || "open",
    inc.details || "",
    inc.reporterName || inc.reportedBy || "",
    inc.resolvedByName || inc.resolvedBy || "",
    ts(inc.timestamp),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoWidth(ws, headers);
  XLSX.utils.book_append_sheet(wb, ws, "Incidents");

  // Severity breakdown
  const bySeverity = { low: 0, medium: 0, high: 0 };
  const byStatus = { open: 0, resolved: 0 };
  incidents.forEach((inc) => {
    if (bySeverity[inc.severity] !== undefined) bySeverity[inc.severity]++;
    byStatus[inc.status === "resolved" ? "resolved" : "open"]++;
  });
  const summHeaders = ["Metric", "Count"];
  const summRows = [
    ["Total Incidents", incidents.length],
    ["", ""],
    ["Severity: Low", bySeverity.low],
    ["Severity: Medium", bySeverity.medium],
    ["Severity: High", bySeverity.high],
    ["", ""],
    ["Status: Open", byStatus.open],
    ["Status: Resolved", byStatus.resolved],
  ];
  const wsSumm = XLSX.utils.aoa_to_sheet([summHeaders, ...summRows]);
  autoWidth(wsSumm, summHeaders);
  XLSX.utils.book_append_sheet(wb, wsSumm, "Summary");

  downloadWorkbook(wb, `Incidents_${new Date().toISOString().slice(0, 10)}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * 5 — EXPENSES
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Export all expense records.
 *
 * @param {Array} expenses - Firestore docs array
 */
export function exportExpenses(expenses) {
  const headers = ["Item", "Amount (₱)", "Category", "Committee", "Status", "Submitted By", "Date"];
  const rows = expenses.map((exp) => [
    exp.item || "",
    exp.amount || 0,
    exp.category || "Uncategorized",
    committeeName(exp.committee) || "General",
    exp.status || "pending",
    exp.userName || "",
    ts(exp.timestamp),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoWidth(ws, headers);
  // Format amount column as number
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");

  // Summary by category
  const byCat = {};
  expenses.forEach((e) => {
    const cat = e.category || "Uncategorized";
    byCat[cat] = (byCat[cat] || 0) + (e.amount || 0);
  });
  const catHeaders = ["Category", "Total (₱)"];
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  catRows.push(["", ""], ["TOTAL", total]);
  const wsCat = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
  autoWidth(wsCat, catHeaders);
  XLSX.utils.book_append_sheet(wb, wsCat, "By Category");

  // Summary by committee
  const byComm = {};
  expenses.forEach((e) => {
    const name = committeeName(e.committee) || "General";
    byComm[name] = (byComm[name] || 0) + (e.amount || 0);
  });
  const commHeaders = ["Committee", "Total (₱)"];
  const commRows = Object.entries(byComm).sort((a, b) => b[1] - a[1]);
  commRows.push(["", ""], ["TOTAL", total]);
  const wsComm = XLSX.utils.aoa_to_sheet([commHeaders, ...commRows]);
  autoWidth(wsComm, commHeaders);
  XLSX.utils.book_append_sheet(wb, wsComm, "By Committee");

  downloadWorkbook(wb, `Expenses_${new Date().toISOString().slice(0, 10)}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * 6 — AUDIT LOGS
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Export audit/activity logs.
 *
 * @param {Array} logs - Firestore docs array
 */
export function exportLogs(logs) {
  const headers = ["Action", "Category", "Details", "User", "Timestamp"];
  const rows = logs.map((l) => [
    l.action || "",
    l.category || "",
    l.details || "",
    l.userName || "system",
    ts(l.timestamp),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  autoWidth(ws, headers);
  XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");

  downloadWorkbook(wb, `AuditLogs_${new Date().toISOString().slice(0, 10)}`);
}
