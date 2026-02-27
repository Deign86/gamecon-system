/**
 * Create test user accounts via Firebase Auth REST API + seed their Firestore profiles.
 * Usage: node src/data/seedUsers.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../../.env");
let envVars = {};
try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) envVars[key.trim()] = rest.join("=").trim();
  });
} catch {
  console.error("Could not read .env");
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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const API_KEY = envVars.VITE_FIREBASE_API_KEY;
const SIGNUP_URL  = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

const TEST_USERS = [
  {
    email: "admin@gamecon2026.com",
    password: "Admin@GC2026",
    name: "GC26 Admin",
    role: "admin",
    committee: "technical",
    contact: "+63 912 345 6789",
  },
  {
    email: "head@gamecon2026.com",
    password: "Head@GC2026",
    name: "Esports Head",
    role: "committee-head",
    committee: "esports",
    contact: "+63 917 654 3210",
  },
  {
    email: "member@gamecon2026.com",
    password: "Member@GC2026",
    name: "Juan Dela Cruz",
    role: "member",
    committee: "proctors",
    contact: "+63 920 111 2222",
  },
];

async function createUser({ email, password, name, role, committee, contact }) {
  // 1. Ensure the Auth account exists
  const res = await fetch(SIGNUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await res.json();

  if (data.error) {
    if (data.error.message === "EMAIL_EXISTS") {
      console.log(`  ⚠️  ${email} already exists in Auth — will upsert Firestore profile…`);
    } else {
      throw new Error(`Auth error for ${email}: ${data.error.message}`);
    }
  } else {
    console.log(`  ➕  Created Auth account for ${email}`);
  }

  // 2. Sign in via the Firebase SDK so Firestore writes are authenticated
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  // 3. Upsert Firestore profile (merge preserves any existing fields)
  await setDoc(doc(db, "users", uid), {
    name,
    email,
    role,
    committee,
    contact,
    createdAt: serverTimestamp(),
  }, { merge: true });

  await signOut(auth);

  console.log(`  ✅  ${role.toUpperCase().padEnd(15)} ${email} (uid: ${uid})`);
  return uid;
}

async function main() {
  console.log("👤 Creating test user accounts…\n");

  for (const user of TEST_USERS) {
    await createUser(user);
  }

  console.log("\n🏁 Users created! Here are the login credentials:\n");
  console.log("┌─────────────────┬──────────────────────────┬────────────────┐");
  console.log("│ Role            │ Email                    │ Password       │");
  console.log("├─────────────────┼──────────────────────────┼────────────────┤");
  for (const u of TEST_USERS) {
    const role = u.role.padEnd(15);
    const email = u.email.padEnd(24);
    const pass = u.password.padEnd(14);
    console.log(`│ ${role} │ ${email} │ ${pass} │`);
  }
  console.log("└─────────────────┴──────────────────────────┴────────────────┘");

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed users failed:", err);
  process.exit(1);
});
