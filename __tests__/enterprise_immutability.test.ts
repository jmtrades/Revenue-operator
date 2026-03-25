import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Enterprise immutability enforcement", () => {
  it("has enterprise immutability config helper wired to billing tier and features", () => {
    const helper = readFileSync(path.join(ROOT, "src/lib/enterprise/immutability.ts"), "utf-8");
    expect(helper).toMatch(/billing_tier/);
    expect(helper).toMatch(/enterprise_features_json/);
    expect(helper).toMatch(/immutabilityLock/);
  });

  it("activation uses enterprise_configuration_incomplete fail-fast reason", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/activate/execution/route.ts"), "utf-8");
    expect(route).toMatch(/enterprise_configuration_incomplete/);
  });

  it("approvals approve route contains dual approval chain and pending_second_approval flag", () => {
    const approve = readFileSync(path.join(ROOT, "src/app/api/enterprise/approvals/approve/route.ts"), "utf-8");
    expect(approve).toMatch(/dualApprovalEnabled/);
    expect(approve).toMatch(/pending_second_approval/);
    expect(approve).toMatch(/message_approval_decisions/);
    expect(approve).toMatch(/dedupeKey: `approval-approved/);
  });

  it("approvals reject route records compliance lock into message_approval_locks", () => {
    const reject = readFileSync(path.join(ROOT, "src/app/api/enterprise/approvals/reject/route.ts"), "utf-8");
    expect(reject).toMatch(/message_approval_locks/);
    expect(reject).toMatch(/compliance_lock/);
  });

  it("audit export uses ORDER BY and LIMIT and is ascending on recorded_at", () => {
    const exportRoute = readFileSync(path.join(ROOT, "src/app/api/enterprise/audit/export/route.ts"), "utf-8");
    expect(exportRoute.includes('.order("created_at", { ascending: true })')).toBe(true);
    expect(exportRoute.includes('.order("recorded_at", { ascending: true })')).toBe(true);
    expect(exportRoute.includes(".limit(LIMIT)")).toBe(true);
  });

  it("jurisdiction UNSPECIFIED path exists in domain context resolution for safety", () => {
    const domain = readFileSync(path.join(ROOT, "src/lib/domain-packs/resolve.ts"), "utf-8");
    expect(domain).toMatch(/jurisdiction: \"UNSPECIFIED\"/);
  });
});

