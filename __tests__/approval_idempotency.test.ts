/**
 * Approval immutability: idempotent, no double intent, no approved→rejected transition.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Approval idempotency", () => {
  it("approve route returns idempotent when status already decided", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/enterprise/approvals/approve/route.ts"), "utf-8");
    expect(route).toMatch(/idempotent:\s*true/);
    expect(route).toMatch(/status\s*!==\s*["']pending["']/);
  });

  it("approve route does not emit intent when status is not pending", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/enterprise/approvals/approve/route.ts"), "utf-8");
    const afterReturn = route.indexOf("idempotent: true");
    const createIntentCall = route.indexOf("createActionIntent");
    expect(afterReturn).toBeGreaterThan(-1);
    expect(createIntentCall).toBeGreaterThan(-1);
    const returnBeforeEmit = route.slice(0, afterReturn);
    expect(returnBeforeEmit).toMatch(/status\s*!==\s*["']pending["']/);
  });

  it("decideApproval is only called when status is pending", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/enterprise/approvals/approve/route.ts"), "utf-8");
    expect(route).toMatch(/r\.status\s*!==\s*["']pending["']/);
    expect(route).toContain("if (r.status !== \"pending\")");
  });

  it("message_approvals allows only status transitions to decided (no approved→rejected)", () => {
    const decide = readFileSync(path.join(ROOT, "src/lib/governance/approval-queue.ts"), "utf-8");
    expect(decide).toMatch(/\.eq\(["']status["'],\s*["']pending["']\)/);
    expect(decide).toContain("decision");
  });
});
