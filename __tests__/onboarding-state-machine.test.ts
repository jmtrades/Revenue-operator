/**
 * Phase 69 — Onboarding state machine tests.
 *
 * Covers:
 *   1. Empty workspace → nextStep = "identity", nextRoute points at the
 *      identity step page.
 *   2. Each step transitions to the next as its artefact is created.
 *   3. Fully populated workspace → isComplete=true, nextRoute="/app/dashboard".
 *   4. assertStepAllowed refuses skipping ahead and identifies the missing
 *      prior steps; permits the current/next eligible step.
 *   5. The /api/onboarding/state endpoint returns the same shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock DB — per-test fixture mutated via globals. Each state step's helper
// queries a specific table/filter; we answer those queries from `state`.
// ---------------------------------------------------------------------------

type WorkspaceFixture = { id: string; website?: string | null } | null;
type AgentFixture = { id: string; knowledge_base?: unknown } | null;
type PhoneFixture = { id: string } | null;
type KnowledgeFixture = Array<{ id: string; source: string }>;

const state: {
  workspace: WorkspaceFixture;
  agent: AgentFixture;
  phone: PhoneFixture;
  knowledge: KnowledgeFixture;
} = {
  workspace: null,
  agent: null,
  phone: null,
  knowledge: [],
};

function resetState() {
  state.workspace = null;
  state.agent = null;
  state.phone = null;
  state.knowledge = [];
}

/**
 * Very narrow fluent chain. Each call to `from(table)` captures the table
 * and returns a chain whose terminal methods (`maybeSingle`, `limit`+await)
 * return the right slice from `state`. Tracks `.eq(col, val)` filters to
 * distinguish e.g. source=scrape vs source=manual rows.
 */
function makeChain(table: string) {
  const eqFilters: Record<string, unknown> = {};
  const chain: {
    select: (..._a: unknown[]) => typeof chain;
    eq: (col: string, val: unknown) => typeof chain;
    limit: (n: number) => Promise<{ data: unknown; error: null }>;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
  } = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqFilters[col] = val;
      return chain;
    },
    limit: async (_n: number) => ({ data: rowsFor(table, eqFilters), error: null }),
    maybeSingle: async () => {
      const rows = rowsFor(table, eqFilters);
      return { data: rows.length > 0 ? rows[0] : null, error: null };
    },
  };
  return chain;
}

function rowsFor(table: string, eqFilters: Record<string, unknown>): unknown[] {
  switch (table) {
    case "workspaces":
      if (!state.workspace) return [];
      if (eqFilters.id && state.workspace.id !== eqFilters.id) return [];
      return [state.workspace];
    case "agents":
      if (!state.agent) return [];
      return [state.agent];
    case "phone_configs":
      if (!state.phone) return [];
      return [state.phone];
    case "workspace_knowledge": {
      return state.knowledge.filter((k) =>
        eqFilters.source === undefined ? true : k.source === eqFilters.source,
      );
    }
    default:
      return [];
  }
}

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

vi.mock("@/lib/auth/authorize-org", () => ({
  authorizeOrg: async () => ({
    ok: true as const,
    session: { userId: "u", workspaceId: "ws_1", emailVerified: true },
    role: "owner" as const,
  }),
}));

// ---------------------------------------------------------------------------
// Direct module under test
// ---------------------------------------------------------------------------

import {
  ONBOARDING_STEPS,
  assertStepAllowed,
  getOnboardingState,
} from "@/lib/onboarding/state-machine";

