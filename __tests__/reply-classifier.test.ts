import { describe, it, expect } from "vitest";
import {
  classifyReply,
  suggestedNextAction,
} from "../src/lib/inbound/reply-classifier";

describe("reply-classifier — classifyReply", () => {
  const anchor = new Date("2026-04-22T12:00:00.000Z");

  it("empty body → unknown", () => {
    const r = classifyReply("");
    expect(r.primary).toBe("unknown");
    expect(r.matchedPhrases).toHaveLength(0);
  });

  it("unsubscribe wins priority over anything else", () => {
    const r = classifyReply("Please unsubscribe me — not interested.", anchor);
    expect(r.primary).toBe("unsubscribe");
    expect(r.secondary).toContain("not_interested");
  });

  it("out-of-office with return date extraction", () => {
    const r = classifyReply(
      "I'm out of the office on vacation. Returning March 15.",
      anchor,
    );
    expect(r.primary).toBe("out_of_office");
    expect(r.oooReturnDate).not.toBeNull();
    expect(r.oooReturnDate?.slice(0, 7)).toBe("2027-03");
  });

  it("job change classification", () => {
    const r = classifyReply("I'm no longer with the company, please remove.", anchor);
    expect(r.primary).toBe("job_change");
  });

  it("wrong-person primary, referral as secondary with referredTo", () => {
    const r = classifyReply(
      "Wrong person — please contact Sam Jones in procurement.",
      anchor,
    );
    expect(r.primary).toBe("wrong_person");
    expect(r.secondary).toContain("referral");
    expect(r.referredTo).toBe("Sam Jones");
  });

  it("meeting request detected", () => {
    const r = classifyReply("Let's set up a call next week.", anchor);
    expect(r.primary).toBe("meeting_request");
  });

  it("interested signal", () => {
    const r = classifyReply("Sounds great — send me more details.", anchor);
    expect(r.primary).toBe("interested");
  });

  it("not-interested signal", () => {
    const r = classifyReply("We're all set, thanks.", anchor);
    expect(r.primary).toBe("not_interested");
  });
});

describe("reply-classifier — suggestedNextAction", () => {
  it("unsubscribe → suppress", () => {
    const c = classifyReply("Unsubscribe me.");
    expect(suggestedNextAction(c).action).toBe("suppress");
  });

  it("out_of_office → requeue_after with date", () => {
    const c = classifyReply("Out of office. Returning April 30.");
    const s = suggestedNextAction(c);
    expect(s.action).toBe("requeue_after");
  });

  it("referral → create_referral_lead", () => {
    // lowercase "contact" — the referral regex is case-sensitive by design
    // (capitalized names are the signal; leading "contact" is the verb trigger).
    const c = classifyReply("Please contact Sam Smith about that.");
    const s = suggestedNextAction(c);
    expect(s.action).toBe("create_referral_lead");
  });

  it("meeting_request → route_to_scheduling", () => {
    const c = classifyReply("Book a call with me this week.");
    const s = suggestedNextAction(c);
    expect(s.action).toBe("route_to_scheduling");
  });

  it("unknown / empty → no_op", () => {
    const c = classifyReply("");
    const s = suggestedNextAction(c);
    expect(s.action).toBe("no_op");
  });
});
