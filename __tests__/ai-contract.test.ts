import { describe, it, expect } from "vitest";
import { parseAIContract } from "../src/lib/ai/contract";

describe("AI Contract", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({
      intent: "inquiry",
      entities: {},
      sentiment: "neutral",
      confidence: 0.9,
      recommended_action: "greeting",
      slot_values: { greeting: "Hi!" },
    });
    const r = parseAIContract(raw);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.intent).toBe("inquiry");
      expect(r.data.confidence).toBe(0.9);
    }
  });

  it("rejects invalid JSON", () => {
    const r = parseAIContract("not json");
    expect(r.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const r = parseAIContract(JSON.stringify({ intent: "x" }));
    expect(r.success).toBe(false);
  });

  it("rejects confidence out of range", () => {
    const r = parseAIContract(
      JSON.stringify({
        intent: "x",
        confidence: 1.5,
        recommended_action: "x",
      })
    );
    expect(r.success).toBe(false);
  });
});
