/**
 * Phase 39 — Intent + buying signal processor.
 */

import { describe, it, expect } from "vitest";
import {
  scoreAccountIntent,
  scoreBookIntent,
  detectSpikes,
  DEFAULT_INTENT_CONFIG,
  type BuyingSignal,
} from "../src/lib/sales/intent-signal-processor";

const NOW = "2026-04-22T12:00:00.000Z";
function sig(o: Partial<BuyingSignal>): BuyingSignal {
  return {
    id: "s1",
    accountId: "acct-1",
    type: "web_research",
    strength: 3,
    occurredAt: NOW,
    ...o,
  } as BuyingSignal;
}

describe("scoreAccountIntent — decay", () => {
  it("recent signal scores higher than old signal of same type/strength", () => {
    const recent = scoreAccountIntent(
      "acct-1",
      [sig({ id: "a", type: "pricing_page_visit", occurredAt: NOW })],
      NOW,
    );
    const old = scoreAccountIntent(
      "acct-1",
      [sig({ id: "a", type: "pricing_page_visit", occurredAt: "2026-01-22T12:00:00.000Z" })],
      NOW,
    );
    expect(recent.raw).toBeGreaterThan(old.raw);
  });

  it("funding round decays slower than a pricing page visit", () => {
    const funding = scoreAccountIntent(
      "acct-1",
      [sig({ id: "a", type: "funding_round", strength: 5, occurredAt: "2026-02-22T12:00:00.000Z" })],
      NOW,
    );
    const pricing = scoreAccountIntent(
      "acct-1",
      [sig({ id: "a", type: "pricing_page_visit", strength: 5, occurredAt: "2026-02-22T12:00:00.000Z" })],
      NOW,
    );
    expect(funding.raw).toBeGreaterThan(pricing.raw);
  });

  it("future signals are ignored", () => {
    const r = scoreAccountIntent(
      "acct-1",
      [sig({ id: "a", occurredAt: "2028-01-01T00:00:00.000Z" })],
      NOW,
    );
    expect(r.raw).toBe(0);
  });
});

describe("scoreAccountIntent — trend", () => {
  it("rising when more recent signals than prior window", () => {
    const signals: BuyingSignal[] = [
      sig({ id: "a", occurredAt: "2026-04-21T00:00:00.000Z" }),
      sig({ id: "b", occurredAt: "2026-04-18T00:00:00.000Z" }),
      sig({ id: "c", occurredAt: "2026-04-15T00:00:00.000Z" }),
      sig({ id: "d", occurredAt: "2026-04-01T00:00:00.000Z" }),
    ];
    expect(scoreAccountIntent("acct-1", signals, NOW).trend).toBe("rising");
  });

  it("cooling when recent is much less than prior window", () => {
    const signals: BuyingSignal[] = [
      sig({ id: "a", occurredAt: "2026-04-10T00:00:00.000Z" }),
      sig({ id: "b", occurredAt: "2026-04-08T00:00:00.000Z" }),
      sig({ id: "c", occurredAt: "2026-04-06T00:00:00.000Z" }),
      sig({ id: "d", occurredAt: "2026-04-04T00:00:00.000Z" }),
    ];
    expect(scoreAccountIntent("acct-1", signals, NOW).trend).toBe("cooling");
  });
});

describe("scoreAccountIntent — plays", () => {
  it("launch_outbound for hot rising account", () => {
    const signals: BuyingSignal[] = [
      sig({ id: "a", type: "funding_round", strength: 5, occurredAt: "2026-04-20T00:00:00.000Z" }),
      sig({ id: "b", type: "pricing_page_visit", strength: 5, occurredAt: "2026-04-21T00:00:00.000Z" }),
      sig({ id: "c", type: "competitor_comparison", strength: 5, occurredAt: "2026-04-21T00:00:00.000Z" }),
      sig({ id: "d", type: "inbound_form_fill", strength: 5, occurredAt: "2026-04-22T00:00:00.000Z" }),
    ];
    const r = scoreAccountIntent("acct-1", signals, NOW);
    expect(r.recommendedPlay).toBe("launch_outbound");
    expect(r.score).toBeGreaterThan(40);
  });

  it("cold_watch for empty feed", () => {
    const r = scoreAccountIntent("acct-1", [], NOW);
    expect(r.recommendedPlay).toBe("cold_watch");
    expect(r.score).toBe(0);
  });

  it("churn_alert when product usage dropping", () => {
    const signals: BuyingSignal[] = [
      sig({ id: "a", type: "product_usage_down", strength: 5, occurredAt: "2026-04-20T00:00:00.000Z" }),
      sig({ id: "b", type: "product_usage_down", strength: 4, occurredAt: "2026-04-18T00:00:00.000Z" }),
    ];
    const r = scoreAccountIntent("acct-1", signals, NOW);
    expect(r.recommendedPlay).toBe("churn_alert");
  });
});

