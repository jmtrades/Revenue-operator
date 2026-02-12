/**
 * Human-safety layer: predictable, safe, human-acceptable behavior.
 */

import { describe, it, expect } from "vitest";
import {
  enforceHumanAcceptability,
  filterAwkwardness,
  checkOwnershipBoundary,
  detectDisinterest,
  applyBlameShield,
  enforceSimplicity,
} from "@/lib/human-safety";

describe("enforceHumanAcceptability", () => {
  it("returns uncertainty fallback when confidence < 0.6", () => {
    const result = enforceHumanAcceptability("Hey! Let's schedule a call!!", {
      confidence: 0.5,
    });
    expect(result.wasModified).toBe(true);
    expect(result.safeMessage).toContain("Happy to leave this here");
    expect(result.reason).toBe("low_confidence");
  });

  it("passes through neutral short messages", () => {
    const msg = "Just following up. Let me know if you'd like to schedule.";
    const result = enforceHumanAcceptability(msg, { confidence: 0.9 });
    expect(result.wasModified).toBe(false);
    expect(result.safeMessage).toBe(msg);
  });

  it("uses low-pressure fallback when message is not passive and lowPressureMode", () => {
    const result = enforceHumanAcceptability("Would you like to schedule a call now?", {
      confidence: 0.9,
      lowPressureMode: true,
      action: "booking",
    });
    expect(result.wasModified).toBe(true);
    expect(result.safeMessage).toContain("Just following up");
    expect(result.safeMessage).toContain("no rush");
  });
});

describe("filterAwkwardness", () => {
  it("replaces excitement tone with safe fallback", () => {
    const result = filterAwkwardness("Awesome!! Great news!!", {});
    expect(result.modified).toBe(true);
    expect(result.message).toContain("Just following up");
    expect(result.reason).toBe("excitement_tone");
  });

  it("replaces emoji with safe fallback when lead did not use emoji", () => {
    const result = filterAwkwardness("Just checking in 😊", { leadUsedEmoji: false });
    expect(result.modified).toBe(true);
    expect(result.message).toContain("Just following up");
  });

  it("allows emoji when lead used emoji first", () => {
    const result = filterAwkwardness("Sounds good 👍", { leadUsedEmoji: true });
    expect(result.modified).toBe(false);
    expect(result.message).toBe("Sounds good 👍");
  });

  it("trims multi-question to single question", () => {
    const result = filterAwkwardness("How are you? What do you need? When can we talk?", {});
    expect(result.modified).toBe(true);
    expect(result.message).toContain("?");
    expect((result.message.match(/\?/g) || []).length).toBeLessThanOrEqual(1);
  });
});

describe("checkOwnershipBoundary", () => {
  it("blocks rapport-building", () => {
    const result = checkOwnershipBoundary("Hope you're doing great! Just wanted to say hi.", {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("rapport");
  });

  it("allows logistics messages", () => {
    const result = checkOwnershipBoundary("Reminder: you have a call coming up. Let me know if you need to reschedule.", {
      action: "reminder",
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks closing language", () => {
    const result = checkOwnershipBoundary("Let's close this deal today!", {});
    expect(result.allowed).toBe(false);
  });
});

describe("detectDisinterest", () => {
  it("detects 'later'", () => {
    const result = detectDisinterest("Maybe later");
    expect(result.detected).toBe(true);
    expect(result.lowPressureMode).toBe(true);
  });

  it("detects 'busy'", () => {
    const result = detectDisinterest("I'm really busy right now");
    expect(result.detected).toBe(true);
  });

  it("detects 'I'll think'", () => {
    const result = detectDisinterest("I'll think about it");
    expect(result.detected).toBe(true);
  });

  it("detects short reply", () => {
    const result = detectDisinterest("ok");
    expect(result.detected).toBe(true);
  });

  it("allows interested response", () => {
    const result = detectDisinterest("Yes, I'd love to schedule a call this week");
    expect(result.detected).toBe(false);
  });
});

describe("applyBlameShield", () => {
  it("blocks outcome claims", () => {
    const result = applyBlameShield("I guarantee you'll love this!", {});
    expect(result.modified).toBe(true);
    expect(result.reason).toContain("outcome_claim");
  });

  it("blocks false assumptions", () => {
    const result = applyBlameShield("I know you want to move forward", {});
    expect(result.modified).toBe(true);
  });

  it("allows neutral messages", () => {
    const result = applyBlameShield("Just following up. No rush.", {});
    expect(result.modified).toBe(false);
  });
});

describe("enforceSimplicity", () => {
  it("trims to 2 sentences max", () => {
    const result = enforceSimplicity(
      "First sentence here. Second sentence. Third sentence. Fourth one."
    );
    expect(result.modified).toBe(true);
    expect((result.message.match(/[.!?]/g) || []).length).toBeLessThanOrEqual(2);
  });

  it("removes lists", () => {
    const result = enforceSimplicity("Here are the options:\n• Option 1\n• Option 2");
    expect(result.modified).toBe(true);
    expect(result.message).not.toContain("•");
  });

  it("caps length around 220 chars when over limit", () => {
    const long =
      "This is a very long message that goes on and on and on with many words and phrases and keeps going without stopping for a very long time and we need to make sure it gets trimmed down to something reasonable for SMS and email as well.";
    const result = enforceSimplicity(long);
    expect(result.message.length).toBeLessThanOrEqual(250);
  });
});