describe("onboarding state machine — getOnboardingState", () => {
  beforeEach(() => resetState());

  it("returns nextStep='identity' for an empty workspace", async () => {
    const s = await getOnboardingState("ws_1");
    expect(s.nextStep).toBe("identity");
    expect(s.isComplete).toBe(false);
    expect(s.nextRoute).toBe("/app/onboarding?step=identity");
    expect(s.progress).toBe(0);
  });

  it("advances to 'scrape' once identity exists", async () => {
    state.workspace = { id: "ws_1" };
    const s = await getOnboardingState("ws_1");
    expect(s.nextStep).toBe("scrape");
    expect(s.steps.find((x) => x.step === "identity")?.complete).toBe(true);
    expect(s.nextRoute).toBe("/app/onboarding?step=scrape");
  });

  it("advances to 'agent' once the workspace has a website", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    const s = await getOnboardingState("ws_1");
    expect(s.nextStep).toBe("agent");
  });

  it("accepts scrape completion via workspace_knowledge rows", async () => {
    state.workspace = { id: "ws_1" };
    state.knowledge = [{ id: "k1", source: "scrape" }];
    const s = await getOnboardingState("ws_1");
    expect(s.nextStep).toBe("agent");
  });

  it("advances to 'teach' once an agent exists", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    state.agent = { id: "a_1" };
    const s = await getOnboardingState("ws_1");
    expect(s.nextStep).toBe("teach");
  });

  it("advances to 'number' once the agent has FAQ entries", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    state.agent = {
      id: "a_1",
      knowledge_base: { faq: [{ q: "hours?", a: "9-5" }] },
    };
    const s = await getOnboardingState("ws_1");
    expect(s.nextStep).toBe("number");
  });

  it("completes fully once a phone config exists", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    state.agent = {
      id: "a_1",
      knowledge_base: { faq: [{ q: "hours?", a: "9-5" }] },
    };
    state.phone = { id: "p_1" };
    const s = await getOnboardingState("ws_1");
    expect(s.isComplete).toBe(true);
    expect(s.nextStep).toBeNull();
    // Post-setup wayfinding targets ROUTES.APP_HOME (/app/dashboard).
    // The earlier draft of Phase 69 hardcoded "/app/overview", which was a
    // 404 — users would complete onboarding and land on a dead page.
    expect(s.nextRoute).toBe("/app/dashboard");
    expect(s.progress).toBe(1);
  });

  it("keeps canonical step order in the output", async () => {
    const s = await getOnboardingState("ws_1");
    expect(s.steps.map((x) => x.step)).toEqual([...ONBOARDING_STEPS]);
  });
});

describe("onboarding state machine — assertStepAllowed", () => {
  beforeEach(() => resetState());

  it("permits the identity step on an empty workspace", async () => {
    const g = await assertStepAllowed("ws_1", "identity");
    expect(g.ok).toBe(true);
  });

  it("refuses 'agent' when identity has not been done, lists missing steps", async () => {
    const g = await assertStepAllowed("ws_1", "agent");
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.reason).toBe("previous_step_incomplete");
      expect(g.missing).toContain("identity");
    }
  });

  it("permits 'agent' once identity + scrape are done", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    const g = await assertStepAllowed("ws_1", "agent");
    expect(g.ok).toBe(true);
  });

  it("refuses 'number' when teach has not been completed", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    state.agent = { id: "a_1" }; // no FAQ
    const g = await assertStepAllowed("ws_1", "number");
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.missing).toContain("teach");
    }
  });

  it("permits 'number' when all earlier steps are complete", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    state.agent = {
      id: "a_1",
      knowledge_base: { faq: [{ q: "hours?", a: "9-5" }] },
    };
    const g = await assertStepAllowed("ws_1", "number");
    expect(g.ok).toBe(true);
  });
});

describe("/api/onboarding/state — GET", () => {
  beforeEach(() => resetState());

  it("400s when workspace_id is missing", async () => {
    const { GET } = await import("@/app/api/onboarding/state/route");
    const req = new NextRequest("http://localhost/api/onboarding/state");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns the canonical shape for a partially-completed workspace", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    state.agent = { id: "a_1" };

    const { GET } = await import("@/app/api/onboarding/state/route");
    const req = new NextRequest("http://localhost/api/onboarding/state?workspace_id=ws_1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.workspace_id).toBe("ws_1");
    expect(body.next_step).toBe("teach");
    expect(body.next_route).toBe("/app/onboarding?step=teach");
    expect(body.is_complete).toBe(false);
    expect(Array.isArray(body.steps)).toBe(true);
    expect((body.steps as unknown[]).length).toBe(ONBOARDING_STEPS.length);
  });

  it("returns is_complete=true and /app/dashboard when everything is set up", async () => {
    state.workspace = { id: "ws_1", website: "https://acme.test" };
    state.agent = {
      id: "a_1",
      knowledge_base: { faq: [{ q: "?", a: "!" }] },
    };
    state.phone = { id: "p_1" };

    const { GET } = await import("@/app/api/onboarding/state/route");
    const req = new NextRequest("http://localhost/api/onboarding/state?workspace_id=ws_1");
    const res = await GET(req);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.is_complete).toBe(true);
    expect(body.next_route).toBe("/app/dashboard");
    expect(body.progress).toBe(1);
  });
});
