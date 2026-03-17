/**
 * One-time migration: normalize `contributions.committee` to canonical committee IDs.
 *
 * Examples:
 *   "Proctors" -> "proctors"
 *   "Documentation/Photographers" -> "documentation"
 *
 * Safe to re-run: documents already in canonical form are skipped.
 *
 * Usage:
 *   node scripts/migrateContributionsCommitteeIds.mjs
 *
 * Requires .env with VITE_FIREBASE_* and SEED_EMAIL/SEED_PASSWORD.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ROLE_COMMITTEES } from "../src/lib/constants.js";

const BATCH_SIZE = 400;

function normalizeCommitteeId(value) {
  if (value == null) return "";

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return "";

  const byId = ROLE_COMMITTEES.find((c) => c.id === normalized);
  if (byId) return byId.id;

  const byName = ROLE_COMMITTEES.find((c) => c.name.toLowerCase() === normalized);
  if (byName) return byName.id;

  const firstWord = normalized.split(/[\s/&,-]+/)[0];
  const byFirst = ROLE_COMMITTEES.find(
    (c) => c.name.toLowerCase().startsWith(firstWord) || c.id.startsWith(firstWord)
  );

  return byFirst?.id || null;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");

let envVars = {};
try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    envVars[key] = val;
  });
} catch {
  console.error("Could not read .env. Copy .env.example to .env and fill in values.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("Missing VITE_FIREBASE_PROJECT_ID in .env");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const seedEmail = envVars.SEED_EMAIL;
  const seedPassword = envVars.SEED_PASSWORD;

  if (!seedEmail || !seedPassword) {
    console.error("Missing SEED_EMAIL or SEED_PASSWORD in .env (admin account required)");
    process.exit(1);
  }

  console.log(`Signing in as ${seedEmail}...`);
  await signInWithEmailAndPassword(auth, seedEmail, seedPassword);

  const snap = await getDocs(collection(db, "contributions"));
  console.log(`Scanning ${snap.size} contribution document(s)...`);

  const candidates = [];
  let skipped = 0;
  let unknown = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const current = data.committee ?? "";
    const next = normalizeCommitteeId(current);

    if (next === null) {
      unknown++;
      continue;
    }

    if (next === current) {
      skipped++;
      continue;
    }

    candidates.push({ id: docSnap.id, committee: next });
  }

  const groups = chunk(candidates, BATCH_SIZE);
  for (let i = 0; i < groups.length; i++) {
    const batch = writeBatch(db);
    for (const item of groups[i]) {
      batch.update(doc(db, "contributions", item.id), { committee: item.committee });
    }
    await batch.commit();
    console.log(`Committed batch ${i + 1}/${groups.length} (${groups[i].length} update(s))`);
  }

  console.log("\nSummary");
  console.log(`  Updated : ${candidates.length}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Unknown : ${unknown}`);

  if (unknown > 0) {
    console.log("  Note    : Unknown committee values were left unchanged.");
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
