/**
 * One-time migration: back-fill `createdAt` on contribution docs that lack it.
 *
 * For each doc in `contributions/` where `createdAt` is missing:
 *   - If a legacy `timestamp` field exists, copy it to `createdAt`.
 *   - Otherwise write the current server time to `createdAt`.
 *
 * Safe to re-run — docs that already have `createdAt` are skipped.
 *
 * Usage:
 *   node scripts/migrateContributionsCreatedAt.mjs
 *
 * Requires a .env file with VITE_FIREBASE_* keys (same as other scripts).
 * You must be able to reach Firestore from this machine (no emulator needed
 * unless you point FIRESTORE_EMULATOR_HOST yourself).
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env ────────────────────────────────────────────────────────────────
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
  console.error("❌  Could not read .env — copy .env.example → .env and fill in values.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey:            envVars.VITE_FIREBASE_API_KEY,
  authDomain:        envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             envVars.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("❌  Missing VITE_FIREBASE_PROJECT_ID in .env");
  process.exit(1);
}

// ── Init ─────────────────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Migration ─────────────────────────────────────────────────────────────────
async function run() {
  const seedEmail    = envVars.SEED_EMAIL;
  const seedPassword = envVars.SEED_PASSWORD;
  if (!seedEmail || !seedPassword) {
    console.error("❌  Missing SEED_EMAIL or SEED_PASSWORD in .env (use an admin account)");
    process.exit(1);
  }

  console.log(`🔑  Signing in as ${seedEmail}…`);
  const cred = await signInWithEmailAndPassword(auth, seedEmail, seedPassword);
  const uid  = cred.user.uid;
  console.log(`    Signed in. UID = ${uid}`);

  // Verify the Firestore user profile exists with role == 'admin'
  const { getDoc } = await import("firebase/firestore");
  const profileSnap = await getDoc(doc(db, "users", uid));
  if (!profileSnap.exists()) {
    console.error(`❌  No Firestore users/${uid} document found — Firestore isAdmin() will always be false. Aborting.`);
    process.exit(1);
  }
  const role = profileSnap.data()?.role;
  const allowedRoles = ["admin", "proctor", "head", "committee-head"];
  if (!allowedRoles.includes(role)) {
    console.error(`❌  users/${uid}.role = "${role}" — must be admin/proctor/head/committee-head. Aborting.`);
    process.exit(1);
  }
  console.log(`    Firestore profile confirmed: role = "${role}"\n`);

  console.log(`🔍  Scanning contributions collection in project "${firebaseConfig.projectId}"…`);

  const snap = await getDocs(collection(db, "contributions"));
  console.log(`    ${snap.size} total document(s) found.`);

  const nowTs = Timestamp.now();
  let skipped  = 0;
  let migrated = 0;
  let errors   = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    // Already has createdAt — skip. Treat null as missing.
    if (data.createdAt != null && data.createdAt !== null) {
      skipped++;
      continue;
    }

    // Prefer the legacy `timestamp` field; fall back to current time.
    const fallback = data.timestamp instanceof Timestamp ? data.timestamp : nowTs;

    try {
      await updateDoc(doc(db, "contributions", docSnap.id), {
        createdAt: fallback,
      });

      const source = data.timestamp instanceof Timestamp ? "timestamp field" : "current time";
      console.log(`  ✅  ${docSnap.id}  →  createdAt set from ${source}`);
      migrated++;
    } catch (err) {
      console.error(`  ❌  ${docSnap.id}  →  update failed:`, err.message);
      errors++;
    }
  }

  console.log("\n── Summary ──────────────────────────────────────");
  console.log(`   Already had createdAt : ${skipped}`);
  console.log(`   Migrated              : ${migrated}`);
  console.log(`   Errors                : ${errors}`);
  console.log("─────────────────────────────────────────────────");

  if (errors > 0) {
    console.warn("⚠️   Some documents failed — re-run to retry them.");
    process.exit(1);
  } else {
    console.log("🎉  Migration complete.");
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
