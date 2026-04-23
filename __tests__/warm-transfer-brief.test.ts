import { describe, it, expect } from "vitest";
import {
  buildWarmTransferBrief,
  renderBriefAsText,
  renderBriefAsWhisper,
  type TransferContext,
} from "../src/lib/voice/warm-transfer-brief";

function baseCtx(overrides: Partial<TransferContext> = {}): TransferContext {
  return {
    caller: { name: "Alex Smith", company: "Acme Co", phone: "+15555550123", email: null },
    intent: "inbound sales inquiry",
    callStartedAt: new Date().toISOString(),
    callDurationSeconds: 240,
    stage: "discovery",
    sentiment: "interested",
    objections: [],
    commitments: [],
    qualifyingFacts: [],
    reasonForTransfer: "caller asked for a human",
    ...overrides,
  };
}

describe("warm-transfer-brief — buildWarmTransferBrief", () => {
  it("includes caller + company + intent in headline", () => {
    const b = buildWarmTransferBrief(baseCtx());
    expect(b.headline).toContain("Alex Smith");
    expect(b.headline).toContain("Acme Co");
    expect(b.headline).toContain("inbound sales inquiry");
  });

  it("only surfaces unhandled objections", () => {
    const b = buildWarmTransferBrief(
      baseCtx({
        objections: [
          { type: "price", summary: "too expensive", handled: false },
          { type: "timing", summary: "next quarter", handled: true },
        ],
      }),
    );
    expect(b.openObjections).toHaveLength(1);
    expect(b.openObjections[0]).toContain("price");
  });

  it("surfaces open commitments (up to 3)", () => {
    const b = buildWarmTransferBrief(
      baseCtx({
        commitments: [
          { type: "send_info", description: "pricing deck", dueBy: "2026-04-25T12:00:00.000Z" },
          { type: "call_back", description: "follow-up call" },
          { type: "send_info", description: "case study" },
          { type: "send_info", description: "ignored 4th" },
        ],
      }),
    );
    expect(b.openCommitments).toHaveLength(3);
    expect(b.openCommitments[0]).toContain("pricing deck");
    expect(b.openCommitments[0]).toContain("2026-04-25");
  });

  it("adds a warning when caller is frustrated and uses empathetic opener", () => {
    const b = buildWarmTransferBrief(baseCtx({ sentiment: "frustrated" }));
    expect(b.warnings.some((w) => /frustrated/i.test(w))).toBe(true);
    expect(b.recommendedOpeningLine).toMatch(/I hear you/i);
  });

  it("flags missing caller name", () => {
    const b = buildWarmTransferBrief(
      baseCtx({ caller: { name: null, company: null, phone: null, email: null } }),
    );
    expect(b.warnings.some((w) => /name unknown/i.test(w))).toBe(true);
  });

  it("flags long calls", () => {
    const b = buildWarmTransferBrief(baseCtx({ callDurationSeconds: 900 }));
    expect(b.warnings.some((w) => /long/i.test(w))).toBe(true);
  });

  it("caps mustKnow at 5", () => {
    const b = buildWarmTransferBrief(
      baseCtx({ qualifyingFacts: ["a", "b", "c", "d", "e", "f", "g"] }),
    );
    expect(b.mustKnow).toHaveLength(5);
  });
});

describe("warm-transfer-brief — render helpers", () => {
  it("renderBriefAsText includes headline + opener section", () => {
    const text = renderBriefAsText(buildWarmTransferBrief(baseCtx()));
    expect(text).toContain("ALEX SMITH");
    expect(text).toContain("OPEN WITH:");
  });

  it("renderBriefAsWhisper is a compact single line joined with periods", () => {
    const whisper = renderBriefAsWhisper(buildWarmTransferBrief(baseCtx()));
    expect(whisper).toContain("open with:");
    expect(whisper.length).toBeLessThan(600);
  });
});
