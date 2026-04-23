/**
 * Phase 43 — Buying committee + stakeholder map.
 */

import { describe, it, expect } from "vitest";
import {
  mapBuyingCommittee,
  committeeReadiness,
  type Stakeholder,
} from "../src/lib/sales/buying-committee";

function person(over: Partial<Stakeholder>): Stakeholder {
  return {
    id: "p1",
    name: "Person One",
    title: "Director",
    role: "influencer",
    level: "director",
    disposition: "neutral",
    power: 0.5,
    interest: 0.5,
    lastTouchDaysAgo: 10,
    meetingsHeld: 1,
    ...over,
  };
}

const STRONG_COMMITTEE: Stakeholder[] = [
  person({
    id: "champ", name: "Jane Champion", title: "VP Sales", role: "champion",
    level: "vp", disposition: "advocate", power: 0.8, interest: 0.9,
    meetingsHeld: 4, isChampion: true, lastTouchDaysAgo: 3,
  }),
  person({
    id: "eb", name: "CEO Eve", title: "CEO", role: "economic_buyer",
    level: "cxo", disposition: "supporter", power: 1.0, interest: 0.6,
    meetingsHeld: 2, lastTouchDaysAgo: 14,
  }),
  person({
    id: "tb", name: "CTO Tim", title: "CTO", role: "technical_buyer",
    level: "cxo", disposition: "supporter", power: 0.7, interest: 0.8,
    meetingsHeld: 2, lastTouchDaysAgo: 10,
  }),
  person({
    id: "ub", name: "User Ursula", title: "RevOps Manager", role: "user_buyer",
    level: "manager", disposition: "advocate", power: 0.3, interest: 0.9,
    meetingsHeld: 3, lastTouchDaysAgo: 7,
  }),
  person({
    id: "pc", name: "Procurement Priya", title: "Procurement Lead", role: "procurement",
    level: "director", disposition: "neutral", power: 0.5, interest: 0.2,
    meetingsHeld: 1, lastTouchDaysAgo: 20,
  }),
  person({
    id: "lgl", name: "Legal Leo", title: "GC", role: "legal",
    level: "director", disposition: "neutral", power: 0.4, interest: 0.2,
    meetingsHeld: 1, lastTouchDaysAgo: 25,
  }),
];

describe("mapBuyingCommittee — strong committee", () => {
  it("reports strong champion, EB engaged, good coverage", () => {
    const c = mapBuyingCommittee(STRONG_COMMITTEE);
    expect(c.championStrength).toBeGreaterThan(0.6);
    expect(c.economicBuyerEngaged).toBe(true);
    expect(c.coverageScore).toBeGreaterThanOrEqual(0.8);
    expect(c.multiThreadScore).toBeGreaterThan(0.5);
  });

  it("no critical gaps on strong committee", () => {
    const c = mapBuyingCommittee(STRONG_COMMITTEE);
    expect(c.gaps.filter((g) => g.severity === "critical")).toEqual([]);
  });

  it("readiness verdict is 'ready' or 'progressing'", () => {
    const r = committeeReadiness(mapBuyingCommittee(STRONG_COMMITTEE));
    expect(["ready", "progressing"]).toContain(r.verdict);
    expect(r.score).toBeGreaterThan(55);
  });
});

describe("mapBuyingCommittee — weak committee", () => {
  it("single-thread committee flags critical gaps", () => {
    const c = mapBuyingCommittee([
      person({ id: "solo", name: "Solo", role: "user_buyer", level: "manager" }),
    ]);
    expect(c.gaps.some((g) => g.code === "single_thread")).toBe(true);
    expect(c.gaps.some((g) => g.code === "no_champion")).toBe(true);
    expect(c.gaps.some((g) => g.code === "no_economic_buyer")).toBe(true);
  });

  it("no champion → zero champion strength", () => {
    const c = mapBuyingCommittee([
      person({ id: "a", role: "user_buyer", disposition: "neutral" }),
      person({ id: "b", role: "economic_buyer", level: "cxo", disposition: "neutral" }),
    ]);
    expect(c.championStrength).toBe(0);
    expect(c.gaps.some((g) => g.code === "no_champion")).toBe(true);
  });
});

