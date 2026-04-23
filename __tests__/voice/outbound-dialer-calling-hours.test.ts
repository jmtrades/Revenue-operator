/**
 * Phase 78 / Task 7.5 — Lead-timezone calling-hours gate in outbound dialer.
 *
 * The defect: `outbound-dialer.ts` previously called a module-local
 * `isWithinCallingHours()` that read `new Date().getHours()` — i.e., server
 * LOCAL time. A Vercel function in UTC would happily dial a Hawaii lead
 * (UTC-10) at 14:00 UTC because "hour >= 9 && hour < 20" passes server-side,
 * even though it's 04:00 in Honolulu — a textbook TCPA violation worth up to
 * $43,792 per call.
 *
 * The fix: `getNextLead` now runs `checkCallingCompliance(lead.phone,
 * lead.state)` — the same layered federal + state + holiday + weekday gate
 * that `execute-lead-call` uses — and SKIPS non-compliant leads rather than
 * returning a whole-queue null. The old `isWithinCallingHours` is renamed
 * to `isWithinCallingHoursServerLocal` and used only as a last-resort for
 * leads with no phone number (cannot resolve area-code → timezone).
 *
 * These tests pin the new contract so a future refactor cannot silently
 * revert to server-local clock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Fake supabase query builder — enough surface to satisfy getNextLead's
// `.from().select().eq().order().limit()` chain.
interface FakeLead {
  id: string;
  phone: string | null;
  name: string;
  state: string | null;
  metadata: Record<string, unknown>;
}

function makeFakeDb(leads: FakeLead[]) {
  const select = vi.fn(function (this: unknown, _cols: string) {
    return this;
  });
  const eq = vi.fn(function (this: unknown, _col: string, _val: unknown) {
    return this;
  });
  const order = vi.fn(function (this: unknown, _col: string, _opts?: unknown) {
    return this;
  });
  const limit = vi.fn(async () => ({ data: leads, error: null }));

  const chain = { select, eq, order, limit };
  const from = vi.fn((_table: string) => chain);
  return { from, __chain: chain };
}

describe("outbound-dialer getNextLead — lead-timezone calling-hours gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("@/lib/db/queries");
  });

  function queueMeta(campaignId: string) {
    return {
      outbound_queue: {
        campaign_id: campaignId,
        status: "queued" as const,
        attempt_number: 0,
      },
    };
  }

  // 20:00 UTC on a Wednesday (2026-04-22 Wed). At this instant:
  //   Eastern (UTC-4 DST):        16:00 — inside 8-9 window ✅
  //   Pacific (UTC-7 DST):        13:00 — inside 8-9 window ✅
  //   Hawaii  (UTC-10, no DST):   10:00 — inside 8-9 window ✅
  // So a Wednesday 20:00 UTC lets everyone pass — good baseline.
  const WED_20Z = new Date("2026-04-22T20:00:00.000Z");

  // 12:00 UTC on a Wednesday. At this instant:
  //   Eastern: 08:00 — just inside 8-9 ✅
  //   Pacific: 05:00 — BEFORE 8am — BLOCKED ❌
  //   Hawaii:  02:00 — BEFORE 8am — BLOCKED ❌
  const WED_12Z = new Date("2026-04-22T12:00:00.000Z");

  // 03:00 UTC Thursday. At this instant:
  //   Eastern: 23:00 Wed — AFTER 9pm — BLOCKED ❌
  //   Pacific: 20:00 Wed — inside 8-9 ✅
  //   Hawaii:  17:00 Wed — inside 8-9 ✅
  const THU_03Z = new Date("2026-04-23T03:00:00.000Z");

  it("passes a Pacific lead at 20:00 UTC Wednesday (13:00 lead-local)", async () => {
    vi.setSystemTime(WED_20Z);

    const leads: FakeLead[] = [
      {
        id: "lead-pt",
        phone: "+14155550100", // 415 → America/Los_Angeles
        name: "PT Lead",
        state: "CA",
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");

    expect(next).not.toBeNull();
    expect(next?.lead_id).toBe("lead-pt");
    expect(next?.phone).toBe("+14155550100");
  });

  it("BLOCKS a Pacific lead at 12:00 UTC Wednesday (05:00 lead-local, before 8am)", async () => {
    vi.setSystemTime(WED_12Z);

    const leads: FakeLead[] = [
      {
        id: "lead-pt",
        phone: "+14155550100",
        name: "PT Lead",
        state: "CA",
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");

    expect(next).toBeNull();
  });

  it("BLOCKS a Hawaii lead at 12:00 UTC Wednesday (02:00 lead-local, before 8am)", async () => {
    vi.setSystemTime(WED_12Z);

    const leads: FakeLead[] = [
      {
        id: "lead-hi",
        phone: "+18085550100", // 808 → Pacific/Honolulu
        name: "HI Lead",
        state: "HI",
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");

    expect(next).toBeNull();
  });

  it("BLOCKS an Eastern lead at 03:00 UTC Thursday (23:00 lead-local Wed, after 9pm)", async () => {
    vi.setSystemTime(THU_03Z);

    const leads: FakeLead[] = [
      {
        id: "lead-et",
        phone: "+12125550100", // 212 → America/New_York
        name: "ET Lead",
        state: "NY",
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");

    expect(next).toBeNull();
  });

  it("skips a non-compliant lead but returns a compliant one later in the queue", async () => {
    // Same instant — 03:00 UTC Thursday. ET is blocked, PT and HI are allowed.
    vi.setSystemTime(THU_03Z);

    const leads: FakeLead[] = [
      {
        id: "lead-et-blocked",
        phone: "+12125550100",
        name: "ET Lead",
        state: "NY",
        metadata: queueMeta("cmp-1"),
      },
      {
        id: "lead-pt-ok",
        phone: "+14155550100",
        name: "PT Lead",
        state: "CA",
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");

    expect(next).not.toBeNull();
    expect(next?.lead_id).toBe("lead-pt-ok");
  });

  it("blocks ALL leads regardless of state at 08:00 UTC Sunday (quiet hours + forbidden weekday)", async () => {
    // 2026-04-26 is a Sunday. 08:00 UTC:
    //   ET: 04:00 Sun — federally blocked (before 8am) AND Sunday-forbidden in AL/FL/LA
    //   PT: 01:00 Sun — federally blocked
    //   HI: 22:00 Sat — PREVIOUS day, AFTER 9pm (1320 > 1260), blocked
    // Safe conclusion: nothing in the US can be called at this instant.
    vi.setSystemTime(new Date("2026-04-26T08:00:00.000Z"));

    const leads: FakeLead[] = [
      {
        id: "lead-et",
        phone: "+12125550100",
        name: "ET Lead",
        state: "NY",
        metadata: queueMeta("cmp-1"),
      },
      {
        id: "lead-pt",
        phone: "+14155550100",
        name: "PT Lead",
        state: "CA",
        metadata: queueMeta("cmp-1"),
      },
      {
        id: "lead-hi",
        phone: "+18085550100",
        name: "HI Lead",
        state: "HI",
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");

    expect(next).toBeNull();
  });

  it("selects `state` from the leads table (required for state jurisdiction check)", async () => {
    vi.setSystemTime(WED_20Z);
    const fake = makeFakeDb([
      {
        id: "lead-ok",
        phone: "+14155550100",
        name: "ok",
        state: "CA",
        metadata: queueMeta("cmp-1"),
      },
    ]);
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => fake }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    await getNextLead("ws-1", "cmp-1");

    // The dialer must ask for `state` so the TCPA gate has jurisdiction info.
    expect(fake.__chain.select).toHaveBeenCalledWith(expect.stringContaining("state"));
  });

  it("applies the gate to each lead independently (does not short-circuit whole queue)", async () => {
    // A blocked ET lead MUST NOT cause a compliant PT lead to be returned as
    // null — the queue must keep walking.
    vi.setSystemTime(THU_03Z);
    const leads: FakeLead[] = [
      {
        id: "lead-blocked",
        phone: "+12125550100",
        name: "ET Lead",
        state: "NY",
        metadata: queueMeta("cmp-1"),
      },
      {
        id: "lead-allowed",
        phone: "+14155550100",
        name: "PT Lead",
        state: "CA",
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));
    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");
    expect(next?.lead_id).toBe("lead-allowed");
  });

  it("passes through lead without phone via server-local last-resort gate (during business hours)", async () => {
    // 20:00 UTC Wed is during business hours in every US timezone; server-local
    // on a container may or may not agree, but for a no-phone lead the only
    // fallback we have is server-local. We just assert the code path is
    // reachable without throwing — we don't pin a result, because server-local
    // depends on the host and isn't what we're testing.
    vi.setSystemTime(WED_20Z);

    const leads: FakeLead[] = [
      {
        id: "lead-nophone",
        phone: null,
        name: "no phone",
        state: null,
        metadata: queueMeta("cmp-1"),
      },
    ];
    vi.doMock("@/lib/db/queries", () => ({ getDb: () => makeFakeDb(leads) }));

    const { getNextLead } = await import("@/lib/voice/outbound-dialer");
    const next = await getNextLead("ws-1", "cmp-1");

    // Either server-local allows (next is non-null with empty phone) or it
    // doesn't (next is null) — both are acceptable; the test verifies the
    // compliance path doesn't crash on a null phone.
    if (next !== null) {
      expect(next.phone).toBe("");
    }
  });
});

describe("outbound-dialer: no reliance on server-local clock for TCPA", () => {
  it("imports checkCallingCompliance (the layered TCPA gate) at module scope", async () => {
    // Static-text check: ensures a future refactor doesn't swap back to the
    // old module-local `isWithinCallingHours()` clock.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/lib/voice/outbound-dialer.ts"),
      "utf8",
    );
    expect(src).toContain(
      'import { checkCallingCompliance } from "@/lib/compliance/tcpa-quiet-hours"',
    );
    // The old helper should no longer be called as a primary TCPA gate;
    // only the server-local-named fallback is permitted.
    expect(src).not.toMatch(/if\s*\(\s*!\s*isWithinCallingHours\s*\(\s*\)\s*\)/);
  });
});
