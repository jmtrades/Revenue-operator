/**
 * Stop conditions: when present, execution must not send.
 */

import { describe, it, expect } from "vitest";
import { evaluateStopConditions } from "../src/lib/intelligence/stop-conditions";

describe("Stop conditions never send", () => {
  it("high risk returns stop reason", () => {
    const out = evaluateStopConditions({
      riskScore: 80,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
    });
    expect(out).toBe("risk_threshold");
  });

  it("jurisdiction incomplete returns stop reason", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: false,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
    });
    expect(out).toBe("jurisdiction_unspecified");
  });

  it("objection chain exceeded returns stop reason", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 3,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
      maxObjectionChain: 3,
    });
    expect(out).toBe("objection_chain_exceeded");
  });

  it("cadence_restriction when cadenceResult is cool_off", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
      cadenceResult: "cool_off",
    });
    expect(out).toBe("cadence_restriction");
  });

  it("hostile_cooldown when cadenceResult is freeze_24h", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
      cadenceResult: "freeze_24h",
    });
    expect(out).toBe("hostile_cooldown");
  });

  it("broken_commitment_threshold when brokenCommitmentsCount >= 2", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
      brokenCommitmentsCount: 2,
    });
    expect(out).toBe("broken_commitment_threshold");
  });

  it("outcome_requires_pause when lastOutcomeType is opted_out", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
      lastOutcomeType: "opted_out",
    });
    expect(out).toBe("outcome_requires_pause");
  });

  it("excessive_hostility_loop when hostilityLoopCount >= threshold", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
      hostilityLoopCount: 3,
      hostilityLoopThreshold: 3,
    });
    expect(out).toBe("excessive_hostility_loop");
  });

  it("repeated_unknown_outcome when repeatedUnknownCount >= threshold", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
      repeatedUnknownCount: 3,
      repeatedUnknownThreshold: 3,
    });
    expect(out).toBe("repeated_unknown_outcome");
  });

  it("all clear returns null", () => {
    const out = evaluateStopConditions({
      riskScore: 0,
      jurisdictionComplete: true,
      consentPresent: true,
      disclosureComplete: true,
      objectionChainCount: 0,
      attemptCount: 0,
      rateHeadroom: 10,
      executionStale: false,
      complianceLock: false,
    });
    expect(out).toBeNull();
  });
});
