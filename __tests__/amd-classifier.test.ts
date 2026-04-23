import { describe, it, expect } from "vitest";
import {
  classifyOpeningUtterance,
  foldAmdClassifications,
} from "../src/lib/voice/amd-classifier";

describe("amd-classifier — classifyOpeningUtterance", () => {
  it("empty transcript → ambient / keep_listening", () => {
    const r = classifyOpeningUtterance("");
    expect(r.verdict).toBe("ambient");
    expect(r.recommendedAction).toBe("keep_listening");
    expect(r.confidence).toBe(0);
  });

  it("provider AMD positive overrides everything", () => {
    const r = classifyOpeningUtterance("hello there how are you", { providerSaidMachine: true });
    expect(r.verdict).toBe("machine_greeting");
    expect(r.recommendedAction).toBe("drop_voicemail_now");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("short human greeting → human / continue_pitch", () => {
    const r = classifyOpeningUtterance("hello?");
    expect(r.verdict).toBe("human");
    expect(r.recommendedAction).toBe("continue_pitch");
    expect(r.matchedPhrase).toBeTruthy();
  });

  it("'who is this' → high-confidence human", () => {
    const r = classifyOpeningUtterance("who is this?");
    expect(r.verdict).toBe("human");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("carrier unavailable notice → machine_greeting", () => {
    const r = classifyOpeningUtterance("The person you are calling is not available. Please leave a message after the tone.");
    expect(r.verdict).toBe("machine_greeting");
    expect(["wait_for_beep", "drop_voicemail_now"]).toContain(r.recommendedAction);
  });

  it("'at the tone' → drop_voicemail_now", () => {
    const r = classifyOpeningUtterance("At the tone, record your message.");
    expect(r.verdict).toBe("machine_greeting");
    expect(r.recommendedAction).toBe("drop_voicemail_now");
  });

  it("'you've reached ...' personal voicemail → machine_greeting", () => {
    const r = classifyOpeningUtterance("Hi, you've reached Jim's voicemail, please leave a message.");
    expect(r.verdict).toBe("machine_greeting");
  });

  it("long monologue early in call with no punctuation → machine_greeting heuristic", () => {
    const r = classifyOpeningUtterance(
      "thanks so much for calling us today we are unable to take your call right now so go ahead",
      { elapsedMs: 3000 },
    );
    expect(r.verdict).toBe("machine_greeting");
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("beep-only transcript → beep / drop_voicemail_now", () => {
    const r = classifyOpeningUtterance("beep");
    expect(r.verdict).toBe("beep");
    expect(r.recommendedAction).toBe("drop_voicemail_now");
  });

  it("ambiguous noise → ambient / keep_listening", () => {
    const r = classifyOpeningUtterance("um", { elapsedMs: 500 });
    expect(r.verdict).toBe("ambient");
    expect(r.recommendedAction).toBe("keep_listening");
  });
});

describe("amd-classifier — foldAmdClassifications", () => {
  it("machine_greeting ≥0.8 in series wins", () => {
    const folded = foldAmdClassifications([
      { verdict: "ambient", confidence: 0, matchedPhrase: null, reason: "x", recommendedAction: "keep_listening" },
      { verdict: "machine_greeting", confidence: 0.95, matchedPhrase: "leave a message", reason: "leave_a_message", recommendedAction: "wait_for_beep" },
      { verdict: "human", confidence: 0.8, matchedPhrase: "hello", reason: "short_human_hello", recommendedAction: "continue_pitch" },
    ]);
    expect(folded.verdict).toBe("machine_greeting");
  });

  it("first human ≥0.7 wins when no machine/beep present", () => {
    const folded = foldAmdClassifications([
      { verdict: "ambient", confidence: 0, matchedPhrase: null, reason: "x", recommendedAction: "keep_listening" },
      { verdict: "human", confidence: 0.8, matchedPhrase: "hi", reason: "short_human_hello", recommendedAction: "continue_pitch" },
    ]);
    expect(folded.verdict).toBe("human");
  });

  it("empty series returns a safe default", () => {
    const folded = foldAmdClassifications([]);
    expect(folded.verdict).toBe("ambient");
    expect(folded.recommendedAction).toBe("keep_listening");
  });
});
