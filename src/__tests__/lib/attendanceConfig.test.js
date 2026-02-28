/**
 * Unit tests for src/lib/attendanceConfig.js
 */
import { describe, it, expect } from "vitest";
import {
  ATTENDANCE_STATUSES,
  STATUS_META,
  ATTENDANCE_SESSIONS,
  attendanceDocId,
} from "../../lib/attendanceConfig";

describe("ATTENDANCE_STATUSES", () => {
  it("contains the four statuses", () => {
    expect(ATTENDANCE_STATUSES).toEqual(["present", "late", "excused", "absent"]);
  });
});

describe("STATUS_META", () => {
  it("has metadata for every status", () => {
    for (const status of ATTENDANCE_STATUSES) {
      expect(STATUS_META).toHaveProperty(status);
      expect(STATUS_META[status]).toHaveProperty("label");
      expect(STATUS_META[status]).toHaveProperty("color");
      expect(STATUS_META[status]).toHaveProperty("short");
    }
  });

  it("short codes are single characters", () => {
    for (const status of ATTENDANCE_STATUSES) {
      expect(STATUS_META[status].short).toHaveLength(1);
    }
  });
});

describe("ATTENDANCE_SESSIONS", () => {
  it("has 4 sessions matching shift blocks", () => {
    expect(ATTENDANCE_SESSIONS).toHaveLength(4);
  });

  it("each session has required fields", () => {
    for (const s of ATTENDANCE_SESSIONS) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("label");
      expect(s).toHaveProperty("blockId");
      expect(s).toHaveProperty("date");
      expect(s).toHaveProperty("start");
      expect(s).toHaveProperty("end");
    }
  });

  it("blockId matches id", () => {
    for (const s of ATTENDANCE_SESSIONS) {
      expect(s.blockId).toBe(s.id);
    }
  });
});

describe("attendanceDocId()", () => {
  it("creates deterministic composite ID", () => {
    expect(attendanceDocId("d1-morning", "user123")).toBe("d1-morning_user123");
  });

  it("produces different IDs for different inputs", () => {
    const a = attendanceDocId("d1-morning", "userA");
    const b = attendanceDocId("d1-afternoon", "userA");
    expect(a).not.toBe(b);
  });
});