describe("mapBuyingCommittee — blocker management", () => {
  it("unmanaged blocker raises risk + flags gap", () => {
    const c = mapBuyingCommittee([
      ...STRONG_COMMITTEE,
      person({
        id: "block", name: "Skeptical CFO", title: "CFO", role: "blocker",
        level: "cxo", disposition: "opponent", power: 0.9, interest: 0.1,
        meetingsHeld: 0, lastTouchDaysAgo: null,
      }),
    ]);
    expect(c.blockerCount).toBe(1);
    expect(c.blockerRiskScore).toBeGreaterThan(0.5);
    expect(c.gaps.some((g) => g.code === "blocker_unmanaged")).toBe(true);
  });

  it("blocker with meetings halves risk", () => {
    const managed = mapBuyingCommittee([
      ...STRONG_COMMITTEE,
      person({
        id: "block", name: "Managed CFO", title: "CFO", role: "blocker",
        level: "cxo", disposition: "skeptic", power: 0.9, interest: 0.2,
        meetingsHeld: 2, lastTouchDaysAgo: 7,
      }),
    ]);
    const unmanaged = mapBuyingCommittee([
      ...STRONG_COMMITTEE,
      person({
        id: "block", name: "Unmanaged CFO", title: "CFO", role: "blocker",
        level: "cxo", disposition: "opponent", power: 0.9, interest: 0.1,
        meetingsHeld: 0, lastTouchDaysAgo: null,
      }),
    ]);
    expect(managed.blockerRiskScore).toBeLessThan(unmanaged.blockerRiskScore);
  });
});

describe("mapBuyingCommittee — quadrants", () => {
  it("places high-power+high-interest into power_players", () => {
    const c = mapBuyingCommittee(STRONG_COMMITTEE);
    expect(c.quadrants.power_players.some((p) => p.id === "champ")).toBe(true);
  });

  it("places high-power+low-interest into latent", () => {
    const c = mapBuyingCommittee([
      person({ id: "x", role: "economic_buyer", level: "cxo", power: 0.9, interest: 0.2 }),
    ]);
    expect(c.quadrants.latent.some((p) => p.id === "x")).toBe(true);
  });
});

describe("mapBuyingCommittee — champion disengaged", () => {
  it("flags when champion hasn't been engaged in 21+ days", () => {
    const c = mapBuyingCommittee([
      person({
        id: "old-champ", role: "champion", disposition: "advocate",
        isChampion: true, lastTouchDaysAgo: 45, meetingsHeld: 4,
        level: "vp", power: 0.8, interest: 0.9,
      }),
      person({ id: "eb", role: "economic_buyer", level: "cxo", lastTouchDaysAgo: 10, meetingsHeld: 2 }),
      person({ id: "ub", role: "user_buyer", level: "manager", lastTouchDaysAgo: 5, meetingsHeld: 1 }),
    ]);
    expect(c.gaps.some((g) => g.code === "champion_disengaged")).toBe(true);
  });
});

describe("mapBuyingCommittee — next-best-actions", () => {
  it("returns at most 5 ranked actions", () => {
    const c = mapBuyingCommittee(STRONG_COMMITTEE);
    expect(c.nextBestActions.length).toBeLessThanOrEqual(5);
    expect(c.nextBestActions.length).toBeGreaterThan(0);
  });
});

describe("committeeReadiness", () => {
  it("unready when critical gaps exist", () => {
    const r = committeeReadiness(mapBuyingCommittee([
      person({ id: "solo", role: "user_buyer", level: "manager" }),
    ]));
    expect(r.verdict).toBe("unready");
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("ready when all signals strong", () => {
    const ultraStrong = STRONG_COMMITTEE.map((s) => ({ ...s, meetingsHeld: 4, lastTouchDaysAgo: 3 }));
    const r = committeeReadiness(mapBuyingCommittee(ultraStrong));
    expect(["ready", "progressing"]).toContain(r.verdict);
  });
});
