import { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // RC-1 fix: use a generation counter so rapid auth-state changes (token
    // refresh, quick sign-out → sign-in) cannot apply a stale profile fetch
    // on top of a newer one.  Each iteration of this effect gets its own
    // `gen` value; the async callback checks whether it still "owns" the
    // current generation before committing any state.
    let gen = 0;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      const myGen = ++gen;

      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, "users", fbUser.uid));
          if (myGen !== gen) return; // a newer auth event superseded us
          setUser(fbUser);
          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        } catch (err) {
          // Profile fetch failed (offline / permission error)
          // Set profile null so the app doesn't softlock on the loading screen
          if (import.meta.env.DEV) console.error("[useAuth] profile fetch failed:", err);
          if (myGen !== gen) return;
          setUser(fbUser);
          setProfile(null);
        }
      } else {
        if (myGen !== gen) return;
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, setProfile }),
    [user, profile, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

/** Sign in with email + password */
export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign out */
export async function signOut() {
  return fbSignOut(auth);
}
