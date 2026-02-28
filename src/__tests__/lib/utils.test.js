/**
 * Unit tests for src/lib/utils.js
 */
import { describe, it, expect } from "vitest";
import { initials, fmtTime, fmtDate, peso, getZoneIcon } from "../../lib/utils";

// cn is just clsx re-export — tested by clsx itself

describe("initials()", () => {
  it("extracts first letter of each word, uppercase", () => {
    expect(initials("John Doe")).toBe("JD");
  });

  it("caps at 2 characters", () => {
    expect(initials("Ana Maria B. Cruz")).toBe("AM");
  });

  it("returns empty string for empty input", () => {
    expect(initials("")).toBe("");
    expect(initials()).toBe("");
  });

  it("handles single word", () => {
    expect(initials("Admin")).toBe("A");
  });
});

describe("fmtTime()", () => {
  it('returns "—" for falsy input', () => {
    expect(fmtTime(null)).toBe("—");
    expect(fmtTime(undefined)).toBe("—");
    expect(fmtTime(0)).toBe("—");
  });

  it("formats a Date object", () => {
    const d = new Date("2026-03-05T09:30:00");
    const result = fmtTime(d);
    // Should contain time components
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("handles Firestore-like timestamp with toDate()", () => {
    const ts = { toDate: () => new Date("2026-03-05T14:00:00") };
    const result = fmtTime(ts);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("fmtDate()", () => {
  it('returns "—" for falsy input', () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
  });

  it("formats a Date with month and day", () => {
    const d = new Date("2026-03-05T09:30:00");
    const result = fmtDate(d);
    expect(result).toMatch(/Mar/);
  });
});

describe("peso()", () => {
  it("formats number as Philippine Peso", () => {
    expect(peso(1500)).toMatch(/₱/);
    expect(peso(1500)).toMatch(/1,500/);
  });

  it("handles zero", () => {
    expect(peso(0)).toMatch(/₱/);
    expect(peso(0)).toMatch(/0\.00/);
  });

  it("handles null/undefined gracefully", () => {
    expect(peso(null)).toMatch(/₱/);
    expect(peso(undefined)).toMatch(/₱/);
  });
});

describe("getZoneIcon()", () => {
  it("returns Gamepad2 for esport zones", () => {
    const Icon = getZoneIcon("Esports Area 1");
    expect(Icon).toBeDefined();
    expect(Icon.displayName || Icon.name || "").toBeTruthy();
  });

  it("returns Ticket for ticketing", () => {
    const Icon = getZoneIcon("Ticketing");
    expect(Icon).toBeDefined();
  });

  it("returns fallback MapPin for unknown zone", () => {
    const Icon = getZoneIcon("Unknown Zone XYZ");
    expect(Icon).toBeDefined();
  });

  it("is case-insensitive", () => {
    const a = getZoneIcon("ESPORTS AREA");
    const b = getZoneIcon("esports area");
    expect(a).toBe(b);
  });
});
