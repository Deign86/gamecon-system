/**
 * useVenueStatus.js
 *
 * Real-time hook that computes per-zone status for the Venue Map.
 * Subscribes to three Firestore collections simultaneously:
 *   1. `zones`           → headcount (currentCount, peakCount)
 *   2. `incidents`       → open incidents per zoneId
 *   3. `committeeShifts` → staff on duty per committee (mapped to zones)
 *
 * Returns a status map:  Record<string, ZoneStatus>
 *   { currentCount, peakCount, incidentsOpen, incidents, staffOnDuty }
 */

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { VENUE_ZONES } from "../lib/venueZones";

/**
 * @param {"day1"|"day2"} day  – which day to show (determines shift blocks)
 * @returns {{ statuses: Record<string, object>, loading: boolean }}
 */
export function useVenueStatus(day = "day1") {
  const [headcounts, setHeadcounts] = useState({});
  const [openIncidents, setOpenIncidents] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loadingHC, setLoadingHC] = useState(true);
  const [loadingInc, setLoadingInc] = useState(true);
  const [loadingSh, setLoadingSh] = useState(true);

  /* ── 1. Subscribe to zone headcounts ── */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "zones"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setHeadcounts(map);
      setLoadingHC(false);
    });
    return unsub;
  }, []);

  /* ── 2. Subscribe to open incidents ── */
  useEffect(() => {
    const q = query(
      collection(db, "incidents"),
      where("status", "==", "open")
    );
    const unsub = onSnapshot(q, (snap) => {
      setOpenIncidents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingInc(false);
    });
    return unsub;
  }, []);

  /* ── 3. Subscribe to committee shifts for the selected day ── */
  useEffect(() => {
    const dayBlocks =
      day === "day1"
        ? ["d1-morning", "d1-afternoon"]
        : ["d2-morning", "d2-afternoon"];

    const q = query(
      collection(db, "committeeShifts"),
      where("dayBlock", "in", dayBlocks)
    );
    const unsub = onSnapshot(q, (snap) => {
      setShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingSh(false);
    });
    return unsub;
  }, [day]);

  /* ── Derived: compute per-zone statuses ── */
  const statuses = useMemo(() => {
    const map = {};

    // Build committee → total assignees for this day
    const committeeStaff = {};
    for (const shift of shifts) {
      const cid = shift.committeeId;
      if (!cid) continue;
      const count = Array.isArray(shift.assignees) ? shift.assignees.length : 0;
      committeeStaff[cid] = (committeeStaff[cid] || 0) + count;
    }

    // Build zoneId → incidents
    const incidentsByZone = {};
    for (const inc of openIncidents) {
      const zid = inc.zoneId;
      if (!zid) continue;
      if (!incidentsByZone[zid]) incidentsByZone[zid] = [];
      incidentsByZone[zid].push(inc);
    }

    for (const zone of VENUE_ZONES) {
      const hc = headcounts[zone.id];
      const zoneIncidents = incidentsByZone[zone.id] || [];
      const staff = zone.committee ? (committeeStaff[zone.committee] || 0) : 0;

      map[zone.id] = {
        currentCount: hc?.currentCount ?? 0,
        peakCount: hc?.peakCount ?? 0,
        incidentsOpen: zoneIncidents.length,
        incidents: zoneIncidents,
        staffOnDuty: staff,
        hasData: !!hc,
      };
    }

    return map;
  }, [headcounts, openIncidents, shifts]);

  const loading = loadingHC || loadingInc || loadingSh;

  return { statuses, loading };
}
