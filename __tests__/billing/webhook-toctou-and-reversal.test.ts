/**
 * Phase 78 / Task 6.3: Webhook TOCTOU fix + client_reference_id ownership
 * validation + refund reversal for minute packs.
 *
 * Strategy:
 *  - Structural ("read-the-source") tests for the webhook route contract, since
 *    the full handler is heavily I/O-bound and already covered by higher-level
 *    integration tests.
 *  - Behavioral tests for reverseMinutePackCredit via a scripted mock DB
 *    covering: happy-path decrement, idempotent replay, unknown-PI no-op,
 *    RPC-failure fallback with max(0, ...) floor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const webhookRoute = readFileSync(
  path.join(ROOT, "src/app/api/billing/webhook/route.ts"),
  "utf-8",
);

describe("Phase 78/Task 6.3 — webhook route contract", () => {
  it("uses atomic claim via claimed_at column, not SELECT-then-INSERT", () => {
    // The new flow must claim the event by updating claimed_at atomically.
    expect(webhookRoute).toMatch(/claimed_at/);
    expect(webhookRoute).toMatch(/\.update\(\s*\{\s*claimed_at:/);
    // The old "SELECT-then-INSERT" comment (with naked 23505 catch) should be gone.
    expect(webhookRoute).not.toMatch(
      /Idempotency:\s*SELECT\s+before\s+INSERT\s*\(no\s+catch-based\s+23505/,
    );
  });

  it("upserts webhook_events with ignoreDuplicates so unique-violation is a no-op", () => {
    expect(webhookRoute).toMatch(/\.upsert\(/);
    expect(webhookRoute).toMatch(/ignoreDuplicates:\s*true/);
    expect(webhookRoute).toMatch(/onConflict:\s*["']event_id["']/);
  });

  it("rejects stale-or-null claims only (the WHERE matches unclaimed or stale rows)", () => {
    // The atomic claim should only succeed when claimed_at is null OR stale.
    expect(webhookRoute).toMatch(/claimed_at\.is\.null/);
    expect(webhookRoute).toMatch(/claimed_at\.lt\./);
  });

  it("returns 200 on in-flight duplicate (no retry amplification)", () => {
    // When another handler has a live claim, return 200 with in_flight:true.
    expect(webhookRoute).toMatch(/in_flight/);
    expect(webhookRoute).toMatch(/received:\s*true/);
  });

  it("validates workspace ownership against stripe_customer_id on checkout.session.completed", () => {
    expect(webhookRoute).toMatch(/workspace_customer_mismatch/);
    expect(webhookRoute).toMatch(/select\(\s*["']stripe_customer_id["']\s*\)/);
  });

  it("prefers metadata.workspace_id over client_reference_id", () => {
    // metadata is server-set and authoritative; client_reference_id is
    // user-controllable.
    const metaFirst = webhookRoute.search(/metadataWsId\s*=\s*session\.metadata\?\.\s*workspace_id/);
    const clientRefFirst = webhookRoute.search(/clientRefWsId\s*=\s*session\.client_reference_id/);
    expect(metaFirst).toBeGreaterThan(-1);
    expect(clientRefFirst).toBeGreaterThan(-1);
    // The resolver prefers metadata: `metadataWsId ?? clientRefWsId`
    expect(webhookRoute).toMatch(/metadataWsId\s*\?\?\s*clientRefWsId/);
  });

  it("logs client_reference_id mismatch as a distinct event", () => {
    expect(webhookRoute).toMatch(/client_reference_id_mismatch/);
  });

  it("invokes reverseMinutePackCredit from charge.refunded", () => {
    expect(webhookRoute).toMatch(/reverseMinutePackCredit/);
    // Must appear inside the charge.refunded branch
    const m = webhookRoute.match(
      /case\s+"charge\.refunded":\s*\{[\s\S]*?break;\s*\}/,
    );
    expect(m).not.toBeNull();
    expect(m?.[0]).toMatch(/reverseMinutePackCredit/);
    expect(m?.[0]).toMatch(/"refund"/);
  });

  it("invokes reverseMinutePackCredit from charge.dispute.created", () => {
    const m = webhookRoute.match(
      /case\s+"charge\.dispute\.created":\s*\{[\s\S]*?break;\s*\}/,
    );
    expect(m).not.toBeNull();
    expect(m?.[0]).toMatch(/reverseMinutePackCredit/);
    expect(m?.[0]).toMatch(/"dispute"/);
  });

  it("passes Stripe event_id into the reversal for idempotency", () => {
    // The reversal must be keyed on the Stripe event id, not a synthetic value.
    expect(webhookRoute).toMatch(/reverseMinutePackCredit\(\s*[\s\S]{0,200}eventId/);
  });

  it("retains the required billing_contracts markers (23505 comment + received:true)", () => {
    // This is enforced by __tests__/billing_contracts.test.ts and must stay true
    // after the rewrite.
    expect(webhookRoute).toContain("23505");
    expect(webhookRoute).toMatch(/received:\s*true/);
  });
});

describe("Phase 78/Task 6.3 — migration artifacts", () => {
  const MIG = path.join(
    ROOT,
    "supabase/migrations/20260422120000_phase78_webhook_toctou_and_refund_reversal.sql",
  );

  it("migration file exists", () => {
    expect(existsSync(MIG)).toBe(true);
  });

  it("adds claimed_at column to webhook_events", () => {
    const sql = readFileSync(MIG, "utf-8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS claimed_at timestamptz/);
  });

  it("creates minute_pack_refunds table with unique(stripe_event_id)", () => {
    const sql = readFileSync(MIG, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS minute_pack_refunds/);
    expect(sql).toMatch(/stripe_event_id\s+text\s+NOT NULL\s+UNIQUE/);
    expect(sql).toMatch(/CHECK\s*\(\s*reason IN\s*\(\s*'refund',\s*'dispute'\s*\)\s*\)/);
  });

  it("defines decrement_bonus_minutes RPC with a non-negative floor", () => {
    const sql = readFileSync(MIG, "utf-8");
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION decrement_bonus_minutes/);
    expect(sql).toMatch(/GREATEST\(0,\s*bonus_minutes\s*-\s*p_minutes\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Behavioral tests for reverseMinutePackCredit — with a scripted mock DB.
// ─────────────────────────────────────────────────────────────────────────────

type Call = { op: string; table?: string; args?: unknown };

function makeMockDb(opts: {
  purchase?: { id: string; minutes: number; workspace_id: string } | null;
  refundInsertError?: { message: string } | null;
  rpcError?: { message: string } | null;
  currentBalance?: number;
}) {
  const calls: Call[] = [];
  const rpc = vi.fn(async (_fn: string, _params: unknown) => {
    calls.push({ op: "rpc", args: { fn: _fn, params: _params } });
    return { error: opts.rpcError ?? null };
  });

  const from = vi.fn((table: string) => {
    calls.push({ op: "from", table });
    const api: Record<string, unknown> = {};

    // minute_pack_purchases: .select().eq().maybeSingle() → { data: purchase }
    // workspace_minute_balance: .select().eq().maybeSingle() → { data: {bonus_minutes} }
    // workspace_minute_balance: .update().eq() → ok
    // minute_pack_refunds: .insert() → ok or unique-violation

    let pendingSelect = false;
    let pendingUpdate = false;
    let pendingInsertTable = table;
    let pendingInsertPayload: unknown = undefined;

    const chain = {
      select: (_cols: string) => {
        calls.push({ op: "select", table, args: _cols });
        pendingSelect = true;
        return chain;
      },
      insert: (payload: unknown) => {
        calls.push({ op: "insert", table, args: payload });
        pendingInsertPayload = payload;
        pendingInsertTable = table;
        // Synchronous return — Supabase insert is a thenable, resolve immediately
        if (pendingInsertTable === "minute_pack_refunds") {
          return Promise.resolve({ error: opts.refundInsertError ?? null });
        }
        return Promise.resolve({ error: null });
      },
      update: (patch: unknown) => {
        calls.push({ op: "update", table, args: patch });
        pendingUpdate = true;
        return chain;
      },
      eq: (_col: string, _val: unknown) => {
        calls.push({ op: "eq", table, args: { col: _col, val: _val } });
        return chain;
      },
      maybeSingle: async () => {
        calls.push({ op: "maybeSingle", table });
        if (pendingSelect && table === "minute_pack_purchases") {
          return { data: opts.purchase ?? null };
        }
        if (pendingSelect && table === "workspace_minute_balance") {
          return {
            data: opts.currentBalance !== undefined
              ? { bonus_minutes: opts.currentBalance }
              : null,
          };
        }
        return { data: null };
      },
      // When .update().eq() is awaited without maybeSingle, we treat it as done.
      then: (resolve: (v: unknown) => unknown) => {
        if (pendingUpdate) {
          return Promise.resolve({ error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };

    // Avoid ambiguity: only attach .then for update-chain (not select), since
    // select awaits via .maybeSingle().
    Object.assign(api, chain);
    return api;
  });

  return { db: { from, rpc }, calls };
}

describe("Phase 78/Task 6.3 — reverseMinutePackCredit behavior", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.restoreAllMocks(); });

  async function loadWithMock(mockDb: { from: unknown; rpc: unknown }) {
    vi.doMock("@/lib/db/queries", () => ({
      getDb: () => mockDb,
    }));
    vi.doMock("@/lib/feature-gate/resolver", () => ({
      resolveBillingTier: async () => "solo",
    }));
    const mod = await import("@/lib/voice/billing");
    return mod;
  }

  it("returns {reversed: false} when no purchase matches the payment intent", async () => {
    const { db } = makeMockDb({ purchase: null });
    const { reverseMinutePackCredit } = await loadWithMock(db);
    const res = await reverseMinutePackCredit(
      "11111111-1111-1111-1111-111111111111",
      "pi_unknown",
      "evt_1",
      "ch_1",
      "refund",
    );
    expect(res).toEqual({ reversed: false, minutes: 0 });
  });

  it("decrements bonus_minutes via RPC when purchase exists and event is new", async () => {
    const { db } = makeMockDb({
      purchase: { id: "pur_1", minutes: 500, workspace_id: "11111111-1111-1111-1111-111111111111" },
      refundInsertError: null,
      rpcError: null,
    });
    const { reverseMinutePackCredit } = await loadWithMock(db);
    const res = await reverseMinutePackCredit(
      "11111111-1111-1111-1111-111111111111",
      "pi_1",
      "evt_refund_1",
      "ch_1",
      "refund",
    );
    expect(res).toEqual({ reversed: true, minutes: 500 });
    expect(db.rpc).toHaveBeenCalledWith("decrement_bonus_minutes", {
      p_workspace_id: "11111111-1111-1111-1111-111111111111",
      p_minutes: 500,
    });
  });

  it("is idempotent on replay (unique-violation on stripe_event_id)", async () => {
    const { db } = makeMockDb({
      purchase: { id: "pur_1", minutes: 500, workspace_id: "11111111-1111-1111-1111-111111111111" },
      refundInsertError: { message: "duplicate key value violates unique constraint" },
    });
    const { reverseMinutePackCredit } = await loadWithMock(db);
    const res = await reverseMinutePackCredit(
      "11111111-1111-1111-1111-111111111111",
      "pi_1",
      "evt_refund_1",
      "ch_1",
      "refund",
    );
    expect(res).toEqual({ reversed: false, minutes: 0 });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("falls back to max(0, …) update when decrement RPC is unavailable", async () => {
    const { db, calls } = makeMockDb({
      purchase: { id: "pur_1", minutes: 500, workspace_id: "11111111-1111-1111-1111-111111111111" },
      rpcError: { message: "function decrement_bonus_minutes does not exist" },
      currentBalance: 200, // Less than 500 — floor must clamp to 0
    });
    const { reverseMinutePackCredit } = await loadWithMock(db);
    const res = await reverseMinutePackCredit(
      "11111111-1111-1111-1111-111111111111",
      "pi_1",
      "evt_refund_2",
      "ch_1",
      "refund",
    );
    expect(res).toEqual({ reversed: true, minutes: 500 });
    const updateCall = calls.find(
      (c) => c.op === "update" && c.table === "workspace_minute_balance",
    );
    expect(updateCall).toBeDefined();
    const patch = updateCall?.args as { bonus_minutes: number };
    // Must floor at 0, never go negative.
    expect(patch.bonus_minutes).toBe(0);
  });

  it("rejects empty inputs without touching the DB", async () => {
    const { db } = makeMockDb({});
    const { reverseMinutePackCredit } = await loadWithMock(db);
    const a = await reverseMinutePackCredit("", "pi_1", "evt_1", null, "refund");
    const b = await reverseMinutePackCredit("ws_1", "", "evt_1", null, "refund");
    const c = await reverseMinutePackCredit("ws_1", "pi_1", "", null, "refund");
    expect(a.reversed).toBe(false);
    expect(b.reversed).toBe(false);
    expect(c.reversed).toBe(false);
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
