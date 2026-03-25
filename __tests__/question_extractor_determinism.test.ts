/**
 * Question extractor: deterministic. Same input → same output. Max 3.
 */

import { describe, it, expect } from "vitest";
import {
  extractQuestionsFromVoiceOutcome,
  extractQuestionsFromMessageMetadata,
} from "../src/lib/intelligence/unresolved-questions";
import { QUESTION_TYPES } from "../src/lib/intelligence/question-taxonomy";

describe("Question extractor determinism", () => {
  it("extractQuestionsFromVoiceOutcome same input yields same output", () => {
    const input = { objection_key: "pricing", next_required_action: null, notes_structured: null };
    const a = extractQuestionsFromVoiceOutcome(input);
    const b = extractQuestionsFromVoiceOutcome(input);
    expect(a).toEqual(b);
  });

  it("returns at most 3 questions", () => {
    const out = extractQuestionsFromVoiceOutcome({
      objection_key: "pricing",
      next_required_action: "request_disclosure_confirmation",
      notes_structured: { refund: true, schedule: true },
    });
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("each question_type is from QUESTION_TYPES", () => {
    const out = extractQuestionsFromVoiceOutcome({ objection_key: "pricing", notes_structured: {} });
    for (const q of out) {
      expect(QUESTION_TYPES).toContain(q.question_type);
    }
  });

  it("extractQuestionsFromMessageMetadata deterministic", () => {
    const meta = { price: 100, schedule: "tomorrow" };
    const a = extractQuestionsFromMessageMetadata(meta);
    const b = extractQuestionsFromMessageMetadata(meta);
    expect(a).toEqual(b);
  });

  it("question_text_short capped at 160", () => {
    const out = extractQuestionsFromVoiceOutcome({ objection_key: "pricing" });
    for (const q of out) {
      expect(q.question_text_short.length).toBeLessThanOrEqual(160);
    }
  });
});
