/**
 * rolesEditor.js
 *
 * Firestore helpers for editing Role & Tasking data after import.
 * Uses batched writes to keep roleAssignments and committeeSchedules in sync.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

/* ─── constants ─── */
const ROLE_ASSIGNMENTS    = "roleAssignments";
const COMMITTEE_SCHEDULES = "committeeSchedules";

/* ─── helpers ─── */

/** Create a Firestore-safe document id from an arbitrary string */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Build the committee schedule doc id */
function scheduleDocId(committee, day) {
  return slugify(`${committee}-${day}`);
}

/* ────────────────────────────────────────────
 *  1. Person-level operations
 * ──────────────────────────────────────────── */

/**
 * Add an assignment { committee, day } to a person.
 * Also adds the person into the matching committeeSchedule members array.
 */
export async function addAssignmentToPerson(personId, assignment, userId) {
  const batch = writeBatch(db);

  // 1. Update roleAssignments doc
  const personRef = doc(db, ROLE_ASSIGNMENTS, personId);
  const personSnap = await getDoc(personRef);

  if (!personSnap.exists()) {
    throw new Error(`Person doc ${personId} not found`);
  }

  const personData = personSnap.data();
  const existing = personData.assignments || [];

  // Prevent exact duplicate
  const alreadyExists = existing.some(
    (a) => a.committee === assignment.committee && a.day === assignment.day
  );
  if (alreadyExists) return;

  // Prevent redundant day-slot overlap for same committee
  const sameComm = existing.filter((a) => a.committee === assignment.committee);
  if (sameComm.length > 0) {
    const existingDays = sameComm.map((a) => a.day);
    const incoming = assignment.day;

    // Adding DAY1/2 when DAY 1 or DAY 2 (or both) already exist
    if (incoming === "DAY1/2" && (existingDays.includes("DAY 1") || existingDays.includes("DAY 2"))) {
      const covered = existingDays.filter((d) => d === "DAY 1" || d === "DAY 2").join(" & ");
      throw new Error(
        `Redundant: ${personData.name} already has ${covered} for ${assignment.committee}. DAY1/2 would overlap.`
      );
    }

    // Adding DAY 1 or DAY 2 when DAY1/2 already covers it
    if ((incoming === "DAY 1" || incoming === "DAY 2") && existingDays.includes("DAY1/2")) {
      throw new Error(
        `Redundant: ${personData.name} already has DAY1/2 for ${assignment.committee}, which covers ${incoming}.`
      );
    }
  }

  const newSource =
    personData.source === "excel" || personData.source === "mixed"
      ? "mixed"
      : personData.source || "manual";

  batch.update(personRef, {
    assignments: [...existing, { committee: assignment.committee, day: assignment.day }],
    source: newSource,
    lastUpdatedAt: serverTimestamp(),
    lastUpdatedBy: userId,
  });

  // 2. Update committeeSchedule — add person name to members
  const schedId = scheduleDocId(assignment.committee, assignment.day);
  const schedRef = doc(db, COMMITTEE_SCHEDULES, schedId);
  const schedSnap = await getDoc(schedRef);

  if (schedSnap.exists()) {
    const members = schedSnap.data().members || [];
    if (!members.includes(personData.name)) {
      batch.update(schedRef, {
        members: [...members, personData.name],
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: userId,
      });
    }
  } else {
    // Schedule doc doesn't exist yet — create it
    batch.set(schedRef, {
      committee: assignment.committee,
      day: assignment.day,
      members: [personData.name],
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: userId,
    });
  }

  await batch.commit();
}

/**
 * Remove an assignment { committee, day } from a person.
 * Also removes the person from the matching committeeSchedule members array.
 */
export async function removeAssignmentFromPerson(personId, assignment, userId) {
  const batch = writeBatch(db);

  // 1. Update roleAssignments doc
  const personRef = doc(db, ROLE_ASSIGNMENTS, personId);
  const personSnap = await getDoc(personRef);

  if (!personSnap.exists()) {
    throw new Error(`Person doc ${personId} not found`);
  }

  const personData = personSnap.data();
  const updated = (personData.assignments || []).filter(
    (a) => !(a.committee === assignment.committee && a.day === assignment.day)
  );

  const newSource =
    personData.source === "excel" || personData.source === "mixed"
      ? "mixed"
      : personData.source || "manual";

  batch.update(personRef, {
    assignments: updated,
    source: newSource,
    lastUpdatedAt: serverTimestamp(),
    lastUpdatedBy: userId,
  });

  // 2. Update committeeSchedule — remove person name from members
  const schedId = scheduleDocId(assignment.committee, assignment.day);
  const schedRef = doc(db, COMMITTEE_SCHEDULES, schedId);
  const schedSnap = await getDoc(schedRef);

  if (schedSnap.exists()) {
    const members = (schedSnap.data().members || []).filter(
      (m) => m !== personData.name
    );
    batch.update(schedRef, {
      members,
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: userId,
    });
  }

  await batch.commit();
}

