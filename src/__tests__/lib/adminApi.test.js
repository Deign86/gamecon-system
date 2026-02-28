/**
 * Tests for src/lib/adminApi.js
 *
 * Verifies that admin API wrappers correctly call Cloud Functions
 * and handle network errors appropriately.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { httpsCallable } from "firebase/functions";

// Mock the offline queue
vi.mock("../../lib/offlineQueue", () => ({
  enqueue: vi.fn(),
}));

import {
  createUserAccount,
  updateUserRoleAndCommittee,
  setUserActiveStatus,
  deleteUser,
  sendPasswordReset,
  callResetSystemData,
} from "../../lib/adminApi";
import { enqueue } from "../../lib/offlineQueue";

describe("adminApi", () => {
  let mockCallable;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallable = vi.fn();
    httpsCallable.mockReturnValue(mockCallable);
  });

  describe("createUserAccount()", () => {
    it("returns uid and password on success", async () => {
      mockCallable.mockResolvedValueOnce({
        data: { uid: "abc123", password: "gen-pass" },
      });

      const result = await createUserAccount("John", "john@test.com", "Proctors");
      expect(result).toEqual({ uid: "abc123", password: "gen-pass" });
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), "createUserAccount");
    });

    it("throws on network error (not queuable)", async () => {
      mockCallable.mockRejectedValueOnce({ code: "functions/unavailable" });

      await expect(createUserAccount("John", "john@test.com")).rejects.toThrow(/offline/i);
      // Should NOT enqueue
      expect(enqueue).not.toHaveBeenCalled();
    });
  });

  describe("updateUserRoleAndCommittee()", () => {
    it("calls Cloud Function with correct payload", async () => {
      mockCallable.mockResolvedValueOnce({ data: { success: true } });

      await updateUserRoleAndCommittee("uid1", { role: "admin" });
      expect(mockCallable).toHaveBeenCalledWith({ uid: "uid1", role: "admin" });
    });

    it("enqueues on network error", async () => {
      mockCallable.mockRejectedValueOnce({ code: "functions/unavailable" });

      await updateUserRoleAndCommittee("uid1", { role: "proctor" });
      expect(enqueue).toHaveBeenCalledWith(
        "updateUserRoleAndCommittee",
        expect.objectContaining({ uid: "uid1", role: "proctor" }),
        expect.any(String)
      );
    });
  });

  describe("setUserActiveStatus()", () => {
    it("calls Cloud Function", async () => {
      mockCallable.mockResolvedValueOnce({ data: { success: true } });

      await setUserActiveStatus("uid1", true);
      expect(mockCallable).toHaveBeenCalledWith({ uid: "uid1", active: true });
    });

    it("enqueues on network error", async () => {
      mockCallable.mockRejectedValueOnce({ code: "functions/unavailable" });

      await setUserActiveStatus("uid1", false);
      expect(enqueue).toHaveBeenCalled();
    });
  });

  describe("deleteUser()", () => {
    it("calls Cloud Function", async () => {
      mockCallable.mockResolvedValueOnce({ data: { success: true } });

      await deleteUser("uid1");
      expect(mockCallable).toHaveBeenCalledWith({ uid: "uid1" });
    });

    it("throws on network error (not queuable)", async () => {
      mockCallable.mockRejectedValueOnce({ code: "functions/unavailable" });

      await expect(deleteUser("uid1")).rejects.toThrow(/offline/i);
      expect(enqueue).not.toHaveBeenCalled();
    });
  });

  describe("callResetSystemData()", () => {
    it("returns total count on success", async () => {
      mockCallable.mockResolvedValueOnce({ data: { total: 42 } });

      const result = await callResetSystemData();
      expect(result).toEqual({ total: 42 });
    });

    it("throws on network error (not queuable)", async () => {
      mockCallable.mockRejectedValueOnce({ code: "functions/unavailable" });

      await expect(callResetSystemData()).rejects.toThrow(/offline/i);
    });
  });
});
