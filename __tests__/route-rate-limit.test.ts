import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the db layer BEFORE importing the module under test so the import
// inside rate-limit.ts picks up the fake.
vi.mock("@/lib/db/queries", () => {
  // In-memory store keyed by (scope, key_hash).
  const store = new Map<string, { count: number; window_start: string }>();

  function keyOf(scope: string, keyHash: string) {
    return `${scope}::${keyHash}`;
  }

  // Builder that mimics the Supabase PostgREST-style fluent API we use.
  // It only needs to support the operations the rate-limit module calls:
  //   .from(table).select(cols).eq(k, v).eq(k, v).maybeSingle()
  //   .from(table).insert({...})
  //   .from(table).update({...}).eq(...).eq(...)
  function makeBuilder(_table: string) {
    const filters: Record<string, unknown> = {};
    let pendingUpdate: Record<string, unknown> | null = null;
    let op: "select" | "insert" | "update" | null = null;

    const builder: {
      select: (_cols: string) => typeof builder;
      insert: (row: Record<string, unknown>) => Promise<{ data: null; error: null }>;
      update: (patch: Record<string, unknown>) => typeof builder;
      eq: (k: string, v: unknown) => typeof builder;
      maybeSingle: () => Promise<{ data: unknown; error: null }>;
      then: (resolve: (v: unknown) => void) => void;
    } = {
      select(_cols: string) {
        op = "select";
        return builder;
      },
      insert(row: Record<string, unknown>) {
        op = "insert";
        // insert isn't chained in our caller — it's awaited directly.
        const k = keyOf(String(row.scope), String(row.key_hash));
        store.set(k, {
          count: Number(row.count),
          window_start: String(row.window_start),
        });
        return Promise.resolve({ data: null, error: null });
      },
      update(patch: Record<string, unknown>) {
        op = "update";
        pendingUpdate = patch;
        return builder;
      },
      eq(k: string, v: unknown) {
        filters[k] = v;
        return builder;
      },
      async maybeSingle() {
        const k = keyOf(String(filters.scope), String(filters.key_hash));
        const row = store.get(k) ?? null;
        return { data: row, error: null };
      },
      // Support the non-maybeSingle terminal for update
      then(resolve: (v: unknown) => void) {
        if (op === "update" && pendingUpdate) {
          const k = keyOf(String(filters.scope), String(filters.key_hash));
          const existing = store.get(k);
          if (existing) {
            store.set(k, { ...existing, ...(pendingUpdate as Partial<typeof existing>) });
          }
        }
        resolve({ data: null, error: null });
      },
    };
    return builder;
  }

  const getDb = () => ({ from: makeBuilder });

  return { getDb, __store: store };
});

// Now we can import. The import of getDb inside rate-limit.ts resolves to our
// fake thanks to the mock above.
import { checkRouteRateLimit, ROUTE_RATE_LIMITS } from "../src/lib/security/rate-limit";
// biome-ignore lint/suspicious/noExplicitAny: test-only access to mock internals
const { __store } = (await import("@/lib/db/queries")) as unknown as { __store: Map<string, unknown> };

