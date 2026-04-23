import { describe, it, expect } from "vitest";
import {
  detectCompetitorMention,
  resolveBattlecard,
  validateBattlecards,
  type CompetitorBattlecard,
} from "../src/lib/voice/real-time-battlecards";

const hubspot: CompetitorBattlecard = {
  id: "bc-hubspot",
  competitorName: "HubSpot",
  aliases: ["hub spot", "hubspot crm"],
  counterLine:
    "HubSpot is great for marketing — our edge is end-to-end revenue operations in one place.",
  proofPoints: [
    "Avg 3x faster response than HubSpot workflows.",
    "Native phone + sms in one bill.",
  ],
  concession: "HubSpot has a broader marketing hub",
  avoid: ["Don't bash their pricing directly."],
};

describe("real-time-battlecards — detectCompetitorMention", () => {
  it("detects competitor name with word boundaries", () => {
    const d = detectCompetitorMention("We already use HubSpot today.", [hubspot]);
    expect(d.mentioned).toBe(true);
    expect(d.competitorName).toBe("HubSpot");
    expect(d.battlecardId).toBe("bc-hubspot");
  });

  it("detects via alias", () => {
    const d = detectCompetitorMention("We bought hub spot last year.", [hubspot]);
    expect(d.mentioned).toBe(true);
    expect(d.battlecardId).toBe("bc-hubspot");
  });

  it("does NOT match substring inside another word", () => {
    const d = detectCompetitorMention("I love HubSpotters as a brand.", [hubspot]);
    expect(d.mentioned).toBe(false);
  });

  it("returns mentioned=false when no battlecards provided", () => {
    const d = detectCompetitorMention("Anything here", []);
    expect(d.mentioned).toBe(false);
  });

  it("empty transcript → mentioned=false", () => {
    const d = detectCompetitorMention("", [hubspot]);
    expect(d.mentioned).toBe(false);
  });
});

describe("real-time-battlecards — resolveBattlecard", () => {
  it("emits agentLine, whisperLine, proofPoints on match", () => {
    const r = resolveBattlecard("We've been evaluating HubSpot vs you.", [hubspot]);
    expect(r.detection.mentioned).toBe(true);
    expect(r.agentLine).toBe(hubspot.counterLine);
    expect(r.whisperLine).toContain("HubSpot");
    expect(r.proofPoints).toHaveLength(2);
    expect(r.concession).toBe(hubspot.concession);
  });

  it("returns nulls on no match", () => {
    const r = resolveBattlecard("We use an in-house system.", [hubspot]);
    expect(r.detection.mentioned).toBe(false);
    expect(r.agentLine).toBeNull();
    expect(r.whisperLine).toBeNull();
    expect(r.proofPoints).toHaveLength(0);
  });
});

describe("real-time-battlecards — validateBattlecards", () => {
  it("valid card passes", () => {
    const r = validateBattlecards([hubspot]);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("catches missing id", () => {
    const bad: CompetitorBattlecard = { ...hubspot, id: "" };
    const r = validateBattlecards([bad]);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "id")).toBe(true);
  });

  it("catches duplicate ids", () => {
    const r = validateBattlecards([hubspot, { ...hubspot }]);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.message === "duplicate id")).toBe(true);
  });

  it("catches too-short counter lines", () => {
    const bad: CompetitorBattlecard = { ...hubspot, id: "bc-bad", counterLine: "too short" };
    const r = validateBattlecards([bad]);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "counterLine")).toBe(true);
  });
});
