import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

/**
 * Detect native platform context early — without importing from messaging.js
 * (which would create a circular dependency).
 *
 * persistentMultipleTabManager uses SharedWorker / BroadcastChannel to
 * co-ordinate across browser tabs. In Capacitor (Android WebView) and Tauri
 * (single BrowserView window) there is exactly ONE renderer; adding the
 * multi-tab machinery introduces unnecessary locking and can cause init
 * failures on older WebView versions that have partial SharedWorker support.
 * persistentSingleTabManager is lighter, simpler, and correct for these targets.
 */
const _isCapacitor =
  typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
const _isTauri =
  typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

if (import.meta.env.DEV) {
  const missing = requiredEnvVars.filter((k) => !import.meta.env[k]);
  if (missing.length > 0) {
    console.warn(
      `[firebase] Missing env vars: ${missing.join(', ')}. ` +
      `Copy .env.example to .env and fill in your Firebase config.`
    );
  }
}

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth      = getAuth(app);

/**
 * Firestore with persistent local cache enabled.
 * This allows reads from cache when offline and automatically queues
 * direct Firestore writes (addDoc, setDoc, updateDoc) until connectivity
 * is restored — crucial for weak-signal environments like COED Hall.
 *
 * Tab manager selection:
 *   • Web (browser)         → persistentMultipleTabManager  — handles multiple tabs
 *   • Capacitor (Android)   → persistentSingleTabManager    — single-WebView; avoids
 *   • Tauri (desktop .exe)    SharedWorker locking issues on some WebView versions
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager:
      _isCapacitor || _isTauri
        ? persistentSingleTabManager(null)
        : persistentMultipleTabManager(),
  }),
});

export const functions = getFunctions(app);

export default app;