describe("checkRouteRateLimit", () => {
  beforeEach(() => {
    (__store as Map<string, unknown>).clear();
  });

  it("allows the first call and reports remaining budget", async () => {
    const rl = await checkRouteRateLimit({
      route: "team.invite",
      workspaceId: "ws_1",
      actor: "user_1",
      limit: 3,
      windowSec: 60,
    });
    expect(rl.ok).toBe(true);
    expect(rl.remaining).toBe(2);
    expect(rl.response).toBeUndefined();
  });

  it("counts down remaining across calls within the same window", async () => {
    const opts = { route: "team.invite", workspaceId: "ws_1", actor: "user_1", limit: 3, windowSec: 60 };
    const r1 = await checkRouteRateLimit(opts);
    const r2 = await checkRouteRateLimit(opts);
    const r3 = await checkRouteRateLimit(opts);
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
    expect(r1.ok && r2.ok && r3.ok).toBe(true);
  });

  it("returns a 429 with Retry-After after the limit is exceeded", async () => {
    const opts = { route: "messages.send", workspaceId: "ws_1", actor: "user_1", limit: 2, windowSec: 60 };
    await checkRouteRateLimit(opts);
    await checkRouteRateLimit(opts);
    const rl = await checkRouteRateLimit(opts); // third — should be blocked

    expect(rl.ok).toBe(false);
    expect(rl.response).toBeDefined();
    expect(rl.response!.status).toBe(429);
    expect(rl.response!.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(rl.response!.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(rl.response!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(rl.retryAfterSec).toBeGreaterThan(0);
    expect(rl.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("isolates tenants: one workspace hitting the limit does not block another", async () => {
    const wsA = { route: "messages.send", workspaceId: "ws_A", actor: "u", limit: 1, windowSec: 60 };
    const wsB = { route: "messages.send", workspaceId: "ws_B", actor: "u", limit: 1, windowSec: 60 };

    await checkRouteRateLimit(wsA); // consumes ws_A's budget
    const blocked = await checkRouteRateLimit(wsA);
    const other = await checkRouteRateLimit(wsB);

    expect(blocked.ok).toBe(false);
    expect(other.ok).toBe(true);
  });

  it("isolates per-actor even within the same workspace", async () => {
    const a = { route: "r", workspaceId: "ws", actor: "actor_a", limit: 1, windowSec: 60 };
    const b = { route: "r", workspaceId: "ws", actor: "actor_b", limit: 1, windowSec: 60 };
    await checkRouteRateLimit(a);
    const aBlocked = await checkRouteRateLimit(a);
    const bOk = await checkRouteRateLimit(b);
    expect(aBlocked.ok).toBe(false);
    expect(bOk.ok).toBe(true);
  });

  it("resets the window after windowSec elapses", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-04-22T12:00:00Z"));
      const opts = { route: "r", workspaceId: "ws", actor: "u", limit: 1, windowSec: 60 };
      await checkRouteRateLimit(opts);
      const blocked = await checkRouteRateLimit(opts);
      expect(blocked.ok).toBe(false);

      // Jump past the window.
      vi.setSystemTime(new Date("2026-04-22T12:01:30Z"));
      const fresh = await checkRouteRateLimit(opts);
      expect(fresh.ok).toBe(true);
      expect(fresh.remaining).toBe(0); // limit is 1, we just consumed it
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies the 'mutation' preset limit/window when no explicit values given", async () => {
    const rl = await checkRouteRateLimit({
      route: "some.mutation",
      workspaceId: "ws",
      actor: "u",
      preset: "mutation",
    });
    expect(rl.ok).toBe(true);
    expect(rl.remaining).toBe(ROUTE_RATE_LIMITS.mutation.limit - 1);
  });

  it("applies the 'auth' preset for tighter credential-stuffing defence", async () => {
    // Consume the full auth budget (10/60s).
    let last: Awaited<ReturnType<typeof checkRouteRateLimit>> | null = null;
    for (let i = 0; i < ROUTE_RATE_LIMITS.auth.limit; i++) {
      last = await checkRouteRateLimit({ route: "auth.signin", actor: "ip_1", preset: "auth" });
    }
    expect(last?.ok).toBe(true);
    const blocked = await checkRouteRateLimit({ route: "auth.signin", actor: "ip_1", preset: "auth" });
    expect(blocked.ok).toBe(false);
    expect(blocked.response?.status).toBe(429);
  });

  it("fails OPEN when route/actor are missing (bad caller should not block real traffic)", async () => {
    const rl = await checkRouteRateLimit({ route: "", actor: "" });
    expect(rl.ok).toBe(true);
    expect(rl.response).toBeUndefined();
  });

  it("works without a workspaceId (e.g. unauthenticated endpoints keyed on IP)", async () => {
    const opts = { route: "public.ping", actor: "ip_9.9.9.9", limit: 2, windowSec: 60 };
    const r1 = await checkRouteRateLimit(opts);
    const r2 = await checkRouteRateLimit(opts);
    const r3 = await checkRouteRateLimit(opts);
    expect(r1.ok && r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
  });
});
