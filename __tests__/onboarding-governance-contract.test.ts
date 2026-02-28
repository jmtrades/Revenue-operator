/**
 * Contract: onboarding governance step and API.
 * Route exists, JSON contract, idempotency, domain fallback, policy creation, doctrine-safe copy.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const FORBIDDEN_SAAS = [
  "chatbot", "automation", "workflow", "campaign", "CRM", "sequence", "channel", "pack", "seats",
];

describe("Onboarding governance contract", () => {
  describe("Route exists and JSON contract", () => {
    it("POST /api/onboard/governance route exists", async () => {
      const mod = await import("@/app/api/onboard/governance/route");
      expect(typeof mod.POST).toBe("function");
    });

    it("success path returns JSON with ok: true", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "onboard", "governance", "route.ts"), "utf-8");
      expect(content).toMatch(/NextResponse\.json\s*\(\s*\{[^}]*ok:\s*true/);
    });

    it("returns ok: false with reason for invalid input", async () => {
      const { POST } = await import("@/app/api/onboard/governance/route");
      const req = new Request("http://localhost/api/onboard/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req as import("next/server").NextRequest);
      const json = await res.json();

      expect(json).toHaveProperty("ok", false);
      expect(json).toHaveProperty("reason");
      expect(["invalid_input", "invalid_json"]).toContain(json.reason);
    });

    it("returns ok: false with reason for invalid JSON", async () => {
      const { POST } = await import("@/app/api/onboard/governance/route");
      const req = new Request("http://localhost/api/onboard/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });

      const res = await POST(req as import("next/server").NextRequest);
      const json = await res.json();

      expect(json).toHaveProperty("ok", false);
      expect(json.reason).toBe("invalid_json");
    });

    it("never returns stack traces or internal IDs in error", async () => {
      const { POST } = await import("@/app/api/onboard/governance/route");
      const req = new Request("http://localhost/api/onboard/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req as import("next/server").NextRequest);
      const text = await res.text();
      const json = JSON.parse(text);

      expect(json).not.toHaveProperty("stack");
      expect(text).not.toMatch(/at\s+\S+\s+\(/);
      if (json.reason) {
        expect(typeof json.reason).toBe("string");
        expect(json.reason.length).toBeLessThan(80);
      }
    });
  });

  describe("API implementation", () => {
    it("governance route validates jurisdiction and approval_mode", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "onboard", "governance", "route.ts"), "utf-8");
      expect(content).toContain("JURISDICTIONS");
      expect(content).toContain("APPROVAL_MODES");
      expect(content).toMatch(/workspace_id|workspaceId/);
    });

    it("governance route creates or updates domain_packs and message_policies", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "onboard", "governance", "route.ts"), "utf-8");
      expect(content).toContain("domain_packs");
      expect(content).toContain("message_policies");
      expect(content).toContain("default_jurisdiction");
      expect(content).toContain("approval_mode");
      expect(content).toContain("follow_up");
      expect(content).toContain("sms");
    });

    it("domain fallback: general when domain_type missing", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "onboard", "governance", "route.ts"), "utf-8");
      expect(content).toContain("general");
      expect(content).toMatch(/domainType|domain_type/);
    });
  });

  describe("Idempotency", () => {
    it("route uses upsert or delete-then-insert for deterministic state", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "onboard", "governance", "route.ts"), "utf-8");
      const usesUpsert = content.includes("upsert");
      const usesDeleteThenInsert = content.includes("delete") && content.includes("insert");
      expect(usesUpsert || usesDeleteThenInsert).toBe(true);
    });
  });

  describe("Policy creation", () => {
    it("route persists workspace_id, domain_type, jurisdiction, sms, follow_up, approval_mode", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "onboard", "governance", "route.ts"), "utf-8");
      expect(content).toContain("workspace_id");
      expect(content).toContain("domain_type");
      expect(content).toContain("jurisdiction");
      expect(content).toContain("sms");
      expect(content).toContain("follow_up");
      expect(content).toContain("approval_mode");
    });
  });

  describe("Doctrine and forbidden language", () => {
    it("governance page contains required institutional copy", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "onboard", "governance", "page.tsx"), "utf-8");
      expect(content).toContain("Execution infrastructure requires");
      expect(content).toContain("Set jurisdiction, approval mode, and voice governance");
    });

    it("governance page does not contain forbidden SaaS or persuasion words", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "onboard", "governance", "page.tsx"), "utf-8");
      const lower = content.toLowerCase();
      FORBIDDEN_SAAS.forEach((word) => {
        expect(lower).not.toContain(word);
      });
    });

    it("governance page has single primary Continue action", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "onboard", "governance", "page.tsx"), "utf-8");
      expect(content).toContain("Continue");
    });
  });
});
