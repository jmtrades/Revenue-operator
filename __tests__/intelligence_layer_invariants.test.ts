/**
 * Universal Commercial Operating Intelligence — invariant protection.
 * Commitment score deterministic, objective resolver never random, risk engine blocks unsafe send,
 * batch controller bounded, no DELETE, no provider imports, no freeform.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  resolveObjectives,
  type ResolveObjectivesInput,
} from "../src/lib/intelligence/objective-engine";
import {
  computeNextCommitmentState,
  DEFAULT_COMMITMENT_STATE,
  type VoiceOutcomeInput,
  type MessageOutcomeInput,
} from "../src/lib/intelligence/commitment-score";
import { evaluateRisk, type RiskEngineInput } from "../src/lib/intelligence/risk-engine";
import { selectBatchWave, type LeadSegmentItem } from "../src/lib/intelligence/batch-controller";

const ROOT = path.resolve(__dirname, "..");
const INTELLIGENCE_DIR = path.join(ROOT, "src/lib/intelligence");

describe("Intelligence layer invariants", () => {
  it("objective resolver is deterministic (same input → same output)", () => {
    const input: ResolveObjectivesInput = {
      workspaceId: "w",
      leadState: { strategy_state: "discovery", intent_type: "follow_up" },
      conversationContext: { conversation_id: "c", domain_type: "general" },
      riskScore: 0,
    };
    const a = resolveObjectives(input);
    const b = resolveObjectives(input);
    expect(a.primary).toBe(b.primary);
    expect(a.secondary).toBe(b.secondary);
  });

  it("objective resolver never returns random — high risk forces escalate", () => {
    const input: ResolveObjectivesInput = {
      workspaceId: "w",
      leadState: { strategy_state: "commitment_request", intent_type: "confirmation" },
      conversationContext: { conversation_id: "c", domain_type: "real_estate" },
      riskScore: 85,
    };
    const out = resolveObjectives(input);
    expect(out.primary).toBe("escalate");
  });

  it("commitment score compute is deterministic", () => {
    const prev = DEFAULT_COMMITMENT_STATE;
    const voiceInput: VoiceOutcomeInput = {
      outcome: "completed",
      consent_recorded: true,
      disclosures_read: true,
    };
    const a = computeNextCommitmentState(prev, voiceInput);
    const b = computeNextCommitmentState(prev, voiceInput);
    expect(a.trustScore).toBe(b.trustScore);
    expect(a.momentumScore).toBe(b.momentumScore);
    expect(a.probabilityScore).toBe(b.probabilityScore);
  });

  it("risk engine blocks unsafe send — high risk yields requiresEscalation or requiresPause", () => {
    const highRisk: RiskEngineInput = {
      jurisdictionComplete: false,
      disclosureStateComplete: false,
      consentPresent: false,
      volatilityScore: 80,
      legalKeywordsDetected: true,
      objectionCycleCount: 3,
      emotionalCategory: "hostile",
    };
    const out = evaluateRisk(highRisk);
    expect(out.riskScore).toBeGreaterThanOrEqual(75);
    expect(out.requiresEscalation || out.requiresPause).toBe(true);
  });

  it("risk engine safe input yields no escalation or pause", () => {
    const safe: RiskEngineInput = {
      jurisdictionComplete: true,
      disclosureStateComplete: true,
      consentPresent: true,
      volatilityScore: 10,
      legalKeywordsDetected: false,
      objectionCycleCount: 0,
      emotionalCategory: "neutral",
    };
    const out = evaluateRisk(safe);
    expect(out.requiresEscalation).toBe(false);
    expect(out.requiresPause).toBe(false);
  });

  it("batch controller wave is bounded by maxPerWave and rate headroom", () => {
    const items: LeadSegmentItem[] = Array.from({ length: 100 }, (_, i) => ({
      workspace_id: "w",
      thread_id: `t-${i}`,
      commitmentState: {
        trustScore: 50,
        momentumScore: 50,
        frictionScore: 50,
        volatilityScore: 0,
        probabilityScore: 50,
      },
    }));
    const result = selectBatchWave({
      items,
      maxPerWave: 10,
      rateConsumed: 0,
      rateLimit: 5,
    });
    expect(result.wave.length).toBeLessThanOrEqual(10);
    expect(result.wave.length).toBeLessThanOrEqual(5);
  });

  it("intelligence layer files do not contain DELETE or TRUNCATE", () => {
    const files = ["objective-engine.ts", "commitment-score.ts", "risk-engine.ts", "batch-controller.ts", "channel-coordinator.ts", "self-healing.ts", "emotional-normalizer.ts", "escalation-summary.ts"];
    for (const f of files) {
      const full = path.join(INTELLIGENCE_DIR, f);
      if (!existsSync(full)) continue;
      const content = readFileSync(full, "utf-8");
      expect(content).not.toMatch(/\bDELETE\b/);
      expect(content).not.toMatch(/\bTRUNCATE\b/);
    }
  });

  it("intelligence layer does not import provider libs (Twilio, Stripe, Nodemailer, Sendgrid, Resend)", () => {
    const providerPatterns = ["twilio", "stripe", "nodemailer", "sendgrid", "resend"];
    const files = ["objective-engine.ts", "commitment-score.ts", "risk-engine.ts", "batch-controller.ts", "channel-coordinator.ts", "self-healing.ts", "emotional-normalizer.ts", "escalation-summary.ts"];
    for (const f of files) {
      const full = path.join(INTELLIGENCE_DIR, f);
      if (!existsSync(full)) continue;
      const content = readFileSync(full, "utf-8").toLowerCase();
      for (const p of providerPatterns) {
        expect(content, `intelligence file ${f} must not import ${p}`).not.toMatch(new RegExp(`from\\s+['"]?.*${p}|require\\s*\\(.*${p}`));
      }
    }
  });

  it("intelligence layer does not use Math.random or crypto.randomUUID", () => {
    const files = ["objective-engine.ts", "commitment-score.ts", "risk-engine.ts", "batch-controller.ts", "channel-coordinator.ts", "self-healing.ts", "emotional-normalizer.ts", "escalation-summary.ts"];
    for (const f of files) {
      const full = path.join(INTELLIGENCE_DIR, f);
      if (!existsSync(full)) continue;
      const content = readFileSync(full, "utf-8");
      expect(content, `intelligence file ${f} must not use Math.random`).not.toContain("Math.random");
      expect(content, `intelligence file ${f} must not use crypto.randomUUID`).not.toContain("crypto.randomUUID");
    }
  });
});
