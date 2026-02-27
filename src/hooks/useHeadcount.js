import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Real-time listener for all zones.
 * Returns { zones, incrementZone, decrementZone, loading }
 */
export function useHeadcount() {
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "zones"), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((z) => z.id !== "entrance-exit"); // removed from event layout
      // Sort by display order
      data.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      setZones(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function incrementZone(zoneId, userId) {
    const ref = doc(db, "zones", zoneId);
    await updateDoc(ref, {
      currentCount: increment(1),
      lastUpdated: serverTimestamp(),
    });
    // Log the headcount change
    await addDoc(collection(db, "headcounts"), {
      zoneId,
      change: 1,
      updatedBy: userId || "unknown",
      timestamp: serverTimestamp(),
    });
  }

  async function decrementZone(zoneId, userId) {
    const zone = zones.find((z) => z.id === zoneId);
    if (zone && zone.currentCount <= 0) return;
    const ref = doc(db, "zones", zoneId);
    await updateDoc(ref, {
      currentCount: increment(-1),
      lastUpdated: serverTimestamp(),
    });
    await addDoc(collection(db, "headcounts"), {
      zoneId,
      change: -1,
      updatedBy: userId || "unknown",
      timestamp: serverTimestamp(),
    });
  }

  return { zones, incrementZone, decrementZone, loading };
}
