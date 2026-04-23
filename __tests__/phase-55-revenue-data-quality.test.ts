/**
 * Phase 55 — Revenue data quality monitor.
 */
import { describe, it, expect } from "vitest";
import {
  scanRevenueDataQuality,
  type DealSnapshot,
  type AccountSnapshot,
  type ContactSnapshot,
} from "../src/lib/sales/revenue-data-quality";

const AS_OF = "2026-04-22T00:00:00.000Z";

function deal(over: Partial<DealSnapshot> = {}): DealSnapshot {
  return {
    dealId: "d1",
    accountId: "acc1",
    ownerId: "rep1",
    stage: "discovery",
    amount: 50_000,
    currency: "USD",
    closeDateIso: "2026-06-30T00:00:00.000Z",
    createdAtIso: "2026-03-01T00:00:00.000Z",
    lastModifiedIso: "2026-04-15T00:00:00.000Z",
    nextStep: "Share mutual action plan",
    nextStepDueIso: "2026-04-29T00:00:00.000Z",
    lastActivityIso: "2026-04-18T00:00:00.000Z",
    ...over,
  };
}

function account(over: Partial<AccountSnapshot> = {}): AccountSnapshot {
  return {
    accountId: "acc1",
    name: "Acme Inc",
    ownerId: "rep1",
    domain: "acme.com",
    createdAtIso: "2025-01-10T00:00:00.000Z",
    hasPrimaryContact: true,
    ...over,
  };
}

function contact(over: Partial<ContactSnapshot> = {}): ContactSnapshot {
  return {
    contactId: "c1",
    accountId: "acc1",
    email: "buyer@acme.com",
    phone: "+15551234567",
    title: "VP Sales",
    ...over,
  };
}

describe("scanRevenueDataQuality — clean data", () => {
  it("clean dataset yields high score", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal()],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.overallScore).toBeGreaterThanOrEqual(90);
    expect(rep.grade).toBe("A");
  });
});

describe("scanRevenueDataQuality — missing_next_step", () => {
  it("flags deals without next step", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ nextStep: undefined })],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.issues.some((i) => i.category === "missing_next_step")).toBe(true);
  });

  it("critical severity when in negotiation stage", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ nextStep: undefined, stage: "negotiation" })],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(
      rep.issues.find((i) => i.category === "missing_next_step")?.severity,
    ).toBe("critical");
  });
});

describe("scanRevenueDataQuality — amount issues", () => {
  it("flags missing amount", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ amount: undefined })],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.issues.some((i) => i.category === "missing_amount")).toBe(true);
  });

  it("flags stale amount when modification is old", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ lastModifiedIso: "2026-01-01T00:00:00.000Z" })],
      accounts: [account()],
      contacts: [contact()],
      stalenessDays: 21,
    });
    expect(rep.issues.some((i) => i.category === "stale_amount")).toBe(true);
  });
});

describe("scanRevenueDataQuality — close date", () => {
  it("flags overdue close date as critical", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ closeDateIso: "2026-03-01T00:00:00.000Z" })],
      accounts: [account()],
      contacts: [contact()],
    });
    const issue = rep.issues.find((i) => i.category === "overdue_close_date");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("critical");
  });
});

describe("scanRevenueDataQuality — stage skip", () => {
  it("flags skip of 2+ stages", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [
        deal({
          stageHistory: [
            { stage: "prospecting", enteredIso: "2026-03-01T00:00:00.000Z" },
            { stage: "proposal", enteredIso: "2026-03-10T00:00:00.000Z" },
          ],
        }),
      ],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.issues.some((i) => i.category === "stage_skip")).toBe(true);
  });

  it("does not flag single-stage progression", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [
        deal({
          stageHistory: [
            { stage: "prospecting", enteredIso: "2026-03-01T00:00:00.000Z" },
            { stage: "qualification", enteredIso: "2026-03-10T00:00:00.000Z" },
          ],
        }),
      ],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.issues.some((i) => i.category === "stage_skip")).toBe(false);
  });
});

