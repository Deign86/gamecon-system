import { useEffect, useState } from "react";
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

  useEffect(() => {
    const q = query(
      collection(db, path),
      orderBy(sortField, "desc"),
      limit(maxItems)
    );
    const unsub = onSnapshot(q, (snap) => {
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [path, sortField, maxItems]);

  async function add(data) {
    return addDoc(collection(db, path), {
      ...data,
      timestamp: serverTimestamp(),
    });
  }

  async function update(id, data) {
    return updateDoc(doc(db, path, id), data);
  }

  async function remove(id) {
    return deleteDoc(doc(db, path, id));
  }

  return { docs, loading, add, update, remove };
}
