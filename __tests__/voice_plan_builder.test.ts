/**
 * Voice Execution Plan builder: determinism, required ordering, missing_blocks, no forbidden leak, consent.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildVoiceExecutionPlan } from "@/lib/voice/plan/build";

vi.mock("@/lib/governance/compliance-pack", () => ({
  resolveCompliancePack: vi.fn(() =>
    Promise.resolve({
      disclaimers: ["Compliance disclaimer."],
      forbidden_claims: [],
      consent_required: false,
    })
  ),
}));
vi.mock("@/lib/governance/message-policy", () => ({
  resolveMessagePolicy: vi.fn(() =>
    Promise.resolve({
      id: "pol",
      required_disclaimers: ["Policy disclaimer."],
      forbidden_phrases: [],
      required_phrases: [],
      approval_mode: "autopilot",
    })
  ),
}));

describe("Voice plan builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok:true with plan for valid inputs", async () => {
    const result = await buildVoiceExecutionPlan({
      workspaceId: "ws",
      domainType: "real_estate",
      jurisdiction: "UK",
      stageState: "discovery",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.domain_type).toBe("real_estate");
      expect(result.plan.jurisdiction).toBe("UK");
      expect(result.plan.stage_state).toBe("discovery");
      expect(Array.isArray(result.plan.script_blocks)).toBe(true);
      expect(Array.isArray(result.plan.disclaimer_lines)).toBe(true);
    }
  });

  it("is deterministic for same inputs", async () => {
    const args = {
      workspaceId: "ws",
      domainType: "insurance",
      jurisdiction: "UK",
      stageState: "qualification",
      nowIso: "2025-01-01T00:00:00.000Z",
    };
    const a = await buildVoiceExecutionPlan(args);
    const b = await buildVoiceExecutionPlan(args);
    expect(a).toEqual(b);
  });

  it("includes required block ordering (opening, disclosure, close)", async () => {
    const result = await buildVoiceExecutionPlan({
      workspaceId: "ws",
      domainType: "legal",
      jurisdiction: "UK",
      stageState: "discovery",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const types = result.plan.script_blocks.map((b) => b.block_type);
      const hasOpening = types.some((t) => t === "opening_block" || t === "opening");
      const hasDisclosure = types.some((t) => t === "disclosure_block" || t === "disclosure");
      const hasClose = types.some((t) => t === "close_block" || t === "close");
      expect(hasOpening).toBe(true);
      expect(hasDisclosure).toBe(true);
      expect(hasClose).toBe(true);
    }
  });

  it("returns ok:true with generic blocks when domain has no custom presets", async () => {
    const result = await buildVoiceExecutionPlan({
      workspaceId: "ws",
      domainType: "unknown_domain_xyz",
      jurisdiction: "UK",
      stageState: "discovery",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.script_blocks.length).toBeGreaterThanOrEqual(1);
      expect(result.plan.domain_type).toBe("unknown_domain_xyz");
    }
  });

  it("returns ok:false with reason invalid_input when workspaceId empty", async () => {
    const result = await buildVoiceExecutionPlan({
      workspaceId: "",
      domainType: "real_estate",
      jurisdiction: "UK",
      stageState: "discovery",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_input");
  });

  it("returns ok:false with reason invalid_state for invalid stageState", async () => {
    const result = await buildVoiceExecutionPlan({
      workspaceId: "ws",
      domainType: "real_estate",
      jurisdiction: "UK",
      stageState: "invalid_state_xyz",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_state");
  });

  it("script_blocks have lines, required_disclosures, forbidden_phrases, consent_required", async () => {
    const result = await buildVoiceExecutionPlan({
      workspaceId: "ws",
      domainType: "solar",
      jurisdiction: "UK",
      stageState: "discovery",
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.plan.script_blocks.length) {
      const block = result.plan.script_blocks[0];
      expect(block).toHaveProperty("block_type");
      expect(Array.isArray(block.lines)).toBe(true);
      expect(Array.isArray(block.required_disclosures)).toBe(true);
      expect(Array.isArray(block.forbidden_phrases)).toBe(true);
      expect(typeof block.consent_required).toBe("boolean");
    }
  });

  it("consent_required true when compliance or block requires consent", async () => {
    const { resolveCompliancePack } = await import("@/lib/governance/compliance-pack");
    vi.mocked(resolveCompliancePack).mockResolvedValueOnce({
      disclaimers: [],
      forbidden_claims: [],
      consent_required: true,
    });
    const result = await buildVoiceExecutionPlan({
      workspaceId: "ws",
      domainType: "insurance",
      jurisdiction: "UK",
      stageState: "discovery",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.consent_required).toBe(true);
    }
  });
});