describe("scanRevenueDataQuality — orphaned and missing contact", () => {
  it("flags orphaned deal when account missing", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ accountId: "ghost" })],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.issues.some((i) => i.category === "orphaned_deal")).toBe(true);
  });

  it("flags missing primary contact", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal()],
      accounts: [account({ hasPrimaryContact: false })],
      contacts: [contact()],
    });
    expect(rep.issues.some((i) => i.category === "missing_contact")).toBe(true);
  });
});

describe("scanRevenueDataQuality — inactivity", () => {
  it("flags deal with no activity past window", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ lastActivityIso: "2026-03-01T00:00:00.000Z" })],
      accounts: [account()],
      contacts: [contact()],
      activityLookbackDays: 14,
    });
    expect(rep.issues.some((i) => i.category === "inactive_deal")).toBe(true);
  });
});

describe("scanRevenueDataQuality — duplicates", () => {
  it("flags duplicate accounts sharing a domain", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [],
      accounts: [
        account({ accountId: "acc1" }),
        account({ accountId: "acc2", name: "Acme Co" }),
      ],
      contacts: [],
    });
    expect(rep.issues.some((i) => i.category === "duplicate_account")).toBe(true);
  });

  it("flags duplicate contact emails", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [],
      accounts: [account()],
      contacts: [
        contact({ contactId: "c1" }),
        contact({ contactId: "c2" }),
      ],
    });
    expect(rep.issues.some((i) => i.category === "duplicate_contact")).toBe(true);
  });

  it("flags contact with neither email nor phone", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [],
      accounts: [account()],
      contacts: [contact({ email: undefined, phone: undefined })],
    });
    expect(rep.issues.some((i) => i.category === "unreachable_contact")).toBe(true);
  });
});

describe("scanRevenueDataQuality — account hygiene", () => {
  it("flags missing owner", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [],
      accounts: [account({ ownerId: undefined })],
      contacts: [],
    });
    expect(rep.issues.some((i) => i.category === "missing_owner")).toBe(true);
  });

  it("flags missing domain at info severity", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [],
      accounts: [account({ domain: undefined })],
      contacts: [],
    });
    const issue = rep.issues.find((i) => i.category === "missing_domain");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("info");
  });
});

describe("scanRevenueDataQuality — currency", () => {
  it("flags account with mixed currency deals", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [
        deal({ dealId: "d1", currency: "USD" }),
        deal({ dealId: "d2", currency: "EUR" }),
      ],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.issues.some((i) => i.category === "currency_inconsistency")).toBe(true);
  });
});

describe("scanRevenueDataQuality — owner fix lists", () => {
  it("groups issues by owner with critical counts", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [
        deal({ dealId: "d1", ownerId: "rep1", closeDateIso: "2026-03-01T00:00:00.000Z" }),
        deal({ dealId: "d2", ownerId: "rep2", nextStep: undefined, stage: "negotiation" }),
      ],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.ownerFixLists.length).toBeGreaterThanOrEqual(2);
    const rep1 = rep.ownerFixLists.find((o) => o.ownerId === "rep1");
    expect(rep1?.criticalCount).toBeGreaterThan(0);
  });
});

describe("scanRevenueDataQuality — scoring", () => {
  it("overall score drops with more issues", () => {
    const clean = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal()],
      accounts: [account()],
      contacts: [contact()],
    });
    const dirty = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [
        deal({ dealId: "d1", nextStep: undefined }),
        deal({ dealId: "d2", amount: undefined, nextStep: undefined }),
        deal({ dealId: "d3", closeDateIso: "2026-01-01T00:00:00.000Z", nextStep: undefined }),
      ],
      accounts: [account({ domain: undefined, ownerId: undefined, hasPrimaryContact: false })],
      contacts: [contact({ email: undefined, phone: undefined })],
    });
    expect(dirty.overallScore).toBeLessThan(clean.overallScore);
  });

  it("headline mentions score and issue count", () => {
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals: [deal({ nextStep: undefined })],
      accounts: [account()],
      contacts: [contact()],
    });
    expect(rep.headline).toMatch(/\d+\/100/);
    expect(rep.headline).toMatch(/issue/);
  });
});
