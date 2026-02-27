/**
 * auditLog.js — Firestore audit logger for PlayVerse Ops.
 *
 * Writes structured entries to the `logs` collection so admins
 * can see a complete timeline of every mutation in the system.
 *
 * Usage:
 *   import { logActivity } from "@/lib/auditLog";
 *   await logActivity({
 *     action:   "user.create",
 *     category: "admin",
 *     details:  "Created user John Doe (john@example.com)",
 *     meta:     { uid: "abc123", email: "john@example.com" },
 *     userId:   currentUser.uid,
 *     userName: profile.name,
 *   });
 *
 * Schema — logs/{id}:
 *   action    : string   – dot-notation action key (e.g. "user.create")
 *   category  : string   – grouping key ("admin" | "contribution" | "shift" | "role" | "incident" | "expense" | "headcount" | "task" | "attendance" | "auth" | "system")
 *   details   : string   – human-readable summary
 *   meta      : object   – optional structured data for the event
 *   userId    : string   – uid of the acting user
 *   userName  : string   – display name of the acting user
 *   timestamp : Timestamp
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "logs";

/**
 * Write an audit log entry to Firestore.
 * Fire-and-forget by default — does not throw on failure
 * (to avoid blocking the primary operation).
 *
 * @param {object} entry
 * @param {string} entry.action   – e.g. "user.create", "shift.add"
 * @param {string} entry.category – grouping key
 * @param {string} entry.details  – human-readable summary
 * @param {object} [entry.meta]   – optional structured metadata
 * @param {string} entry.userId   – acting user's uid
 * @param {string} entry.userName – acting user's display name
 */
export async function logActivity({ action, category, details, meta, userId, userName }) {
  try {
    await addDoc(collection(db, COLLECTION), {
      action,
      category,
      details: details || "",
      meta: meta || null,
      userId: userId || "unknown",
      userName: userName || "Unknown",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Silently fail — audit logging should never break the primary flow
    if (import.meta.env.DEV) {
      console.warn("[auditLog] failed to write:", err);
    }
  }
}
