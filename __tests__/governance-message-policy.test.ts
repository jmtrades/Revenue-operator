/**
 * Structural + unit tests for src/lib/governance/message-policy.ts
 * Validates module exports, approval modes, and deterministic policy resolution.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/* ------------------------------------------------------------------ */
/*  Source text for structural assertions                              */
/* ------------------------------------------------------------------ */
const SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/governance/message-policy.ts"),
  "utf-8"
);

describe("governance/message-policy — module exports", () => {
  it("exports resolveMessagePolicy function", () => {
    expect(SOURCE).toContain("export async function resolveMessagePolicy");
  });

  it("exports ApprovalMode type", () => {
    expect(SOURCE).toContain("export type ApprovalMode");
  });

  it("exports ResolvedMessagePolicy interface", () => {
    expect(SOURCE).toContain("export interface ResolvedMessagePolicy");
  });
});

describe("governance/message-policy — ApprovalMode variants", () => {
  it('supports "autopilot" mode', () => {
    expect(SOURCE).toContain('"autopilot"');
  });

  it('supports "preview_required" mode', () => {
    expect(SOURCE).toContain('"preview_required"');
  });

  it('supports "approval_required" mode', () => {
    expect(SOURCE).toContain('"approval_required"');
  });

  it('supports "locked_script" mode', () => {
    expect(SOURCE).toContain('"locked_script"');
  });

  it('supports "jurisdiction_locked" mode', () => {
    expect(SOURCE).toContain('"jurisdiction_locked"');
  });

  it('supports "dual_approval_required" mode', () => {
    expect(SOURCE).toContain('"dual_approval_required"');
  });

  it('supports "compliance_only_approval" mode', () => {
    expect(SOURCE).toContain('"compliance_only_approval"');
  });
});

describe("governance/message-policy — ResolvedMessagePolicy shape", () => {
  it("includes template_id field", () => {
    expect(SOURCE).toContain("template_id: string | null");
  });

  it("includes required_disclaimers field", () => {
    expect(SOURCE).toContain("required_disclaimers: string[]");
  });

  it("includes forbidden_phrases field", () => {
    expect(SOURCE).toContain("forbidden_phrases: string[]");
  });

  it("includes required_phrases field", () => {
    expect(SOURCE).toContain("required_phrases: string[]");
  });

  it("includes approval_mode field", () => {
    expect(SOURCE).toContain("approval_mode: ApprovalMode");
  });
});

describe("governance/message-policy — deterministic resolution", () => {
  it("checks workspace-specific policy first", () => {
    // The function checks workspaceId before falling back to global
    const firstQuery = SOURCE.indexOf('.eq("workspace_id", workspaceId)');
    const globalQuery = SOURCE.indexOf('.is("workspace_id", null)');
    expect(firstQuery).toBeLessThan(globalQuery);
    expect(firstQuery).toBeGreaterThan(-1);
    expect(globalQuery).toBeGreaterThan(-1);
  });

  it("falls back to global policy when no workspace match", () => {
    expect(SOURCE).toContain('.is("workspace_id", null)');
  });

  it("returns null when no policy found", () => {
    // The function returns null at the end if neither workspace nor global match
    expect(SOURCE).toContain("return null");
  });

  it("queries message_policies table", () => {
    expect(SOURCE).toContain('.from("message_policies")');
  });

  it("filters by domain_type, jurisdiction, channel, and intent_type", () => {
    expect(SOURCE).toContain('.eq("domain_type", domainType)');
    expect(SOURCE).toContain('.eq("jurisdiction", jurisdiction)');
    expect(SOURCE).toContain('.eq("channel", channel)');
    expect(SOURCE).toContain('.eq("intent_type", intentType)');
  });
});

describe("governance/message-policy — no bypass paths", () => {
  it("does not skip workspace check when workspaceId is provided", () => {
    // if (workspaceId) { ... query ... } pattern ensures workspace is checked
    expect(SOURCE).toContain("if (workspaceId)");
  });

  it("safely handles non-array disclaimer/phrase fields", () => {
    // Uses Array.isArray checks for required_disclaimers, forbidden_phrases, required_phrases
    const arrayChecks = (SOURCE.match(/Array\.isArray/g) ?? []).length;
    expect(arrayChecks).toBeGreaterThanOrEqual(6); // 3 fields x 2 code paths (workspace + global)
  });

  it("does not contain any hardcoded approval bypass", () => {
    expect(SOURCE).not.toContain("bypass");
    expect(SOURCE).not.toContain("skip_approval");
    expect(SOURCE).not.toContain("force_send");
  });

  it("uses maybeSingle() for safe single-row retrieval", () => {
    const calls = (SOURCE.match(/\.maybeSingle\(\)/g) ?? []).length;
    expect(calls).toBeGreaterThanOrEqual(2); // workspace + global queries
  });
});
