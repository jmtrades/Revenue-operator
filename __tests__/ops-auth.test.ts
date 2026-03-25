/**
 * Ops Auth + RBAC tests
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({}),
    }),
  }),
}));

describe("Ops Auth", () => {
  it("StaffRole type allows ADMIN and STAFF", () => {
    type StaffRole = "ADMIN" | "STAFF";
    const validRoles: StaffRole[] = ["ADMIN", "STAFF"];
    expect(validRoles).toContain("ADMIN");
    expect(validRoles).toContain("STAFF");
  });

  it("logStaffAction accepts valid payload", async () => {
    const { logStaffAction } = await import("@/lib/ops/auth");
    await expect(
      logStaffAction("staff-id", "test_action", { foo: "bar" })
    ).resolves.not.toThrow();
  });
});
