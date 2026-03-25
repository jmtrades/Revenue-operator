/**
 * Phase 1 governance: message policy resolution, compliance pack, approval queue, compiler decisions.
 * Deterministic resolution; no freeform; disclaimers and forbidden phrases enforced.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Governance Phase 1", () => {
  describe("message_policies table and resolver", () => {
    it("migration defines message_policies with approval_mode and disclaimers", () => {
      const content = readFileSync(
        path.join(ROOT, "supabase", "migrations", "message_policies_compliance_approvals.sql"),
        "utf-8"
      );
      expect(content).toContain("message_policies");
      expect(content).toContain("approval_mode");
      expect(content).toContain("required_disclaimers");
      expect(content).toContain("forbidden_phrases");
      expect(content).toContain("autopilot");
      expect(content).toContain("preview_required");
      expect(content).toContain("approval_required");
      expect(content).toContain("locked_script");
    });

    it("message-policy resolver exports resolveMessagePolicy and ApprovalMode", () => {
      const content = readFileSync(path.join(ROOT, "src", "lib", "governance", "message-policy.ts"), "utf-8");
      expect(content).toContain("resolveMessagePolicy");
      expect(content).toContain("ResolvedMessagePolicy");
      expect(content).toContain("ApprovalMode");
    });
  });

  describe("compliance_packs and resolver", () => {
    it("migration defines compliance_packs with rules_json", () => {
      const content = readFileSync(
        path.join(ROOT, "supabase", "migrations", "message_policies_compliance_approvals.sql"),
        "utf-8"
      );
      expect(content).toContain("compliance_packs");
      expect(content).toContain("industry_type");
      expect(content).toContain("rules_json");
    });

    it("compliance-pack resolver returns disclaimers and forbidden_claims", () => {
      const content = readFileSync(path.join(ROOT, "src", "lib", "governance", "compliance-pack.ts"), "utf-8");
      expect(content).toContain("resolveCompliancePack");
      expect(content).toContain("disclaimers");
      expect(content).toContain("forbidden_claims");
    });
  });

  describe("message_approvals queue", () => {
    it("migration defines message_approvals with status pending|approved|rejected|expired", () => {
      const content = readFileSync(
        path.join(ROOT, "supabase", "migrations", "message_policies_compliance_approvals.sql"),
        "utf-8"
      );
      expect(content).toContain("message_approvals");
      expect(content).toContain("proposed_message");
      expect(content).toContain("pending");
      expect(content).toContain("approved");
      expect(content).toContain("rejected");
    });

    it("approval-queue lib has createMessageApproval, getPendingApprovals, decideApproval", () => {
      const content = readFileSync(path.join(ROOT, "src", "lib", "governance", "approval-queue.ts"), "utf-8");
      expect(content).toContain("createMessageApproval");
      expect(content).toContain("getPendingApprovals");
      expect(content).toContain("decideApproval");
    });
  });

  describe("compiler wires policy and approval modes", () => {
    it("compiler imports resolveMessagePolicy and createMessageApproval", () => {
      const content = readFileSync(path.join(ROOT, "src", "lib", "speech-governance", "compiler.ts"), "utf-8");
      expect(content).toContain("resolveMessagePolicy");
      expect(content).toContain("resolveCompliancePack");
      expect(content).toContain("createMessageApproval");
    });

    it("compiler output includes approval_required and preview_required decisions", () => {
      const content = readFileSync(path.join(ROOT, "src", "lib", "speech-governance", "compiler.ts"), "utf-8");
      expect(content).toContain("approval_required");
      expect(content).toContain("preview_required");
      expect(content).toContain("approval_id");
    });
  });

  describe("enterprise approvals API", () => {
    it("GET approvals route exists and uses getPendingApprovals", () => {
      const content = readFileSync(
        path.join(ROOT, "src", "app", "api", "enterprise", "approvals", "route.ts"),
        "utf-8"
      );
      expect(content).toContain("getPendingApprovals");
      expect(content).toContain("workspace_id");
    });

    it("approve and reject routes use decideApproval", () => {
      const approve = readFileSync(
        path.join(ROOT, "src", "app", "api", "enterprise", "approvals", "approve", "route.ts"),
        "utf-8"
      );
      const reject = readFileSync(
        path.join(ROOT, "src", "app", "api", "enterprise", "approvals", "reject", "route.ts"),
        "utf-8"
      );
      expect(approve).toContain("decideApproval");
      expect(reject).toContain("decideApproval");
    });
  });

  describe("doctrine: no freeform, disclaimers and forbidden enforced", () => {
    it("compiler uses only template render and policy disclaimers", () => {
      const content = readFileSync(path.join(ROOT, "src", "lib", "speech-governance", "compiler.ts"), "utf-8");
      expect(content).toContain("renderTemplate");
      expect(content).toContain("required_disclaimers");
      expect(content).toContain("forbidden_phrases");
    });

    it("delivery provider does not run governance (content must be pre-governed by canonical pipeline)", () => {
      const content = readFileSync(path.join(ROOT, "src", "lib", "delivery", "provider.ts"), "utf-8");
      expect(content).not.toContain("compileGovernedMessage");
      expect(content).toMatch(/canonical pipeline|already be governed/);
    });
  });
});
