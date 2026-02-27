/**
 * attendanceFirestore.js
 *
 * Firestore helpers for the Staff Attendance system.
 * Volunteers are sourced from the **committeeShifts** collection
 * (the Shift Board), not from imported role data.
 *
 * Collection:
 *   attendanceRecords/{blockId}_{personKey}
 */

import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { attendanceDocId } from "./attendanceConfig";

const ATTENDANCE_COL = "attendanceRecords";
const COMMITTEE_SHIFTS_COL = "committeeShifts";

/* ─── Read: volunteers pool from committeeShifts ─── */

/**
 * Subscribe to all committeeShifts for a given dayBlock and flatten
 * the `assignees` arrays into a deduplicated volunteer list.
 *
 * Each volunteer object: { id, name, committees }
 *   • `id`         – the userId (or `_name_<name>` slug) stored in assignees
 *   • `name`       – display name
 *   • `committees` – array of committee names this person is assigned to for this block
 *
 * @param {string} blockId  e.g. "d1-morning"
 * @param {(volunteers: Array) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeVolunteersForBlock(blockId, callback) {
  const q = query(
    collection(db, COMMITTEE_SHIFTS_COL),
    where("dayBlock", "==", blockId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const personMap = {}; // keyed by assignee userId
      snap.docs.forEach((d) => {
        const shift = d.data();
        const committeeName = shift.committeeName || shift.committeeId;
        for (const a of shift.assignees || []) {
          const key = a.userId;
          if (!personMap[key]) {
            personMap[key] = { id: key, name: a.name, committees: [] };
          }
          if (!personMap[key].committees.includes(committeeName)) {
            personMap[key].committees.push(committeeName);
          }
        }
      });
      const list = Object.values(personMap).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      callback(list);
    },
    (err) => {
      console.error("subscribeVolunteersForBlock error:", err);
      callback([]);
    }
  );
}

/* ─── Real-time: attendance records for a session / block ─── */

/**
 * Subscribe to all attendance records for a given block.
 *
 * @param {string} blockId  e.g. "d1-morning"
 * @param {(records: Object<string, object>) => void} callback  keyed by personId
 * @returns {() => void} unsubscribe
 */
export function subscribeAttendanceForBlock(blockId, callback) {
  const q = query(
    collection(db, ATTENDANCE_COL),
    where("blockId", "==", blockId),
    orderBy("name")
  );
  return onSnapshot(
    q,
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        map[data.personId] = data;
      });
      callback(map);
    },
    (err) => {
      console.error("subscribeAttendanceForBlock error:", err);
      callback({});
    }
  );
}

/* ─── Write: mark attendance ─── */

/**
 * Create or update an attendance record for one person in a block.
 *
 * @param {string} blockId         e.g. "d1-morning"
 * @param {object} person          { id, name, committees }
 * @param {string} status          "present" | "late" | "excused" | "absent"
 * @param {string} markedByUid     uid of the proctor / admin
 */
export async function markAttendance(blockId, person, status, markedByUid) {
  const docId = attendanceDocId(blockId, person.id);

  const data = {
    personId: person.id,
    name: person.name,
    committees: person.committees || [],
    blockId,
    status,
    markedBy: markedByUid,
    updatedAt: serverTimestamp(),
  };

  // Set checkedInAt only on present / late
  if (status === "present" || status === "late") {
    data.checkedInAt = serverTimestamp();
  }

  await setDoc(doc(db, ATTENDANCE_COL, docId), data, { merge: true });
}

/* ─── Bulk: mark all unmarked as absent ─── */

/**
 * For every volunteer in the block who does NOT have an attendanceRecord,
 * create one with status = "absent".
 */
export async function markRemainingAbsent(blockId, volunteers, existingRecords, markedByUid) {
  const promises = [];
  for (const person of volunteers) {
    if (!existingRecords[person.id]) {
      promises.push(markAttendance(blockId, person, "absent", markedByUid));
    }
  }
  await Promise.all(promises);
}
