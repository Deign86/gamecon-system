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
  CustomProvider,
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
 *   VITE_APPCHECK_DEBUG_TOKEN      — static debug token for native builds
 *                                    (register in Firebase Console → App Check → Manage debug tokens)
 */
const isNativeApp =
  (typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.()) ||
  (typeof window !== "undefined" &&
    window.__TAURI_INTERNALS__ !== undefined);

const recaptchaKey    = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
const nativeDebugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;

if (isNativeApp) {
  /* ─── Native (Capacitor / Tauri) ───
   * reCAPTCHA Enterprise cannot execute inside Android System WebView or
   * Edge WebView2.  Instead we use a static debug token that has been
   * pre-registered in the Firebase Console.
   *
   * When FIREBASE_APPCHECK_DEBUG_TOKEN is set the SDK completely bypasses
   * the provider you pass and exchanges the debug token directly — so the
   * CustomProvider stub below is never actually called. */
  const token = nativeDebugToken || (import.meta.env.DEV && true);
  if (token) {
    // eslint-disable-next-line no-restricted-globals
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = token;
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: () =>
          Promise.resolve({ token: "N/A", expireTimeMillis: 0 }),
      }),
      isTokenAutoRefreshEnabled: true,
    });
  }
} else if (recaptchaKey) {
  /* ─── Standard browser ─── */
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-restricted-globals
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export default app;
