/**
 * Universal outcome: when next_required_action is not none, caller must emit or handle.
 */

import { describe, it, expect } from "vitest";
import { resolveUniversalOutcome } from "../src/lib/intelligence/outcome-taxonomy";

describe("Universal outcome requires next action", () => {
  it("opted_out returns next_required_action pause_execution", () => {
    const r = resolveUniversalOutcome({ optOut: true });
    expect(r.next_required_action).toBe("pause_execution");
    expect(r.outcome_type).toBe("opted_out");
  });

  it("legal_risk returns next_required_action escalate_to_human", () => {
    const r = resolveUniversalOutcome({ legalKeywordPresent: true });
    expect(r.next_required_action).toBe("escalate_to_human");
  });

  it("payment_promised returns next_required_action record_commitment", () => {
    const r = resolveUniversalOutcome({ paymentPromised: true });
    expect(r.next_required_action).toBe("record_commitment");
  });

  it("payment_made returns next_required_action none", () => {
    const r = resolveUniversalOutcome({ paymentMade: true });
    expect(r.next_required_action).toBe("none");
  });

  it("no_answer under limit returns schedule_followup", () => {
    const r = resolveUniversalOutcome({ voiceOutcome: "no_answer", attemptCount: 0, maxAttemptsPerLead: 10 });
    expect(r.next_required_action).toBe("schedule_followup");
  });
});
