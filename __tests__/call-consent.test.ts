import { describe, it, expect } from "vitest";
import {
  CONSENT_PROMPT,
  NODE_PROMPTS,
  ESCALATION_TRIGGERS,
} from "../src/lib/calls/dialogue-graph";

describe("Call consent", () => {
  it("intro node includes consent in system prompt", () => {
    expect(NODE_PROMPTS.intro.systemPrompt).toContain("recorded or transcribed");
    expect(NODE_PROMPTS.intro.systemPrompt).toContain("is that okay");
    expect(NODE_PROMPTS.intro.systemPrompt).toContain("If no");
  });

  it("CONSENT_PROMPT is defined", () => {
    expect(CONSENT_PROMPT).toContain("recorded or transcribed");
    expect(CONSENT_PROMPT).toContain("Is that okay");
  });
});

describe("Escalation triggers", () => {
  it("includes anger, confusion, unsupported question, pricing", () => {
    expect(ESCALATION_TRIGGERS).toContain("anger");
    expect(ESCALATION_TRIGGERS).toContain("confusion repeated");
    expect(ESCALATION_TRIGGERS).toContain("unsupported question");
    expect(ESCALATION_TRIGGERS).toContain("pricing negotiation request");
  });
});
