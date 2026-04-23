import { describe, it, expect } from "vitest";
import {
  extractCommitmentsFromText,
  extractCommitmentsFromUtterances,
  extractWhen,
  extractAmountUsd,
} from "../src/lib/voice/commitment-extraction";

describe("commitment-extraction — extractAmountUsd", () => {
  it("parses '$99/mo' style", () => {
    expect(extractAmountUsd("It's $99/mo billed annually")).toBe(99);
  });
  it("parses '$1,250'", () => {
    expect(extractAmountUsd("The total is $1,250 total")).toBe(1250);
  });
  it("parses '$15k' with k multiplier", () => {
    expect(extractAmountUsd("Budget is around $15k")).toBe(15000);
  });
  it("parses '250 bucks'", () => {
    expect(extractAmountUsd("It's 250 bucks a month")).toBe(250);
  });
  it("parses 'fifteen hundred dollars'", () => {
    expect(extractAmountUsd("Fifteen hundred dollars upfront")).toBe(1500);
  });
  it("returns null when no amount present", () => {
    expect(extractAmountUsd("We'll follow up later")).toBeNull();
  });
});

describe("commitment-extraction — extractWhen", () => {
  const anchor = new Date("2026-04-22T12:00:00.000Z"); // Wednesday

  it("recognises 'tomorrow'", () => {
    const w = extractWhen("I'll call you tomorrow", anchor);
    expect(w.phrase).toBe("tomorrow");
    expect(w.iso).not.toBeNull();
  });
  it("recognises 'end of week'", () => {
    const w = extractWhen("I'll have it by end of the week", anchor);
    expect(w.phrase).toContain("end of week");
    expect(w.iso).not.toBeNull();
  });
  it("recognises 'next Tuesday'", () => {
    const w = extractWhen("let's meet next Tuesday", anchor);
    expect(w.phrase).toMatch(/tues/i);
    expect(w.iso).not.toBeNull();
  });
  it("recognises 'March 15'", () => {
    const w = extractWhen("I'll send it March 15", anchor);
    expect(w.phrase).toMatch(/march 15/i);
    expect(w.iso).not.toBeNull();
  });
  it("returns null when no date phrase", () => {
    const w = extractWhen("just a generic sentence", anchor);
    expect(w.phrase).toBeNull();
    expect(w.iso).toBeNull();
  });
});

describe("commitment-extraction — extractCommitmentsFromText", () => {
  const anchor = new Date("2026-04-22T12:00:00.000Z");

  it("extracts an info_send with a when-clause", () => {
    const commits = extractCommitmentsFromText(
      "I'll send you the pricing tomorrow.",
      "agent",
      anchor,
    );
    expect(commits.length).toBeGreaterThan(0);
    const info = commits.find((c) => c.type === "info_send");
    expect(info).toBeDefined();
    expect(info?.whenPhrase).toBe("tomorrow");
    expect(info?.whenIso).not.toBeNull();
  });

  it("extracts a document_send commitment", () => {
    const commits = extractCommitmentsFromText(
      "I'll email you the contract later today.",
      "agent",
      anchor,
    );
    expect(commits.some((c) => c.type === "document_send")).toBe(true);
  });

  it("extracts an appointment commitment", () => {
    const commits = extractCommitmentsFromText(
      "Let's schedule a demo next Tuesday.",
      "agent",
      anchor,
    );
    expect(commits.some((c) => c.type === "appointment")).toBe(true);
  });

  it("only emits price_quote when an amount is present", () => {
    const withAmount = extractCommitmentsFromText(
      "Our pricing is $99/month for the base tier.",
      "agent",
      anchor,
    );
    const withoutAmount = extractCommitmentsFromText(
      "Our pricing comes in at a premium",
      "agent",
      anchor,
    );
    expect(withAmount.some((c) => c.type === "price_quote")).toBe(true);
    expect(withoutAmount.some((c) => c.type === "price_quote")).toBe(false);
  });

  it("caller-side: extracts payment promise", () => {
    const commits = extractCommitmentsFromText(
      "I'll pay you $500 by Friday.",
      "caller",
      anchor,
    );
    expect(commits.some((c) => c.type === "payment")).toBe(true);
  });
});

describe("commitment-extraction — extractCommitmentsFromUtterances", () => {
  it("preserves speaker attribution", () => {
    const commits = extractCommitmentsFromUtterances([
      { speaker: "agent", text: "I'll send you the pricing tomorrow." },
      { speaker: "caller", text: "I'll call you back later." },
    ]);
    const agentCommit = commits.find((c) => c.speaker === "agent");
    const callerCommit = commits.find((c) => c.speaker === "caller");
    expect(agentCommit).toBeDefined();
    expect(callerCommit).toBeDefined();
  });
});
