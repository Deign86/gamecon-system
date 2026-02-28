/**
 * Integration test: firebase.js module structure.
 *
 * Validates that the Firebase module exports the expected shape.
 */
import { describe, it, expect } from "vitest";
import app, { auth, db, functions } from "../../firebase";

describe("firebase.js exports", () => {
  it("exports default app object", () => {
    expect(app).toBeDefined();
  });

  it("exports auth instance", () => {
    expect(auth).toBeDefined();
  });

  it("exports db (Firestore) instance", () => {
    expect(db).toBeDefined();
  });

  it("exports functions instance", () => {
    expect(functions).toBeDefined();
  });
});
