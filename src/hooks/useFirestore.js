import { useEffect, useState, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Generic real-time Firestore collection hook.
 * @param {string} path        - collection path
 * @param {string} sortField   - field to order by (default: "timestamp")
 * @param {number} maxItems    - limit results (default: 100)
 */
export function useCollection(path, sortField = "timestamp", maxItems = 100) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setError(null);
    const q = query(
      collection(db, path),
      orderBy(sortField, "desc"),
      limit(maxItems)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        if (import.meta.env.DEV) console.error(`[useCollection] ${path}:`, err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [path, sortField, maxItems]);

  const add = useCallback(async (data) => {
    return addDoc(collection(db, path), {
      ...data,
      timestamp: serverTimestamp(),
    });
  }, [path]);

  const update = useCallback(async (id, data) => {
    return updateDoc(doc(db, path, id), data);
  }, [path]);

  const remove = useCallback(async (id) => {
    return deleteDoc(doc(db, path, id));
  }, [path]);

  return { docs, loading, error, add, update, remove };
}
