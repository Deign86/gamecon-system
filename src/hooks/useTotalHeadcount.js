import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { error as logError } from "../lib/logger";

const COUNTER_REF = doc(db, "counters", "headcount");

// RC-7 fix: module-level guard so that when multiple instances of this hook
// are mounted simultaneously (e.g. fullscreen view + dashboard), only the
// first one fires the initialising setDoc when the document doesn't yet
// exist.  All subsequent instances see the document appear via onSnapshot
// and skip the write.
let _counterInitPending = false;

/**
 * Combined total headcount.
 *
 * Displayed count = sum of all zone currentCounts  +  standalone counter.
 *
 * - Zone counters update in real-time from the dashboard modal.
 * - The +/− buttons on the fullscreen view adjust the standalone counter
 *   (for ad-hoc headcount adjustments outside of zones).
 *
 * Staff floor: the zone totals represent staff currently onboard.
 * The standalone counter cannot go below 0, so the total count
 * can never drop below the zones total. `atStaffFloor` is true
 * when the count equals the zones total (extra === 0).
 */
export function useTotalHeadcount() {
  const [zonesTotal, setZonesTotal] = useState(0);
  const [extra, setExtra]           = useState(0);
  const [loadingZones, setLoadingZones]   = useState(true);
  const [loadingExtra, setLoadingExtra]   = useState(true);
  const extraRef  = useRef(0); // keep a ref for decrement guard
  const pendingRef = useRef(0); // net unconfirmed writes (negative = in-flight decrements)

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
          _counterInitPending = false; // document now confirmed present
        } else if (!_counterInitPending) {
          _counterInitPending = true;
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
  const loading      = loadingZones || loadingExtra;
  const atStaffFloor = zonesTotal > 0 && extra <= 0;

  const incrementCount = useCallback(async () => {
    await updateDoc(COUNTER_REF, {
      count: increment(1),
      lastUpdated: serverTimestamp(),
    });
  }, []);

  /**
   * Decrement the standalone counter.
   * Returns `"blocked"` if the extra counter is already 0
   * (i.e. count is at the staff/zones floor), or `"ok"` on success.
   *
   * `pendingRef` tracks in-flight decrements so rapid taps can't sneak
   * past the guard before Firestore's onSnapshot updates `extraRef`.
   */
  const decrementCount = useCallback(async () => {
    if (extraRef.current + pendingRef.current <= 0) return "blocked";
    pendingRef.current -= 1;
    try {
      await updateDoc(COUNTER_REF, {
        count: increment(-1),
        lastUpdated: serverTimestamp(),
      });
      return "ok";
    } catch (err) {
      logError("Decrement error:", err);
      return "blocked";
    } finally {
      // Restore the pending slot — the snapshot listener will reflect the
      // real server value, so we no longer need to reserve this slot.
      pendingRef.current += 1;
    }
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
    atStaffFloor,
    loading,
    incrementCount,
    decrementCount,
    resetCount,
  };
}
