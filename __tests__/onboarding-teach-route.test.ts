/**
 * Phase 69 — state-machine guard on /api/onboarding/teach.
 *
 * The teach route's completion rule lives three steps deep in the onboarding
 * flow (identity → scrape → agent → teach), so it's the most skip-ahead prone
 * endpoint. This test proves the guard rejects skip-ahead attempts with 409
 * and a `missing` array, and allows the happy path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type WorkspaceFixture = { id: string; name?: string | null; website?: string | null } | null;
type AgentFixture = { id: string; knowledge_base?: unknown } | null;

const state: {
  workspace: WorkspaceFixture;
  agent: AgentFixture;
  upsertCalls: number;
  updateCalls: number;
} = {
  workspace: null,
  agent: null,
  upsertCalls: 0,
  updateCalls: 0,
};

function resetState() {
  state.workspace = null;
  state.agent = null;
  state.upsertCalls = 0;
  state.updateCalls = 0;
}

function makeChain(table: string) {
  const eqFilters: Record<string, unknown> = {};
  // A thenable + chainable object that Supabase's query builder uses:
  // awaiting it yields {data, error}, and .maybeSingle() still works afterward.
  const chain: {
    select: (..._a: unknown[]) => typeof chain;
    insert: (..._a: unknown[]) => Promise<{ data: null; error: null }>;
    upsert: (..._a: unknown[]) => Promise<{ data: null; error: null }>;
    update: (..._a: unknown[]) => typeof chain;
    eq: (col: string, val: unknown) => typeof chain;
    limit: (n: number) => {
      then: (resolve: (v: { data: unknown; error: null }) => void) => void;
      maybeSingle: () => Promise<{ data: unknown; error: null }>;
    };
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
  } = {
    select: () => chain,
    insert: async () => ({ data: null, error: null }),
    upsert: async () => {
      if (table === "workspace_business_context") state.upsertCalls++;
      return { data: null, error: null };
    },
    update: () => {
      if (table === "agents") state.updateCalls++;
      return chain;
    },
    eq: (col: string, val: unknown) => {
      eqFilters[col] = val;
      return chain;
    },
    limit: (_n: number) => {
      const rows = rowsFor(table);
      return {
        then: (resolve: (v: { data: unknown; error: null }) => void) => {
          resolve({ data: rows, error: null });
        },
        maybeSingle: async () => ({
          data: rows.length > 0 ? rows[0] : null,
          error: null,
        }),
      };
    },
    maybeSingle: async () => {
      const rows = rowsFor(table);
      return { data: rows.length > 0 ? rows[0] : null, error: null };
    },
  };
  return chain;
}

function rowsFor(table: string): unknown[] {
  switch (table) {
    case "workspaces":
      return state.workspace ? [state.workspace] : [];
    case "agents":
      return state.agent ? [state.agent] : [];
    case "workspace_business_context":
      return [];
    case "workspace_knowledge":
      return [];
    case "phone_configs":
      return [];
    default:
      return [];
  }
}

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

vi.mock("@/lib/auth/workspace-access", () => ({
  requireWorkspaceAccess: async () => null,
}));

vi.mock("@/lib/http/csrf", () => ({
  assertSameOrigin: () => null,
}));

function teachReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/onboarding/teach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/onboarding/teach — state machine guard", () => {
  beforeEach(() => resetState());

  it("returns 409 with missing=[scrape,agent] when only identity is done", async () => {
    state.workspace = { id: "ws_1" };
    // no agent, no website, no scraped knowledge
    const { POST } = await import("@/app/api/onboarding/teach/route");
    const res = await POST(
      teachReq({ workspace_id: "ws_1", services: "haircuts", faq_extra: "cash only" }),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; missing: string[] };
    expect(body.error).toContain("Previous onboarding step not complete");
    expect(body.missing).toContain("scrape");
    expect(body.missing).toContain("agent");
    // upsert/update must NOT be called when the guard refuses
    expect(state.upsertCalls).toBe(0);
    expect(state.updateCalls).toBe(0);
  });

  it("returns 409 with missing=[agent] when identity+scrape are done but agent is missing", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    const { POST } = await import("@/app/api/onboarding/teach/route");
    const res = await POST(
      teachReq({ workspace_id: "ws_1", services: "haircuts" }),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; missing: string[] };
    expect(body.missing).toEqual(["agent"]);
    expect(state.upsertCalls).toBe(0);
  });

  it("accepts the write when identity+scrape+agent are all complete", async () => {
    state.workspace = { id: "ws_1", name: "Acme", website: "https://acme.test" };
    state.agent = { id: "a_1", knowledge_base: {} };
    const { POST } = await import("@/app/api/onboarding/teach/route");
    const res = await POST(
      teachReq({
        workspace_id: "ws_1",
        services: "haircuts",
        hours: "weekdays_sat",
        faq_extra: "cash only",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(state.upsertCalls).toBe(1);
    expect(state.updateCalls).toBe(1);
  });

  it("400s when workspace_id is missing (before any guard runs)", async () => {
    const { POST } = await import("@/app/api/onboarding/teach/route");
    const res = await POST(teachReq({ services: "whatever" }));
    expect(res.status).toBe(400);
  });
});
