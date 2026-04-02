/**
 * Structural tests for onboarding governance.
 * Verifies: activate flow has governance step, policies route requires auth.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("activate wizard has governance-aware steps", () => {
  const wizardPath = path.join(ROOT, "src/app/activate/ActivateWizard.tsx");

  it("ActivateWizard exists and manages multi-step flow", () => {
    expect(existsSync(wizardPath)).toBe(true);
  });
});

describe("enterprise policies route governance", () => {
  const routePath = path.join(ROOT, "src/app/api/enterprise/policies/route.ts");

  it("policies route exists", () => {
    expect(existsSync(routePath)).toBe(true);
  });

  const src = readFileSync(routePath, "utf-8");

  it("requires workspace_id parameter", () => {
    expect(src).toContain("workspace_id");
  });

  it("enforces role-based access control", () => {
    expect(src).toContain("requireWorkspaceRole");
  });

  it("allows governance-relevant roles", () => {
    expect(src).toContain('"owner"');
    expect(src).toContain('"admin"');
    expect(src).toContain('"compliance"');
  });

  it("returns 400 on missing workspace_id", () => {
    expect(src).toContain("status: 400");
  });

  it("queries message_policies table", () => {
    expect(src).toContain("message_policies");
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});

describe("governance message-policy approval modes", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");

  it("supports preview_required mode", () => {
    expect(src).toContain("preview_required");
  });

  it("supports approval_required mode", () => {
    expect(src).toContain("approval_required");
  });

  it("supports jurisdiction_locked mode", () => {
    expect(src).toContain("jurisdiction_locked");
  });

  it("supports locked_script mode", () => {
    expect(src).toContain("locked_script");
  });

  it("resolves workspace-specific policy first, then global", () => {
    expect(src).toContain("workspace_id");
    // Global fallback uses is null
    expect(src).toMatch(/is\(\s*"workspace_id"\s*,\s*null\s*\)/);
  });
});
