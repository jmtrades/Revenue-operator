/**
 * Phase IV — Enterprise: dual approval chain support.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Enterprise dual approval chain", () => {
  it("message-policy or governance supports dual_approval_required", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toMatch(/dual_approval|approval_mode/);
  });

  it("feature-gate or tier includes dual approval for team/enterprise", () => {
    const gate = readFileSync(path.join(ROOT, "src/lib/feature-gate/types.ts"), "utf-8");
    expect(gate).toMatch(/dual_approval|team|enterprise/);
  });
});
