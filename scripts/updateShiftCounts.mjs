/**
 * One-off migration: Update requiredCount on all existing committeeShifts docs
 * to match the Crowd Control Plan staffing numbers.
 *
 * Signs in as the admin user so Firestore rules allow the write.
 *
 * Usage:  node scripts/updateShiftCounts.mjs
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env ──
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");
let envVars = {};
try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) envVars[key.trim()] = rest.join("=").trim();
  });
} catch {
  console.error("❌ Could not read .env file.");
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
  console.error("❌ Missing VITE_FIREBASE_PROJECT_ID in .env");
  process.exit(1);
}

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Sign in as the admin user so Firestore rules (admin-only write) allow updates
const ADMIN_EMAIL    = envVars.ADMIN_EMAIL    || "admin@gamecon2026.com";
const ADMIN_PASSWORD = envVars.ADMIN_PASSWORD || "Admin@GC2026";

// ── Required staff per committee (from Crowd Control Plan) ──
const REQUIRED = {
  "proctors":        4,
  "marketing":       2,
  "creatives":       2,
  "awards-prizes":   2,
  "documentation":   2,
  "exhibitors":      2,
  "venue-design":    2,
  "ticketing":       3,
  "voting":          2,
  "guest-relations": 3,
  "technical":       3,
  "esports":         3,
};

async function main() {
  // Authenticate as admin
  console.log(`\n🔑 Signing in as ${ADMIN_EMAIL}…`);
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("   Authenticated ✅");
  } catch (err) {
    console.error(`❌ Auth failed: ${err.message}`);
    console.error("   Set ADMIN_EMAIL and ADMIN_PASSWORD in .env if defaults don't work.");
    process.exit(1);
  }

  console.log(`\n🔄 Updating committeeShifts requiredCount in project "${firebaseConfig.projectId}"…\n`);

  const snap = await getDocs(collection(db, "committeeShifts"));

  if (snap.empty) {
    console.log("ℹ️  No committeeShifts documents found — nothing to update.");
    process.exit(0);
  }

  let updated = 0;
  let skipped = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const cId = data.committeeId;
    const newCount = REQUIRED[cId];

    if (!newCount) {
      console.log(`  ⏭  ${d.id} — unknown committee "${cId}", skipped`);
      skipped++;
      continue;
    }

    if (data.requiredCount === newCount) {
      console.log(`  ✅ ${d.id} — already ${newCount}, no change`);
      skipped++;
      continue;
    }

    await updateDoc(doc(db, "committeeShifts", d.id), { requiredCount: newCount });
    console.log(`  ✏️  ${d.id} — ${data.requiredCount ?? "?"} → ${newCount}`);
    updated++;
  }

  console.log(`\n✅ Done.  Updated: ${updated}  |  Skipped: ${skipped}  |  Total docs: ${snap.size}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
