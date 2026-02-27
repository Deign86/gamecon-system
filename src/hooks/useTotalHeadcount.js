import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { error as logError } from "../lib/logger";

const COUNTER_REF = doc(db, "counters", "headcount");

/**
 * Combined total headcount.
 *
 * Displayed count = sum of all zone currentCounts  +  standalone counter.
 *
 * - Zone counters update in real-time from the dashboard modal.
 * - The +/− buttons on the fullscreen view adjust the standalone counter
 *   (for ad-hoc headcount adjustments outside of zones).
 *
 * Staff floor: listens to active users in Firestore to determine the
 * minimum headcount (staff are always present). Decrementing below the
 * staff floor is blocked and surfaces `atStaffFloor = true`.
 */
export function useTotalHeadcount() {
  const [zonesTotal, setZonesTotal] = useState(0);
  const [extra, setExtra]           = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [loadingZones, setLoadingZones]   = useState(true);
  const [loadingExtra, setLoadingExtra]   = useState(true);
  const [loadingStaff, setLoadingStaff]   = useState(true);
  const extraRef = useRef(0); // keep a ref for decrement guard

  /* ── Listen to active staff count ── */
  useEffect(() => {
    const q = query(collection(db, "users"), where("active", "==", true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStaffCount(snap.size);
        setLoadingStaff(false);
      },
      (err) => {
        logError("Staff count listener error:", err);
        setLoadingStaff(false);
      }
    );
    return unsub;
  }, []);

  /* ── Listen to zones collection (same source as dashboard) ── */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "zones"),
      (snap) => {
        const total = snap.docs.reduce((sum, d) => {
          if (d.id === "entrance-exit") return sum; // filtered out
          return sum + (d.data().currentCount || 0);
        }, 0);
        setZonesTotal(total);
        setLoadingZones(false);
      },
      (err) => {
        logError("Zones listener error:", err);
        setLoadingZones(false);
      }
    );
    return unsub;
  }, []);

  /* ── Listen to standalone counter (for +/− on fullscreen) ── */
  useEffect(() => {
    const unsub = onSnapshot(
      COUNTER_REF,
      (snap) => {
        if (snap.exists()) {
          const val = snap.data().count ?? 0;
          setExtra(val);
          extraRef.current = val;
        } else {
          setDoc(COUNTER_REF, { count: 0, lastUpdated: serverTimestamp() });
        }
        setLoadingExtra(false);
      },
      (err) => {
        logError("Counter listener error:", err);
        setLoadingExtra(false);
      }
    );
    return unsub;
  }, []);

  const count        = zonesTotal + extra;
  const loading      = loadingZones || loadingExtra || loadingStaff;
  const atStaffFloor = count > 0 && count <= staffCount;

  const incrementCount = useCallback(async () => {
    await updateDoc(COUNTER_REF, {
      count: increment(1),
      lastUpdated: serverTimestamp(),
    });
  }, []);

  /**
   * Decrement the standalone counter.
   * Returns `"staff-floor"` if the total would drop below the staff count,
   * `"blocked"` if the extra counter is already 0, or `"ok"` on success.
   */
  const staffRef = useRef(0);
  const zonesTotalRef = useRef(0);
  useEffect(() => { staffRef.current = staffCount; }, [staffCount]);
  useEffect(() => { zonesTotalRef.current = zonesTotal; }, [zonesTotal]);

  const decrementCount = useCallback(async () => {
    if (extraRef.current <= 0) return "blocked";
    const afterCount = zonesTotalRef.current + extraRef.current - 1;
    if (afterCount < staffRef.current && afterCount >= 0) return "staff-floor";
    await updateDoc(COUNTER_REF, {
      count: increment(-1),
      lastUpdated: serverTimestamp(),
    });
    return "ok";
  }, []);

  async function resetCount() {
    await updateDoc(COUNTER_REF, {
      count: 0,
      lastUpdated: serverTimestamp(),
    });
  }

  return {
    count,
    zonesTotal,
    extra,
    staffCount,
    atStaffFloor,
    loading,
    incrementCount,
    decrementCount,
    resetCount,
  };
}
