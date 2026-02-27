/**
 * assigneePicker.js
 *
 * Helper to fetch assignable people from the imported roleAssignments data.
 * Used by the task form to populate the assignee selector dropdown.
 */

import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Fetch all people from roleAssignments, optionally filtered by day and committee.
 *
 * @param {"DAY 1"|"DAY 2"|null} [day]       — filter to people assigned on this day
 * @param {string|null}          [committee]  — filter to people in this committee
 * @returns {Promise<{id: string, name: string, assignments: {committee: string, day: string}[]}[]>}
 */
export async function getAssignablePeople(day = null, committee = null) {
  const q = query(collection(db, "roleAssignments"), orderBy("name"));
  const snap = await getDocs(q);
  let people = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (day) {
    people = people.filter((p) =>
      p.assignments?.some(
        (a) => a.day === day || a.day === "DAY1/2"
      )
    );
  }

  if (committee) {
    people = people.filter((p) =>
      p.assignments?.some((a) => a.committee === committee)
    );
  }

  return people;
}
