/**
 * Phase 34 — Talk-to-listen ratio + monologue detector.
 */

import { describe, it, expect } from "vitest";
import {
  analyzeTalkRatio,
  type TimedTurn,
} from "../src/lib/sales/talk-ratio-analyzer";

function rep(startMs: number, endMs: number, text: string): TimedTurn {
  return { speaker: "rep", startMs, endMs, text };
}
function prospect(startMs: number, endMs: number, text: string): TimedTurn {
  return { speaker: "prospect", startMs, endMs, text };
}

describe("analyzeTalkRatio — discovery balance", () => {
  it("flags rep_overspeaking when rep dominates discovery", () => {
    const turns = [
      rep(0, 300_000, "Let me tell you all about what we do. We build software. It's great. " +
        "We have customers. They love us. Here's what we do. Here's why. Here's how."),
      prospect(300_000, 310_000, "Ok."),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.flags.some((f) => f.code === "rep_overspeaking")).toBe(true);
    expect(r.repTalkShare).toBeGreaterThan(0.9);
  });

  it("does not flag overspeak when rep stays in 35-50% band", () => {
    const turns = [
      rep(0, 60_000, "Tell me about your current setup?"),
      prospect(60_000, 180_000, "We use a spreadsheet and it is painful because of all the manual work"),
      rep(180_000, 240_000, "What have you tried before?"),
      prospect(240_000, 350_000, "We tried two tools but they did not stick"),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.flags.some((f) => f.code === "rep_overspeaking")).toBe(false);
    expect(r.repTalkShare).toBeLessThanOrEqual(0.5);
  });
});

describe("analyzeTalkRatio — question counting", () => {
  it("detects '?' endings and wh- starts", () => {
    const turns = [
      rep(0, 5_000, "How does your current workflow look?"),
      prospect(5_000, 15_000, "we do it manually"),
      rep(15_000, 25_000, "What happens when it fails"),
      prospect(25_000, 35_000, "things break"),
      rep(35_000, 45_000, "Tell me about the last outage"),
      prospect(45_000, 55_000, "last week it was bad"),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.rep.questionCount).toBe(3);
  });

  it("flags too_few_questions below threshold", () => {
    const turns = [
      rep(0, 30_000, "So here is our platform and it is great."),
      prospect(30_000, 60_000, "Ok tell me more please"),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.flags.some((f) => f.code === "too_few_questions")).toBe(true);
  });
});

describe("analyzeTalkRatio — monologue detection", () => {
  it("flags rep_monologue when a turn exceeds stage max", () => {
    const longText = "word ".repeat(400);
    const turns = [
      rep(0, 120_000, longText), // 120s monologue on discovery (max 90)
      prospect(120_000, 180_000, "ok"),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.flags.some((f) => f.code === "rep_monologue")).toBe(true);
    expect(r.rep.longestMonologueSeconds).toBe(120);
  });
});

describe("analyzeTalkRatio — filler density", () => {
  it("counts um/uh/like as fillers", () => {
    const turns = [
      rep(0, 10_000, "um so like basically uh we do stuff"),
      prospect(10_000, 20_000, "ok"),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.rep.fillerCount).toBeGreaterThanOrEqual(4);
  });

  it("flags filler_density_high when above 8%", () => {
    const turns = [
      rep(0, 10_000, "um uh like so um uh like so um uh word word word"),
      prospect(10_000, 20_000, "ok"),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.flags.some((f) => f.code === "filler_density_high")).toBe(true);
  });
});

describe("analyzeTalkRatio — interruption detection", () => {
  it("counts rep interruptions when rep turn starts before prospect ended", () => {
    const turns = [
      prospect(0, 10_000, "I was going to say that we"),
      rep(7_000, 12_000, "right yeah totally"), // started 3s before prospect ended
      prospect(12_000, 20_000, "continuing the thought now"),
      rep(18_000, 25_000, "got it"), // again early
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.rep.interruptions).toBe(2);
  });
});

describe("analyzeTalkRatio — demo stage uses different targets", () => {
  it("allows higher rep share on demo", () => {
    const turns = [
      rep(0, 180_000, "Let me walk through the product."),
      prospect(180_000, 210_000, "Looks good."),
    ];
    const r = analyzeTalkRatio(turns, "demo");
    // 180/210 = 85.7% — above demo max 70% → flag
    expect(r.flags.some((f) => f.code === "rep_overspeaking")).toBe(true);

    // Bring it to 60-65% band
    const balanced = [
      rep(0, 120_000, "Walk-through what are your thoughts"),
      prospect(120_000, 180_000, "It looks good and we like the approach"),
      rep(180_000, 240_000, "Here is how we integrate"),
      prospect(240_000, 300_000, "Ok that works for us"),
    ];
    const r2 = analyzeTalkRatio(balanced, "demo");
    expect(r2.flags.some((f) => f.code === "rep_overspeaking")).toBe(false);
  });
});

describe("analyzeTalkRatio — balanced output", () => {
  it("reports balanced=true when no warnings/criticals", () => {
    const turns = [
      rep(0, 70_000, "What prompted you to look at solutions now and what has changed this quarter?"),
      prospect(70_000, 178_000, "We have had a really bad year of manual reporting and the team is burned out"),
      rep(178_000, 248_000, "Where do you feel the biggest pain today and who is it impacting most?"),
      prospect(248_000, 356_000, "It is the month-end close process and the amount of manual reconciliation"),
      rep(356_000, 426_000, "How is that impacting the team and what have you tried so far?"),
      prospect(426_000, 534_000, "Two people left this quarter and we had to hire replacements and train them"),
    ];
    const r = analyzeTalkRatio(turns, "discovery");
    expect(r.balanced).toBe(true);
    expect(r.flags.filter((f) => f.severity !== "info")).toEqual([]);
  });
});
