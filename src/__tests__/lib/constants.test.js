/**
 * Unit tests for src/lib/constants.js
 */
import { describe, it, expect } from "vitest";
import {
  ZONES,
  COMMITTEES,
  ROLE_COMMITTEES,
  SHIFT_BLOCKS,
} from "../../lib/constants";

describe("ZONES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(ZONES)).toBe(true);
    expect(ZONES.length).toBeGreaterThan(0);
  });

  it("each zone has id, name, order", () => {
    for (const z of ZONES) {
      expect(z).toHaveProperty("id");
      expect(z).toHaveProperty("name");
      expect(z).toHaveProperty("order");
      expect(typeof z.id).toBe("string");
      expect(typeof z.name).toBe("string");
      expect(typeof z.order).toBe("number");
    }
  });

  it("zone IDs are unique", () => {
    const ids = ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("COMMITTEES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(COMMITTEES)).toBe(true);
    expect(COMMITTEES.length).toBeGreaterThan(5);
  });

  it("each committee has id, name, color", () => {
    for (const c of COMMITTEES) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("color");
      expect(c.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("committee IDs are unique", () => {
    const ids = COMMITTEES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ROLE_COMMITTEES", () => {
  it("excludes crowd-control", () => {
    const ids = ROLE_COMMITTEES.map((c) => c.id);
    expect(ids).not.toContain("crowd-control");
  });

  it("is a subset of COMMITTEES", () => {
    const allIds = new Set(COMMITTEES.map((c) => c.id));
    for (const rc of ROLE_COMMITTEES) {
      expect(allIds.has(rc.id)).toBe(true);
    }
  });
});

describe("SHIFT_BLOCKS", () => {
  it("has 4 shift blocks", () => {
    expect(SHIFT_BLOCKS).toHaveLength(4);
  });

  it("each block has required fields", () => {
    for (const b of SHIFT_BLOCKS) {
      expect(b).toHaveProperty("id");
      expect(b).toHaveProperty("label");
      expect(b).toHaveProperty("date");
      expect(b).toHaveProperty("start");
      expect(b).toHaveProperty("end");
    }
  });

  it("block IDs match expected pattern", () => {
    const ids = SHIFT_BLOCKS.map((b) => b.id);
    expect(ids).toContain("d1-morning");
    expect(ids).toContain("d1-afternoon");
    expect(ids).toContain("d2-morning");
    expect(ids).toContain("d2-afternoon");
  });
});
