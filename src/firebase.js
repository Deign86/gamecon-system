import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

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
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const functions = getFunctions(app);

/* ── App Check ──
 * Protects Firebase APIs from abuse by verifying requests come from
 * your genuine app (not a spoofed client or cURL call).
 *
 * Platform strategy:
 *   • Browser  → ReCaptchaEnterpriseProvider (invisible challenge)
 *   • Capacitor (Android WebView) / Tauri (WebView2)
 *                → Debug token registered in Firebase Console.
 *                  reCAPTCHA cannot run inside WebViews, so we set a
 *                  pre-registered debug token that the SDK exchanges
 *                  directly with the App Check backend.
 *
 * Env vars:
 *   VITE_RECAPTCHA_ENTERPRISE_KEY  — reCAPTCHA Enterprise site key (web)
 *   VITE_APPCHECK_DEBUG_TOKEN      — static debug token for native/Capacitor builds
 *                                    (register in Firebase Console → App Check → your Android app → Manage debug tokens)
 *
 * Note: Play Integrity requires a Play Store listing — for sideloaded APKs the
 * debug token provider is the correct production-ready attestation method.
 */
const isNativeApp =
  (typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.()) ||
  (typeof window !== "undefined" &&
    window.__TAURI_INTERNALS__ !== undefined);

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
const nativeDebugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;

if (isNativeApp && nativeDebugToken) {
  /* ─── Native (Capacitor / Tauri) with registered debug token ───
   * Play Integrity requires a Play Store listing and won't work for
   * sideloaded APKs. Instead we use a pre-registered debug token:
   * the SDK exchanges it with App Check servers and receives a real
   * App Check token, so all Firebase APIs see a verified client.
   *
   * The token UUID must be registered in Firebase Console:
   * App Check → your Android app → ⋮ → Manage debug tokens → Add token
   */
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = nativeDebugToken;
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaKey || "placeholder"),
      isTokenAutoRefreshEnabled: true,
    });
    console.info("[App Check] Initialized on native with registered debug token.");
  } catch (err) {
    console.error("[App Check] Native initialization failed:", err);
  }
} else if (isNativeApp) {
  /* ─── Native without debug token configured ───
   * No debug token in env — skip App Check to avoid 403 errors. */
  console.warn("[App Check] Skipped on native: VITE_APPCHECK_DEBUG_TOKEN not set.");
} else if (import.meta.env.DEV) {
  /* ─── Development ───
   * Skip App Check so unregistered debug-token exchanges don't
   * cause 403 errors that cascade into auth failures. */
  console.info("[App Check] Skipped in development.");
} else if (recaptchaKey) {
  /* ─── Production browser ───
   * ReCaptchaEnterpriseProvider runs an invisible challenge to
   * attest that requests come from a genuine browser client. */
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.info("[App Check] Initialized with reCAPTCHA Enterprise.");
  } catch (err) {
    console.error("[App Check] Initialization failed:", err);
  }
}

export default app;
