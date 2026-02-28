/**
 * Unit tests for Cloud Functions (functions/index.js) — pure logic tests.
 *
 * These tests cover the server-side shift limits config and
 * committee name normalisation logic without requiring a live
 * Firebase environment.
 */
import { describe, it, expect } from "vitest";

// Test the shared shiftLimitsConfig (CJS module — require it)
const { getShiftLimits, limitKeyForCommittee } = require("../../../functions/shiftLimitsConfig");

describe("shiftLimitsConfig", () => {
  describe("limitKeyForCommittee()", () => {
    it('maps "ticketing" to combined key', () => {
      expect(limitKeyForCommittee("ticketing")).toBe("ticketing_voting");
    });

    it('maps "voting" to combined key', () => {
      expect(limitKeyForCommittee("voting")).toBe("ticketing_voting");
    });

    it("returns committee ID unchanged for other committees", () => {
      expect(limitKeyForCommittee("proctors")).toBe("proctors");
      expect(limitKeyForCommittee("exhibitors")).toBe("exhibitors");
      expect(limitKeyForCommittee("crowd-control")).toBe("crowd-control");
    });
  });

  describe("getShiftLimits()", () => {
    it("returns limits for known committees", () => {
      const result = getShiftLimits("exhibitors");
      expect(result).toEqual({ min: 1, max: 1 });
    });

    it("returns combined limits for ticketing/voting", () => {
      const t = getShiftLimits("ticketing");
      const v = getShiftLimits("voting");
      expect(t).toEqual(v);
      expect(t).toEqual({ min: 3, max: 4 });
    });

    it("returns crowd-control limits", () => {
      const result = getShiftLimits("crowd-control");
      expect(result).toEqual({ min: 12, max: 24 });
    });

    it("returns undefined for unknown committees", () => {
      expect(getShiftLimits("unknown-committee")).toBeUndefined();
    });

    it("returns day-block override when available", () => {
      const result = getShiftLimits("awards-prizes", "d2-morning");
      expect(result).toEqual({ min: 2, max: 4 });
    });

    it("falls back to default when no day-block override", () => {
      const result = getShiftLimits("awards-prizes", "d1-morning");
      expect(result).toEqual({ min: 0, max: 4 });
    });
  });
});
