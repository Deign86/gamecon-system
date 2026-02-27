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
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } else {
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
