import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyCfCyaOceUawkDXeaI0QD8Xz5-wtmWvCBs",
  authDomain: "gamecon-2026-ops.firebaseapp.com",
  projectId: "gamecon-2026-ops",
  storageBucket: "gamecon-2026-ops.firebasestorage.app",
  messagingSenderId: "834830321959",
  appId: "1:834830321959:web:06ab7a5b6ee7cc70060102",
};

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
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

export default app;
