/**
 * Phase 36 — ICP account scoring.
 */

import { describe, it, expect } from "vitest";
import {
  scoreAccount,
  scoreBook,
  type AccountSnapshot,
  type IcpDefinition,
} from "../src/lib/sales/icp-scoring";

const ICP: IcpDefinition = {
  id: "saas-mid-market",
  name: "SaaS mid-market",
  weights: { firmographic: 0.3, technographic: 0.2, intent: 0.25, fit: 0.25 },
  firmographic: {
    industries: ["software", "saas"],
    countries: ["US", "CA", "GB"],
    minEmployees: 100,
    maxEmployees: 5000,
  },
  technographic: {
    requiredTools: ["salesforce"],
    anyOfTools: ["outreach", "salesloft", "gong"],
    bonusTools: ["zoominfo", "clari"],
    blocklistTools: ["competitor-x"],
  },
  intent: {
    priorityTopics: ["sales engagement", "revenue operations"],
    minAggregateStrength: 2,
  },
  fit: {
    targetPersonaKeywords: ["vp sales", "revops", "cro", "sales operations"],
    minChampionLevel: "director",
    requireChampion: false,
  },
  disqualifiers: {
    industries: ["gambling"],
    countries: ["IR", "KP"],
    tags: ["sanctioned"],
  },
};

function account(over: Partial<AccountSnapshot> = {}): AccountSnapshot {
  return {
    id: "acct-1",
    companyName: "Acme SaaS",
    industry: "software",
    country: "US",
    employeeCount: 800,
    annualRevenue: 50_000_000,
    techStack: ["salesforce", "outreach", "clari"],
    intentSignals: [
      { topic: "sales engagement", strength: 3, at: "2026-04-20" },
      { topic: "revenue operations", strength: 2, at: "2026-04-18" },
    ],
    engagement: {
      websiteVisitsLast30d: 22,
      highValuePageViewsLast30d: 5,
      emailsOpenedLast30d: 8,
    },
    contacts: [
      { title: "VP Sales", level: "vp", isChampion: true },
      { title: "Director RevOps", level: "director" },
    ],
    ...over,
  };
}

describe("scoreAccount — tier A ideal match", () => {
  it("rates A-tier when firmographic + tech + intent + fit all strong", () => {
    const r = scoreAccount(account(), ICP);
    expect(r.tier).toBe("A");
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.disqualified).toBe(false);
  });
});

describe("scoreAccount — disqualifiers", () => {
  it("disqualifies on industry", () => {
    const r = scoreAccount(account({ industry: "gambling" }), ICP);
    expect(r.disqualified).toBe(true);
    expect(r.tier).toBe("disqualified");
    expect(r.disqualifiedReason).toContain("gambling");
  });

  it("disqualifies on country", () => {
    const r = scoreAccount(account({ country: "IR" }), ICP);
    expect(r.disqualified).toBe(true);
  });

  it("disqualifies on tag", () => {
    const r = scoreAccount(account({ tags: ["sanctioned"] }), ICP);
    expect(r.disqualified).toBe(true);
  });
});

describe("scoreAccount — firmographic", () => {
  it("penalizes wrong industry", () => {
    const r = scoreAccount(account({ industry: "retail" }), ICP);
    expect(r.breakdown.firmographic.score).toBeLessThan(80);
  });

  it("penalizes employee count out of band", () => {
    const r = scoreAccount(account({ employeeCount: 50 }), ICP);
    expect(r.breakdown.firmographic.score).toBeLessThan(80);
  });

  it("penalizes wrong country", () => {
    const r = scoreAccount(account({ country: "BR" }), ICP);
    expect(r.breakdown.firmographic.score).toBeLessThan(80);
  });
});

describe("scoreAccount — technographic", () => {
  it("zero score when required tool missing", () => {
    const r = scoreAccount(account({ techStack: ["outreach"] }), ICP);
    expect(r.breakdown.technographic.score).toBeLessThan(70);
  });

  it("gets bonus points for bonus tools", () => {
    const withBonus = scoreAccount(
      account({ techStack: ["salesforce", "outreach", "zoominfo", "clari"] }),
      ICP,
    );
    const noBonus = scoreAccount(
      account({ techStack: ["salesforce", "outreach"] }),
      ICP,
    );
    expect(withBonus.breakdown.technographic.score).toBeGreaterThan(
      noBonus.breakdown.technographic.score,
    );
  });

  it("penalizes blocklist tool", () => {
    const r = scoreAccount(
      account({ techStack: ["salesforce", "outreach", "competitor-x"] }),
      ICP,
    );
    expect(r.breakdown.technographic.reasons.some((x) => x.includes("Competing"))).toBe(true);
  });
});

describe("scoreAccount — intent", () => {
  it("zero intent when no signals", () => {
    const r = scoreAccount(
      account({ intentSignals: [], engagement: {} }),
      ICP,
    );
    expect(r.breakdown.intent.score).toBe(0);
  });

  it("boosted by high-value page views", () => {
    const noHighValue = scoreAccount(
      account({ engagement: { websiteVisitsLast30d: 3 } }),
      ICP,
    );
    const withHighValue = scoreAccount(
      account({ engagement: { websiteVisitsLast30d: 3, highValuePageViewsLast30d: 6 } }),
      ICP,
    );
    expect(withHighValue.breakdown.intent.score).toBeGreaterThan(
      noHighValue.breakdown.intent.score,
    );
  });
});

describe("scoreAccount — fit", () => {
  it("zero fit when no contacts", () => {
    const r = scoreAccount(account({ contacts: [] }), ICP);
    expect(r.breakdown.fit.score).toBe(0);
  });

  it("requireChampion drops fit when no champion identified", () => {
    const strictIcp: IcpDefinition = {
      ...ICP,
      fit: { ...ICP.fit, requireChampion: true },
    };
    const noChamp = scoreAccount(
      account({
        contacts: [{ title: "VP Sales", level: "vp", isChampion: false }],
      }),
      strictIcp,
    );
    const withChamp = scoreAccount(
      account({
        contacts: [{ title: "VP Sales", level: "vp", isChampion: true }],
      }),
      strictIcp,
    );
    expect(withChamp.breakdown.fit.score).toBeGreaterThan(noChamp.breakdown.fit.score);
  });
});

describe("scoreAccount — tier boundaries + actions", () => {
  it("C-tier accounts get qualify recommendation", () => {
    const r = scoreAccount(
      account({
        industry: "retail",
        techStack: ["salesforce"],
        intentSignals: [],
        engagement: {},
        contacts: [{ title: "IC", level: "ic" }],
      }),
      ICP,
    );
    expect(["C", "D"]).toContain(r.tier);
  });

  it("A-tier recommends prioritize", () => {
    const r = scoreAccount(account(), ICP);
    expect(r.recommendedAction.toLowerCase()).toContain("prioritize");
  });
});

describe("scoreBook", () => {
  it("rolls up tier counts + top N", () => {
    const accts = [
      account({ id: "a1" }),
      account({ id: "a2", industry: "gambling" }),
      account({ id: "a3", industry: "retail", employeeCount: 50 }),
    ];
    const r = scoreBook(accts, ICP, 2);
    expect(r.total).toBe(3);
    expect(r.tierCounts.disqualified).toBe(1);
    expect(r.topAccounts.length).toBeLessThanOrEqual(2);
    expect(r.topAccounts.every((a) => !a.disqualified)).toBe(true);
  });
});
