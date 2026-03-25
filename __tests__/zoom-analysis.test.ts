import { describe, it, expect, vi } from "vitest";

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    outcome: "info_gap",
                    buyer_signals: {
                      pain_points: [],
                      urgency: "medium",
                      authority: "unknown",
                      budget_signals: "unknown",
                      trust_level: "unknown",
                    },
                    objections: [],
                    commitments: [],
                    risks: [],
                    next_best_action: "send_recap",
                    followup_plan: [
                      { when_hours_from_now: 2, action_type: "send_recap", template_key: "recap" },
                    ],
                    summary: "Test summary",
                    confidence: 0.8,
                  }),
                },
              },
            ],
          }),
      },
    },
  })),
}));

import { analyzeClosingCall } from "@/lib/zoom/analysis";

describe("analyzeClosingCall", () => {
  it("returns fallback for short transcript", async () => {
    const result = await analyzeClosingCall("Hi");
    expect(result.outcome).toBe("info_gap");
    expect(result.next_best_action).toBe("send_recap");
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it("returns valid schema shape", async () => {
    const result = await analyzeClosingCall(
      "This is a longer transcript that exceeds the minimum length for analysis. The customer discussed their needs and timeline."
    );
    expect(result).toHaveProperty("outcome");
    expect(result).toHaveProperty("buyer_signals");
    expect(result).toHaveProperty("objections");
    expect(result).toHaveProperty("commitments");
    expect(result).toHaveProperty("risks");
    expect(result).toHaveProperty("next_best_action");
    expect(result).toHaveProperty("followup_plan");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("confidence");
    expect(Array.isArray(result.objections)).toBe(true);
    expect(Array.isArray(result.commitments)).toBe(true);
    expect(Array.isArray(result.risks)).toBe(true);
    expect(Array.isArray(result.followup_plan)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("outcome is one of allowed values", async () => {
    const allowed = [
      "hot_delay",
      "info_gap",
      "authority_gap",
      "trust_gap",
      "ghost_risk",
      "payment_hesitation",
      "not_ready",
      "lost_politely",
      "ready_to_buy",
    ];
    const result = await analyzeClosingCall(
      "This transcript is long enough to trigger analysis with enough content for the model."
    );
    expect(allowed).toContain(result.outcome);
  });
});
