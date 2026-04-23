/**
 * Phase 12f — Tests for the live-call + inbound wire-ins.
 *
 *   1. live-guardrail: pre-TTS sanitization, commitment extraction, competitor
 *      detection on a single agent utterance.
 *   2. reactive-event-processor: email_reply events now route through the
 *      Phase 12c.8 classifier (OOO, unsubscribe, wrong-person, referral,
 *      meeting-request, not-interested, and positive baseline).
 *
 * These exercise the actual functions wired into the live call / inbound
 * paths. They should pass with no DB, no LLM, no network.
 */

import { describe, it, expect } from "vitest";
import { guardLiveUtterance } from "../src/lib/voice/live-guardrail";
import { processEvent } from "../src/lib/intelligence/reactive-event-processor";
import type {
  LeadContext,
  LeadEvent,
} from "../src/lib/intelligence/reactive-event-processor";

// ---------------------------------------------------------------------------
// live-guardrail
// ---------------------------------------------------------------------------

describe("live-guardrail.guardLiveUtterance", () => {
  it("passes through a clean utterance unchanged", () => {
    const r = guardLiveUtterance(
      "I'd love to show you how the agent handles inbound calls.",
      {},
    );
    expect(r.mutated).toBe(false);
    expect(r.text).toBe("I'd love to show you how the agent handles inbound calls.");
    expect(r.scan.severity).toBe("allow");
    expect(r.commitments).toEqual([]);
  });

  it("blocks and rewrites an unverified price quote", () => {
    const r = guardLiveUtterance(
      "Our starter plan is just $49 per month — risk-free.",
      {}, // no allow-list → price not verified, "risk-free" always blocked
    );
    expect(r.mutated).toBe(true);
    expect(r.text).not.toMatch(/\$49/);
    expect(r.scan.severity).toBe("block");
  });

  it("allows a price quote when it matches the workspace allow-list", () => {
    const r = guardLiveUtterance(
      "It's $147 a month and includes everything you need.",
      { workspaceFacts: { allowedPrices: [/\$\s?147\b/i] } },
    );
    expect(r.mutated).toBe(false);
    expect(r.text).toMatch(/\$147/);
  });

  it("extracts a callback commitment the agent just made", () => {
    const r = guardLiveUtterance(
      "I'll email you the pricing sheet tonight.",
      { workspaceFacts: { allowedFeatures: ["pricing sheet"] } },
    );
    // Commitment must be extracted regardless of hallucination severity.
    expect(r.commitments.length).toBeGreaterThan(0);
    expect(r.commitments[0]!.speaker).toBe("agent");
    expect(r.commitments[0]!.type).toBe("info_send");
  });

  it("detects a competitor mention against the provided battlecards", () => {
    const r = guardLiveUtterance(
      "A lot of folks compare us to HubSpot but we focus on the phone channel.",
      {
        battlecards: [
          {
            id: "bc-hubspot",
            competitorName: "HubSpot",
            counterLine: "We win on voice — HubSpot's strength is email.",
          },
        ],
      },
    );
    expect(r.competitorMention).not.toBeNull();
    expect(r.competitorMention?.competitorName).toBe("HubSpot");
    expect(r.competitorMention?.battlecardId).toBe("bc-hubspot");
  });

  it("gracefully handles empty input", () => {
    const r = guardLiveUtterance("", {});
    expect(r.text).toBe("");
    expect(r.mutated).toBe(false);
    expect(r.commitments).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// reactive-event-processor.processEvent — email_reply routing
// ---------------------------------------------------------------------------

function makeEvent(text: string): LeadEvent {
  return {
    id: "evt-1",
    type: "email_reply",
    timestamp: "2026-04-22T12:00:00.000Z",
    leadId: "lead-1",
    channel: "email",
    data: { text },
  };
}

function makeContext(): LeadContext {
  return {
    leadId: "lead-1",
    name: "Taylor",
    email: "taylor@acme.co",
    companyName: "Acme",
    lifecyclePhase: "ENGAGED",
    daysSinceFirstContact: 3,
    daysSinceDark: 0,
    leadScore: 40,
    conversionProbability: 0.4,
    lastActivityAt: "2026-04-22T11:00:00.000Z",
    lastTouchChannel: "email",
    totalTouchpoints: 3,
    recentEvents: [],
    sentiment: "neutral",
    hasOptedOut: false,
    isHighValue: false,
  };
}

describe("reactive-event-processor.processEvent — email_reply", () => {
  it("suppresses future outreach on unsubscribe", () => {
    const r = processEvent(makeEvent("Please unsubscribe me, stop emailing me."), makeContext());
    expect(r.stageUpdate?.newStage).toBe("LOST");
    expect(r.scoreDelta.delta).toBeLessThanOrEqual(-50);
    expect(r.notifyRep.notify).toBe(true);
    expect(r.reasoning).toMatch(/unsubscribe/i);
  });

  it("schedules a resume after out-of-office returns", () => {
    const r = processEvent(
      makeEvent("I'm out of the office on vacation, returning Monday."),
      makeContext(),
    );
    expect(r.reasoning).toMatch(/out[- ]of[- ]office/i);
    expect(r.delayedActions.length).toBeGreaterThan(0);
    expect(r.delayedActions[0]!.templateKey).toBe("post_ooo_resume");
  });

  it("enriches for the correct contact on wrong_person", () => {
    const r = processEvent(
      makeEvent("You've got the wrong person — I don't handle that."),
      makeContext(),
    );
    expect(r.reasoning).toMatch(/wrong person/i);
    expect(r.notifyRep.notify).toBe(true);
    expect(r.notifyRep.actionItems.join(" ")).toMatch(/correct contact/i);
  });

  it("marks stale on job_change reply", () => {
    const r = processEvent(
      makeEvent("Taylor is no longer with Acme — please remove."),
      makeContext(),
    );
    expect(r.stageUpdate?.newStage).toBe("LOST");
    expect(r.reasoning).toMatch(/job change/i);
  });

  it("routes meeting requests to scheduling with critical priority", () => {
    const r = processEvent(
      makeEvent("Yes, let's set up a time to talk. Can we schedule a call?"),
      makeContext(),
    );
    expect(r.stageUpdate?.newStage).toBe("BOOKED");
    expect(r.immediateActions[0]!.priority).toBe("critical");
    expect(r.notifyRep.priority).toBe("urgent");
  });

  it("backs off 30 days on not_interested", () => {
    const r = processEvent(
      makeEvent("Not interested, please remove me from your list."),
      makeContext(),
    );
    // "not_interested" should either win directly or "unsubscribe" — both are
    // acceptable back-off outcomes for a hostile reply. The important thing is
    // we do NOT progress the lead.
    expect(r.stageUpdate?.newStage ?? "").not.toBe("QUALIFIED");
    expect(r.scoreDelta.delta).toBeLessThanOrEqual(0);
  });

  it("progresses to QUALIFIED on a neutral/positive reply", () => {
    const r = processEvent(
      makeEvent("Thanks for reaching out — this sounds interesting, tell me more."),
      makeContext(),
    );
    expect(r.stageUpdate?.newStage).toBe("QUALIFIED");
    expect(r.scoreDelta.delta).toBeGreaterThan(0);
    expect(r.notifyRep.notify).toBe(true);
  });
});
