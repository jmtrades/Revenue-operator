import { describe, it, expect } from "vitest";
import {
  assessBuyingCommittee,
  summariseCommittee,
  type Deal,
  type Stakeholder,
} from "../src/lib/sales/champion-tracker";

const now = new Date("2026-04-22T12:00:00.000Z");
const NOW_ISO = now.toISOString();
const dayAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function champion(overrides: Partial<Stakeholder> = {}): Stakeholder {
  return {
    id: "s-1",
    fullName: "Jamie Doe",
    title: "VP Ops",
    email: "jamie@example.com",
    phone: null,
    role: "champion",
    engagementScore: 0.8,
    engagementTrend: "steady",
    lastActivityAt: dayAgo(2),
    ...overrides,
  };
}

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    name: "Acme – Q2",
    amountUsd: 25_000,
    closeDateIso: "2026-06-30",
    ageDays: 21,
    stage: "evaluation",
    ...overrides,
  };
}

describe("champion-tracker — assessBuyingCommittee", () => {
  it("single-threaded champion triggers both single_threaded and over_dependent risks", () => {
    const r = assessBuyingCommittee(deal(), [champion()], NOW_ISO);
    expect(r.activeStakeholders).toBe(1);
    const types = r.risks.map((x) => x.type);
    expect(types).toContain("single_threaded");
    expect(types).toContain("champion_over_dependent");
  });

  it("champion with linkedin_job_change and silent → champion_left critical", () => {
    const c = champion({
      engagementTrend: "silent",
      lastActivityAt: dayAgo(60),
      signals: ["linkedin_job_change"],
    });
    const r = assessBuyingCommittee(deal(), [c], NOW_ISO);
    const left = r.risks.find((x) => x.type === "champion_left");
    expect(left).toBeDefined();
    expect(left?.severity).toBe("critical");
  });

  it("silent (stale) champion with no departure signals → champion_silent warning", () => {
    const c = champion({ engagementTrend: "cooling", lastActivityAt: dayAgo(40) });
    const r = assessBuyingCommittee(deal(), [c], NOW_ISO);
    const silent = r.risks.find((x) => x.type === "champion_silent");
    expect(silent).toBeDefined();
  });

  it("deal > 14 days old and no economic_buyer → no_economic_buyer risk", () => {
    const r = assessBuyingCommittee(deal({ ageDays: 20 }), [champion()], NOW_ISO);
    expect(r.risks.some((x) => x.type === "no_economic_buyer")).toBe(true);
  });

  it("amount > 10k with no technical evaluator → no_technical_buyer info risk", () => {
    const r = assessBuyingCommittee(deal({ amountUsd: 20_000 }), [champion()], NOW_ISO);
    expect(r.risks.some((x) => x.type === "no_technical_buyer")).toBe(true);
  });

  it("blocker dominant when blockers ≥ champions", () => {
    const blocker: Stakeholder = {
      id: "s-2",
      fullName: "Pat Hater",
      title: "Head of Security",
      email: null,
      phone: null,
      role: "blocker",
      engagementScore: 0.6,
      engagementTrend: "steady",
      lastActivityAt: dayAgo(1),
    };
    const r = assessBuyingCommittee(deal(), [blocker], NOW_ISO);
    expect(r.risks.some((x) => x.type === "blocker_dominant")).toBe(true);
  });

  it("multi-threading score scales with role diversity", () => {
    const econ: Stakeholder = {
      id: "s-3",
      fullName: "Ev Buyer",
      title: "CFO",
      email: null,
      phone: null,
      role: "economic_buyer",
      engagementScore: 0.7,
      engagementTrend: "rising",
      lastActivityAt: dayAgo(3),
    };
    const tech: Stakeholder = {
      id: "s-4",
      fullName: "Tessa Tech",
      title: "VP Eng",
      email: null,
      phone: null,
      role: "technical_evaluator",
      engagementScore: 0.6,
      engagementTrend: "steady",
      lastActivityAt: dayAgo(4),
    };
    const soloR = assessBuyingCommittee(deal(), [champion()], NOW_ISO);
    const multiR = assessBuyingCommittee(deal(), [champion(), econ, tech], NOW_ISO);
    expect(multiR.multiThreadingScore).toBeGreaterThan(soloR.multiThreadingScore);
  });

  it("emits recommendedPlays aligned to risks", () => {
    const r = assessBuyingCommittee(deal(), [champion()], NOW_ISO);
    expect(r.recommendedPlays.length).toBeGreaterThan(0);
    for (const play of r.recommendedPlays) {
      expect(play.suggestedAction).toBeTruthy();
      expect(play.talkTrack).toBeTruthy();
    }
  });
});

describe("champion-tracker — summariseCommittee", () => {
  it("produces a one-line summary", () => {
    const r = assessBuyingCommittee(deal(), [champion()], NOW_ISO);
    const s = summariseCommittee(r);
    expect(s).toContain("active");
    expect(s).toContain("multi-thread");
  });
});
