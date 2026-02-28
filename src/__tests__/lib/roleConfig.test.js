/**
 * Unit tests for src/lib/roleConfig.js
 */
import { describe, it, expect } from "vitest";
import {
  APP_ROLES,
  VALID_ROLES,
  COMMITTEE_MAP,
  COMMITTEE_NAMES,
  DAY_SLOTS,
} from "../../lib/roleConfig";

describe("APP_ROLES", () => {
  it("contains admin, proctor, viewer", () => {
    const values = APP_ROLES.map((r) => r.value);
    expect(values).toContain("admin");
    expect(values).toContain("proctor");
    expect(values).toContain("viewer");
  });

  it("each role has value, label, description", () => {
    for (const r of APP_ROLES) {
      expect(r).toHaveProperty("value");
      expect(r).toHaveProperty("label");
      expect(r).toHaveProperty("description");
    }
  });
});

describe("VALID_ROLES", () => {
  it("is derived from APP_ROLES values", () => {
    expect(VALID_ROLES).toEqual(APP_ROLES.map((r) => r.value));
  });
});

describe("COMMITTEE_MAP", () => {
  it("has at least 10 committees", () => {
    expect(Object.keys(COMMITTEE_MAP).length).toBeGreaterThanOrEqual(10);
  });

  it("each entry has headers (array) and days (array)", () => {
    for (const [name, config] of Object.entries(COMMITTEE_MAP)) {
      expect(Array.isArray(config.headers), `${name} .headers`).toBe(true);
      expect(config.headers.length).toBeGreaterThan(0);
      expect(Array.isArray(config.days), `${name} .days`).toBe(true);
      expect(config.days.length).toBeGreaterThan(0);
    }
  });

  it("includes canonical committee names", () => {
    const keys = Object.keys(COMMITTEE_MAP);
    expect(keys).toContain("Proctors");
    expect(keys).toContain("Marketing");
    expect(keys).toContain("Ticketing");
    expect(keys).toContain("Exhibitors");
  });
});

describe("COMMITTEE_NAMES", () => {
  it("is an array of all committee keys", () => {
    expect(Array.isArray(COMMITTEE_NAMES)).toBe(true);
    expect(COMMITTEE_NAMES).toEqual(Object.keys(COMMITTEE_MAP));
  });
});

describe("DAY_SLOTS", () => {
  it("contains DAY 1, DAY 2, DAY1/2", () => {
    expect(DAY_SLOTS).toContain("DAY 1");
    expect(DAY_SLOTS).toContain("DAY 2");
    expect(DAY_SLOTS).toContain("DAY1/2");
  });
});
