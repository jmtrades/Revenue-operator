/**
 * Phase 72 — Revenue-core wire-in verification for /api/attention.
 *
 * Pins the behaviour we get by routing the Daily Attention List through
 * `planActions` from `@/lib/revenue-core/action-planner`:
 *
 *   1. Stable, deterministic action_id per (workspace, lead, day).
 *   2. Monetized `expected_impact_usd` surfaced per item + plan summary.
 *   3. Severity mapping: readiness>=70→critical, >=50→warning, else→info.
 *   4. Final ordering: severity DESC, then priorityScore DESC — so a hot
 *      $100k lead beats a cold $10k lead even if their raw values differ.
 *   5. Dedup collapses multiple signals on the same accountId (we feed one
 *      per lead, so effective count == input count, but the pipeline path
 *      is exercised).
 *
 * The DB and auth are fully mocked — no network, no env, fast.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock dataset — flipped per-test via globals so we don't re-instantiate the
// mock module between tests (vi.mock is hoisted & cached).
// ---------------------------------------------------------------------------

type LeadFixture = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  state?: string;
  last_activity_at?: string;
};
type DealFixture = { id: string; lead_id: string; value_cents: number };

const state: {
  leads: LeadFixture[];
  deals: DealFixture[];
  readinessByLead: Record<string, number>;
  upserts: Array<Record<string, unknown>>;
  cache: Array<Record<string, unknown>>;
} = {
  leads: [],
  deals: [],
  readinessByLead: {},
  upserts: [],
  cache: [],
};

function resetState() {
  state.leads = [];
  state.deals = [];
  state.readinessByLead = {};
  state.upserts = [];
  state.cache = [];
}

// ---------------------------------------------------------------------------
// Fluent supabase-style mock. Each `from(table)` returns a chain whose
// terminal methods resolve to the right slice of `state`.
// ---------------------------------------------------------------------------

type Chain = {
  // Filter ops — all chainable.
  select: (..._a: unknown[]) => Chain;
  eq: (..._a: unknown[]) => Chain;
  neq: (..._a: unknown[]) => Chain;
  in: (..._a: unknown[]) => Chain;
  order: (..._a: unknown[]) => Chain;
  limit: (..._a: unknown[]) => Chain;
  // Terminal thenables / mutators.
  upsert: (row: Record<string, unknown>) => Promise<{ data: null; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: (onF: (v: { data: unknown; error: null }) => unknown) => Promise<unknown>;
};

function makeChain(table: string): Chain {
  const chain: Chain = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    upsert: async (row) => {
      state.upserts.push({ table, row });
      return { data: null, error: null };
    },
    maybeSingle: async () => ({ data: null, error: null }),
    then: (onF) => {
      const data =
        table === "daily_attention"
          ? state.cache
          : table === "deals"
            ? state.deals
            : table === "leads"
              ? state.leads
              : [];
      return Promise.resolve(onF({ data, error: null }));
    },
  };
  return chain;
}

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

vi.mock("@/lib/auth/authorize-org", () => ({
  authorizeOrg: async () => ({
    ok: true as const,
    session: { userId: "u_test", workspaceId: "ws_test", emailVerified: true },
    role: "owner" as const,
  }),
}));

vi.mock("@/lib/readiness/engine", () => ({
  computeReadiness: async (_ws: string, leadId: string) => ({
    conversation_readiness_score: state.readinessByLead[leadId] ?? 0,
  }),
  persistReadiness: async () => {},
}));

// ---------------------------------------------------------------------------

async function callGET(workspaceId = "ws_test") {
  const { GET } = await import("@/app/api/attention/route");
  const req = new NextRequest(`http://localhost/api/attention?workspace_id=${workspaceId}`);
  const res = await GET(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/attention — revenue-core wire-in", () => {
  beforeEach(() => {
    resetState();
  });

  it("returns 400 when workspace_id is missing", async () => {
    const { GET } = await import("@/app/api/attention/route");
    const req = new NextRequest("http://localhost/api/attention");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("produces an action_id and expected_impact_usd for every attention item", async () => {
    state.leads = [
      { id: "lead_hot", name: "Hot Co", last_activity_at: new Date().toISOString() },
    ];
    state.deals = [{ id: "deal_1", lead_id: "lead_hot", value_cents: 100_000_00 }];
    state.readinessByLead = { lead_hot: 85 };

    const { body } = await callGET();

    const attention = body.attention as Array<Record<string, unknown>>;
    expect(Array.isArray(attention)).toBe(true);
    expect(attention).toHaveLength(1);
    const first = attention[0]!;
    expect(typeof first.action_id).toBe("string");
    // action_id must be non-empty and deterministic-looking (hash-like).
    expect((first.action_id as string).length).toBeGreaterThan(0);
    expect(typeof first.expected_impact_usd).toBe("number");
    // 100k deal * 0.85 readiness = $85,000 of protected revenue.
    expect(first.expected_impact_usd).toBeCloseTo(85_000, 0);
    expect(first.severity).toBe("critical"); // readiness >= 70
  });

  it("ranks high-readiness/high-value before low-readiness/low-value", async () => {
    // Matching last_activity_at → same bestTimingFor bucket; the only
    // variable is readiness * value.
    const now = new Date().toISOString();
    state.leads = [
      { id: "lead_cold_small", name: "Cold Small", last_activity_at: now },
      { id: "lead_hot_big", name: "Hot Big", last_activity_at: now },
      { id: "lead_warm_mid", name: "Warm Mid", last_activity_at: now },
    ];
    state.deals = [
      { id: "d_cold", lead_id: "lead_cold_small", value_cents: 10_000_00 },
      { id: "d_hot", lead_id: "lead_hot_big", value_cents: 100_000_00 },
      { id: "d_warm", lead_id: "lead_warm_mid", value_cents: 50_000_00 },
    ];
    state.readinessByLead = {
      lead_cold_small: 20, // info
      lead_hot_big: 85, // critical
      lead_warm_mid: 55, // warning
    };

    const { body } = await callGET();
    const attention = body.attention as Array<{ lead_id: string; severity: string }>;

    // Severity DESC → critical, warning, info.
    expect(attention.map((a) => a.severity)).toEqual(["critical", "warning", "info"]);
    expect(attention.map((a) => a.lead_id)).toEqual([
      "lead_hot_big",
      "lead_warm_mid",
      "lead_cold_small",
    ]);
  });

  it("severity mapping — readiness 70+ critical, 50-69 warning, <50 info", async () => {
    const now = new Date().toISOString();
    state.leads = [
      { id: "l70", last_activity_at: now },
      { id: "l50", last_activity_at: now },
      { id: "l30", last_activity_at: now },
    ];
    state.deals = [
      { id: "d70", lead_id: "l70", value_cents: 10_000_00 },
      { id: "d50", lead_id: "l50", value_cents: 10_000_00 },
      { id: "d30", lead_id: "l30", value_cents: 10_000_00 },
    ];
    state.readinessByLead = { l70: 70, l50: 50, l30: 30 };

    const { body } = await callGET();
    const byId = Object.fromEntries(
      (body.attention as Array<{ lead_id: string; severity: string }>).map((a) => [
        a.lead_id,
        a.severity,
      ]),
    );
    expect(byId["l70"]).toBe("critical");
    expect(byId["l50"]).toBe("warning");
    expect(byId["l30"]).toBe("info");
  });

  it("surfaces plan_summary with total impact + dedup + drop counts", async () => {
    const now = new Date().toISOString();
    state.leads = [
      { id: "a", last_activity_at: now },
      { id: "b", last_activity_at: now },
    ];
    state.deals = [
      { id: "da", lead_id: "a", value_cents: 20_000_00 },
      { id: "db", lead_id: "b", value_cents: 30_000_00 },
    ];
    state.readinessByLead = { a: 80, b: 60 };

    const { body } = await callGET();
    const summary = body.plan_summary as Record<string, number>;
    // a: 20k * 0.80 = 16,000; b: 30k * 0.60 = 18,000 → total 34,000
    expect(summary.total_expected_impact_usd).toBeCloseTo(34_000, 0);
    expect(summary.dropped_due_to_capacity).toBe(0);
    expect(summary.deduplicated_count).toBe(0);
  });

  it("writes one daily_attention upsert per planned action", async () => {
    const now = new Date().toISOString();
    state.leads = [
      { id: "l1", last_activity_at: now },
      { id: "l2", last_activity_at: now },
    ];
    state.deals = [
      { id: "d1", lead_id: "l1", value_cents: 10_000_00 },
      { id: "d2", lead_id: "l2", value_cents: 10_000_00 },
    ];
    state.readinessByLead = { l1: 75, l2: 55 };

    await callGET();

    const upserts = state.upserts.filter((u) => u.table === "daily_attention");
    expect(upserts).toHaveLength(2);
    // Rank is 1-indexed and contiguous.
    const ranks = upserts
      .map((u) => (u.row as { rank: number }).rank)
      .sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2]);
  });

  it("action_id is stable across two calls on the same UTC day", async () => {
    const now = new Date().toISOString();
    state.leads = [{ id: "lead_stable", last_activity_at: now }];
    state.deals = [{ id: "d_stable", lead_id: "lead_stable", value_cents: 50_000_00 }];
    state.readinessByLead = { lead_stable: 80 };

    const a = await callGET();
    resetState();
    state.leads = [{ id: "lead_stable", last_activity_at: now }];
    state.deals = [{ id: "d_stable", lead_id: "lead_stable", value_cents: 50_000_00 }];
    state.readinessByLead = { lead_stable: 80 };
    const b = await callGET();

    const idA = (a.body.attention as Array<{ action_id: string }>)[0]?.action_id;
    const idB = (b.body.attention as Array<{ action_id: string }>)[0]?.action_id;
    expect(idA).toBe(idB);
  });
});
