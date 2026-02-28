/**
 * Firestore Seed Script — Run with: npm run seed
 *
 * Populates zones + test committees.
 * Requires .env with Firebase config (same VITE_ vars).
 *
 * Usage:
 *   1. Copy .env.example → .env and fill in Firebase values
 *   2. npm run seed
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env manually (avoid extra dep)
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
  console.error("❌ Could not read .env file. Copy .env.example → .env and fill in values.");
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

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// Authenticate — set SEED_EMAIL & SEED_PASSWORD in .env (admin account)
const seedEmail = envVars.SEED_EMAIL;
const seedPassword = envVars.SEED_PASSWORD;
if (!seedEmail || !seedPassword) {
  console.error("❌ Missing SEED_EMAIL or SEED_PASSWORD in .env (use an admin account)");
  process.exit(1);
}

// ── Zone data ──
const ZONES = [
  { id: "ticketing",     name: "Ticketing",       order: 1,  committee: "ticketing",        currentCount: 0, peakCount: 0 },
  { id: "rcy",              name: "RCY",              order: 2,  committee: "proctors",         currentCount: 0, peakCount: 0 },
  { id: "committee-area",  name: "Committee Area",    order: 3,  committee: null,               currentCount: 0, peakCount: 0 },
  { id: "esports-1",     name: "Esports Area 1",  order: 4,  committee: "esports",          currentCount: 0, peakCount: 0 },
  { id: "esports-2",     name: "Esports Area 2",  order: 5,  committee: "esports",          currentCount: 0, peakCount: 0 },
  { id: "esports-3",     name: "Esports Area 3",  order: 6,  committee: "esports",          currentCount: 0, peakCount: 0 },
  { id: "holding",       name: "Holding Area",    order: 7,  committee: "guest-relations",  currentCount: 0, peakCount: 0 },
  { id: "play-prof",     name: "Play w/ Prof",    order: 8,  committee: "proctors",         currentCount: 0, peakCount: 0 },
  { id: "ttrpg",         name: "TTRPG Zone",      order: 9,  committee: "proctors",         currentCount: 0, peakCount: 0 },
  { id: "gallery",       name: "Exhibitor Area", order: 10, committee: "exhibitors",       currentCount: 0, peakCount: 0 },
  { id: "voting",        name: "Voting Area",    order: 11, committee: "voting",           currentCount: 0, peakCount: 0 },
  { id: "photobackdrop", name: "Photo Backdrop",  order: 12, committee: "documentation",    currentCount: 0, peakCount: 0 },
];

// ── Committee data ──
const COMMITTEES = [
  { id: "proctors",        name: "Proctors",        color: "#C8102E" },
  { id: "marketing",       name: "Marketing",       color: "#F97316" },
  { id: "creatives",       name: "Creatives",       color: "#A855F7" },
  { id: "awards-prizes",   name: "Awards & Prizes", color: "#EAB308" },
  { id: "documentation",   name: "Documentation",   color: "#3B82F6" },
  { id: "exhibitors",      name: "Exhibitors",      color: "#EC4899" },
  { id: "venue-design",    name: "Venue Design",    color: "#14B8A6" },
  { id: "ticketing",       name: "Ticketing",       color: "#22C55E" },
  { id: "voting",          name: "Voting",          color: "#8B5CF6" },
  { id: "guest-relations", name: "Guest Relations", color: "#06B6D4" },
  { id: "technical",       name: "Technical",       color: "#64748B" },
  { id: "esports",         name: "Esports",         color: "#E31837" },
];

async function seed() {
  console.log("🎮 Seeding IT GameCon 2026 data…\n");

  // Sign in as admin
  console.log("  🔑 Signing in…");
  await signInWithEmailAndPassword(auth, seedEmail, seedPassword);
  console.log("  ✅ Authenticated\n");

  // Seed zones
  for (const zone of ZONES) {
    const { id, ...data } = zone;
    await setDoc(doc(db, "zones", id), data, { merge: true });
    console.log(`  ✅ Zone: ${data.name}`);
  }

  // Seed committees
  for (const comm of COMMITTEES) {
    const { id, ...data } = comm;
    await setDoc(doc(db, "committees", id), { ...data, members: [] }, { merge: true });
    console.log(`  ✅ Committee: ${data.name}`);
  }

  console.log("\n🏁 Seed complete! Your Firestore is ready.");
  console.log("   Run `npm run dev` to start the app.\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
