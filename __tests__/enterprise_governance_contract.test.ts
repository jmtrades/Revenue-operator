/**
 * Enterprise governance contract (V): Jurisdiction lock, dual approval, compliance officer, audit export.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Enterprise approval modes", () => {
  it("message-policy supports jurisdiction_locked and dual_approval_required", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("jurisdiction_locked");
    expect(policy).toContain("dual_approval_required");
  });

  it("message-policy exports ApprovalMode type", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("export type ApprovalMode");
  });

  it("message-policy exports resolveMessagePolicy function", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("export async function resolveMessagePolicy");
  });

  it("approval modes include compliance_only_approval", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("compliance_only_approval");
  });

  it("feature-gate types include dual_approval for scale and enterprise tiers", () => {
    const types = readFileSync(path.join(ROOT, "src/lib/feature-gate/types.ts"), "utf-8");
    expect(types).toContain("dual_approval");
    // Scale and enterprise have dual_approval: true
    expect(types).toContain("dual_approval: true");
  });

  it("solo tier does not have dual_approval", () => {
    const types = readFileSync(path.join(ROOT, "src/lib/feature-gate/types.ts"), "utf-8");
    // Solo section should have dual_approval: false
    expect(types).toContain("dual_approval: false");
  });
});

describe("Audit and export", () => {
  const auditRoutePath = path.join(ROOT, "src/app/api/enterprise/audit/route.ts");

  it("enterprise audit route exists", () => {
    expect(existsSync(auditRoutePath)).toBe(true);
  });

  it("audit route requires workspace_id", () => {
    const audit = readFileSync(auditRoutePath, "utf-8");
    expect(audit).toContain("workspace_id");
  });

  it("audit route enforces role-based access", () => {
    const audit = readFileSync(auditRoutePath, "utf-8");
    expect(audit).toContain("requireWorkspaceRole");
  });

  it("audit route allows auditor and compliance roles", () => {
    const audit = readFileSync(auditRoutePath, "utf-8");
    expect(audit).toContain('"auditor"');
    expect(audit).toContain('"compliance"');
  });

  it("audit route queries audit_log table", () => {
    const audit = readFileSync(auditRoutePath, "utf-8");
    expect(audit).toContain("audit_log");
  });

  it("audit route limits results", () => {
    const audit = readFileSync(auditRoutePath, "utf-8");
    expect(audit).toContain(".limit(");
  });
});

describe("Governance module index", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/governance/index.ts"), "utf-8");

  it("re-exports resolveMessagePolicy", () => {
    expect(src).toContain("resolveMessagePolicy");
  });

  it("re-exports resolveCompliancePack", () => {
    expect(src).toContain("resolveCompliancePack");
  });

  it("re-exports approval queue functions", () => {
    expect(src).toContain("createMessageApproval");
    expect(src).toContain("getPendingApprovals");
    expect(src).toContain("decideApproval");
  });
});