describe("scoreAccountIntent — priority topic multiplier", () => {
  it("priority topic multiplies contribution", () => {
    const cfg = { ...DEFAULT_INTENT_CONFIG, priorityTopics: ["revenue operations"] };
    const priority = scoreAccountIntent(
      "acct-1",
      [sig({ id: "a", type: "web_research", topic: "revenue operations" })],
      NOW,
      cfg,
    );
    const neutral = scoreAccountIntent(
      "acct-1",
      [sig({ id: "a", type: "web_research", topic: "general" })],
      NOW,
      cfg,
    );
    expect(priority.raw).toBeGreaterThan(neutral.raw);
  });
});

describe("scoreAccountIntent — top signals + counts", () => {
  it("lists top 5 signals and counts per type", () => {
    const signals: BuyingSignal[] = [
      sig({ id: "a", type: "funding_round", strength: 5, occurredAt: "2026-04-21T00:00:00.000Z" }),
      sig({ id: "b", type: "pricing_page_visit", strength: 3, occurredAt: "2026-04-21T00:00:00.000Z" }),
      sig({ id: "c", type: "pricing_page_visit", strength: 4, occurredAt: "2026-04-22T00:00:00.000Z" }),
      sig({ id: "d", type: "web_research", strength: 2, occurredAt: "2026-04-22T00:00:00.000Z" }),
    ];
    const r = scoreAccountIntent("acct-1", signals, NOW);
    expect(r.topSignals.length).toBeLessThanOrEqual(5);
    expect(r.topSignals[0].type).toBe("funding_round");
    expect(r.signalCountsByType.pricing_page_visit).toBe(2);
  });
});

describe("scoreBookIntent", () => {
  it("aggregates per account and sorts descending", () => {
    const signals: BuyingSignal[] = [
      sig({ id: "a1", accountId: "hot", type: "funding_round", strength: 5, occurredAt: "2026-04-21T00:00:00.000Z" }),
      sig({ id: "a2", accountId: "hot", type: "pricing_page_visit", strength: 4, occurredAt: "2026-04-22T00:00:00.000Z" }),
      sig({ id: "b1", accountId: "warm", type: "web_research", strength: 2, occurredAt: "2026-04-20T00:00:00.000Z" }),
      sig({ id: "c1", accountId: "cold", type: "email_engagement", strength: 1, occurredAt: "2026-03-01T00:00:00.000Z" }),
    ];
    const scores = scoreBookIntent(signals, NOW);
    expect(scores.length).toBe(3);
    expect(scores[0].accountId).toBe("hot");
    expect(scores[0].score).toBeGreaterThan(scores[1].score);
  });
});

describe("detectSpikes", () => {
  it("reports accounts whose score jumped at least delta", () => {
    const prior = [
      { accountId: "a", score: 10, raw: 10, trend: "steady", topSignals: [], signalCountsByType: {}, recommendedPlay: "warm_watch", recentEventCount: 0, lastEventAt: null },
      { accountId: "b", score: 30, raw: 30, trend: "steady", topSignals: [], signalCountsByType: {}, recommendedPlay: "accelerate_sequence", recentEventCount: 0, lastEventAt: null },
    ] as ReturnType<typeof scoreAccountIntent>[];
    const current = [
      { accountId: "a", score: 55, raw: 55, trend: "rising", topSignals: [], signalCountsByType: {}, recommendedPlay: "launch_outbound", recentEventCount: 0, lastEventAt: null },
      { accountId: "b", score: 32, raw: 32, trend: "steady", topSignals: [], signalCountsByType: {}, recommendedPlay: "accelerate_sequence", recentEventCount: 0, lastEventAt: null },
    ] as ReturnType<typeof scoreAccountIntent>[];
    const spikes = detectSpikes(prior, current, 15);
    expect(spikes.length).toBe(1);
    expect(spikes[0].accountId).toBe("a");
    expect(spikes[0].delta).toBe(45);
  });
});