/* ────────────────────────────────────────────
 *  2. Committee-level operations
 * ──────────────────────────────────────────── */

/**
 * Add a member to a committee schedule.
 * Also updates (or creates) the person's roleAssignment doc with the new assignment.
 *
 * @param {string} committee
 * @param {string} day
 * @param {{ id: string, name: string }} person  – id is the roleAssignment doc id
 * @param {string} userId  – admin uid
 */
export async function addMemberToCommitteeSchedule(committee, day, person, userId) {
  const batch = writeBatch(db);

  // 1. Update committeeSchedule
  const schedId = scheduleDocId(committee, day);
  const schedRef = doc(db, COMMITTEE_SCHEDULES, schedId);
  const schedSnap = await getDoc(schedRef);

  if (schedSnap.exists()) {
    const members = schedSnap.data().members || [];
    if (!members.includes(person.name)) {
      batch.update(schedRef, {
        members: [...members, person.name],
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: userId,
      });
    }
  } else {
    batch.set(schedRef, {
      committee,
      day,
      members: [person.name],
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: userId,
    });
  }

  // 2. Update person's roleAssignment doc
  const personRef = doc(db, ROLE_ASSIGNMENTS, person.id);
  const personSnap = await getDoc(personRef);

  if (personSnap.exists()) {
    const data = personSnap.data();
    const existing = data.assignments || [];
    const alreadyExists = existing.some(
      (a) => a.committee === committee && a.day === day
    );
    if (!alreadyExists) {
      const newSource =
        data.source === "excel" || data.source === "mixed"
          ? "mixed"
          : data.source || "manual";
      batch.update(personRef, {
        assignments: [...existing, { committee, day }],
        source: newSource,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: userId,
      });
    }
  } else {
    // Person doc doesn't exist — create it (new person)
    batch.set(personRef, {
      name: person.name,
      assignments: [{ committee, day }],
      source: "manual",
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: userId,
    });
  }

  await batch.commit();
}

/**
 * Remove a member from a committee schedule.
 * Also removes the matching assignment from the person's roleAssignment doc.
 */
export async function removeMemberFromCommitteeSchedule(committee, day, personName, userId) {
  const batch = writeBatch(db);

  // 1. Update committeeSchedule
  const schedId = scheduleDocId(committee, day);
  const schedRef = doc(db, COMMITTEE_SCHEDULES, schedId);
  const schedSnap = await getDoc(schedRef);

  if (schedSnap.exists()) {
    const members = (schedSnap.data().members || []).filter(
      (m) => m !== personName
    );
    batch.update(schedRef, {
      members,
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: userId,
    });
  }

  // 2. Find the person's roleAssignment doc by name and remove the assignment
  const personId = slugify(personName);
  const personRef = doc(db, ROLE_ASSIGNMENTS, personId);
  const personSnap = await getDoc(personRef);

  if (personSnap.exists()) {
    const data = personSnap.data();
    const updated = (data.assignments || []).filter(
      (a) => !(a.committee === committee && a.day === day)
    );
    const newSource =
      data.source === "excel" || data.source === "mixed"
        ? "mixed"
        : data.source || "manual";
    batch.update(personRef, {
      assignments: updated,
      source: newSource,
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: userId,
    });
  }

  await batch.commit();
}

/* ────────────────────────────────────────────
 *  3. Create new person
 * ──────────────────────────────────────────── */

/**
 * Create a brand-new person entry (not from Excel).
 * Optionally assign them to an initial committee/day.
 */
export async function createNewPerson(name, committee, day, userId) {
  const personId = slugify(name);
  const batch = writeBatch(db);

  // Guard against duplicate
  const personRef = doc(db, ROLE_ASSIGNMENTS, personId);
  const existing = await getDoc(personRef);
  if (existing.exists()) {
    throw new Error(`A person with this name already exists ("${name}")`);
  }

  const assignments =
    committee && day ? [{ committee, day }] : [];

  batch.set(personRef, {
    name,
    assignments,
    source: "manual",
    lastUpdatedAt: serverTimestamp(),
    lastUpdatedBy: userId,
  });

  // If initial assignment provided, also update committeeSchedule
  if (committee && day) {
    const schedId = scheduleDocId(committee, day);
    const schedRef = doc(db, COMMITTEE_SCHEDULES, schedId);
    const schedSnap = await getDoc(schedRef);

    if (schedSnap.exists()) {
      const members = schedSnap.data().members || [];
      if (!members.includes(name)) {
        batch.update(schedRef, {
          members: [...members, name],
          lastUpdatedAt: serverTimestamp(),
          lastUpdatedBy: userId,
        });
      }
    } else {
      batch.set(schedRef, {
        committee,
        day,
        members: [name],
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: userId,
      });
    }
  }

  await batch.commit();
  return personId;
}
