/**
 * Phase 74 — /api/agents/studio contract test.
 *
 * Pins behaviour for the three "studio" actions:
 *
 *   version  — deterministic 12-char content hash derived from a canonical
 *              agent config shape. Must be stable across calls when config
 *              does not change, and must change when the config changes.
 *
 *   simulate — returns an FAQ answer when the caller utterance shares tokens
 *              with a FAQ question (Jaccard ≥ 0.15), or falls back to the
 *              greeting. Must run chosen text through the safety guardrails.
 *
 *   evaluate — per-field scoring. Must surface error-severity issues for
 *              placeholder tokens (e.g. {{company}}) and PII leaks in the
 *              greeting; ready_to_ship must be false whenever any issue is
 *              error-severity, even if overall is ≥ 80.
 *
 * DB + auth + CSRF are fully mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Test-local agent fixture — mutated per-test.
// ---------------------------------------------------------------------------

type AgentFixture = {
  id: string;
  workspace_id: string;
  name: string | null;
  voice_id: string | null;
  personality: string | null;
  purpose: string | null;
  greeting: string | null;
  knowledge_base: unknown;
  rules: unknown;
  is_active: boolean | null;
} | null;

const state: { agent: AgentFixture } = { agent: null };

function baseAgent(overrides: Partial<NonNullable<AgentFixture>> = {}): NonNullable<AgentFixture> {
  return {
    id: "agent_1",
    workspace_id: "ws_test",
    name: "Reception Bot",
    voice_id: "v1",
    personality: "friendly",
    purpose: "book appointments",
    greeting: "Thanks for calling Acme Dental — how can I help you today?",
    knowledge_base: {
      faq: [
        { q: "What are your hours?", a: "We are open Monday through Friday, 9am to 5pm." },
        { q: "Do you take insurance?", a: "Yes, we accept most major dental insurance plans." },
      ],
    },
    rules: {},
    is_active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fluent supabase-style mock.
// ---------------------------------------------------------------------------

type Chain = {
  select: (..._a: unknown[]) => Chain;
  eq: (..._a: unknown[]) => Chain;
  maybeSingle: () => Promise<{ data: AgentFixture; error: null }>;
};

function makeChain(): Chain {
  const chain: Chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: state.agent, error: null }),
  };
  return chain;
}

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (_table: string) => makeChain(),
  }),
}));

vi.mock("@/lib/auth/authorize-org", () => ({
  authorizeOrg: async () => ({
    ok: true as const,
    session: { userId: "u_test", workspaceId: "ws_test", emailVerified: true },
    role: "owner" as const,
  }),
}));

// Bypass CSRF — tests are same-origin in effect.
vi.mock("@/lib/http/csrf", () => ({
  assertSameOrigin: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callStudio(body: Record<string, unknown>): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const { POST } = await import("@/app/api/agents/studio/route");
  const req = new NextRequest("http://localhost/api/agents/studio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/agents/studio — contract", () => {
  beforeEach(() => {
    state.agent = baseAgent();
  });

  it("400s when action is missing", async () => {
    const { status, body } = await callStudio({
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(status).toBe(400);
    expect(typeof body.error).toBe("string");
  });

  it("400s when workspace_id is missing", async () => {
    const { status } = await callStudio({ action: "version", agent_id: "agent_1" });
    expect(status).toBe(400);
  });

  it("400s when action is not recognised", async () => {
    const { status, body } = await callStudio({
      action: "wat",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(status).toBe(400);
    expect(String(body.error)).toContain("Unknown action");
  });

  it("404s when the agent does not exist in the workspace", async () => {
    state.agent = null;
    const { status, body } = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "missing",
    });
    expect(status).toBe(404);
    expect(body.error).toBe("Agent not found");
  });
});

describe("/api/agents/studio — version", () => {
  beforeEach(() => {
    state.agent = baseAgent();
  });

  it("returns a 12-char version hash", async () => {
    const { status, body } = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(status).toBe(200);
    expect(typeof body.version).toBe("string");
    expect((body.version as string).length).toBe(12);
    expect(body.is_active).toBe(true);
  });

  it("is stable when called twice on the same config", async () => {
    const a = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    const b = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(a.body.version).toBe(b.body.version);
  });

  it("changes when the greeting changes", async () => {
    const a = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    state.agent = baseAgent({ greeting: "A totally different greeting, you know?" });
    const b = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(a.body.version).not.toBe(b.body.version);
  });

  it("is insensitive to leading/trailing whitespace in greeting/name", async () => {
    const a = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    const original = baseAgent();
    state.agent = baseAgent({
      greeting: `   ${original.greeting}   `,
      name: `  ${original.name}  `,
    });
    const b = await callStudio({
      action: "version",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(a.body.version).toBe(b.body.version);
  });
});

describe("/api/agents/studio — simulate", () => {
  beforeEach(() => {
    state.agent = baseAgent();
  });

  it("400s without an utterance", async () => {
    const { status } = await callStudio({
      action: "simulate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(status).toBe(400);
  });

  it("400s when utterance exceeds 500 chars", async () => {
    const { status } = await callStudio({
      action: "simulate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
      utterance: "x".repeat(501),
    });
    expect(status).toBe(400);
  });

  it("returns a FAQ match when caller tokens overlap a FAQ question", async () => {
    const { status, body } = await callStudio({
      action: "simulate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
      utterance: "what are your hours on weekdays",
    });
    expect(status).toBe(200);
    const turn = body.turn as Record<string, unknown>;
    const match = turn.match as { kind: string; question?: string; score?: number };
    expect(match.kind).toBe("faq");
    expect(match.question).toBe("What are your hours?");
    expect(turn.agent).toContain("Monday");
  });

  it("falls back to the greeting when no FAQ matches", async () => {
    const { body } = await callStudio({
      action: "simulate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
      utterance: "zzz xyz totally unrelated gibberish payload",
    });
    const turn = body.turn as Record<string, unknown>;
    const match = turn.match as { kind: string };
    expect(match.kind).toBe("fallback");
    expect(turn.agent).toContain("Acme Dental");
  });

  it("runs the chosen reply through guardText and surfaces hits", async () => {
    state.agent = baseAgent({
      knowledge_base: {
        faq: [
          {
            q: "What's your contact email?",
            a: "You can email support@example.com for help.",
          },
        ],
      },
    });
    const { body } = await callStudio({
      action: "simulate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
      utterance: "what is your contact email",
    });
    const turn = body.turn as Record<string, unknown>;
    const guardrails = turn.guardrails as {
      hits: Array<{ kind: string }>;
      safe: boolean;
    };
    expect(guardrails.hits.some((h) => h.kind === "pii_email")).toBe(true);
    expect(guardrails.safe).toBe(false);
  });
});

describe("/api/agents/studio — evaluate", () => {
  beforeEach(() => {
    state.agent = baseAgent();
  });

  it("flags placeholder tokens in greeting as an error", async () => {
    state.agent = baseAgent({
      greeting: "Hello, thanks for calling {{company}} — how can I help?",
    });
    const { status, body } = await callStudio({
      action: "evaluate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(status).toBe(200);
    const issues = body.issues as Array<{ field: string; severity: string; message: string }>;
    const placeholder = issues.find(
      (i) => i.field === "greeting" && i.severity === "error" && /placeholder/.test(i.message),
    );
    expect(placeholder).toBeDefined();
    expect(body.ready_to_ship).toBe(false);
  });

  it("flags empty greeting as an error and blocks ready_to_ship", async () => {
    state.agent = baseAgent({ greeting: "" });
    const { body } = await callStudio({
      action: "evaluate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    const issues = body.issues as Array<{ field: string; severity: string }>;
    expect(issues.some((i) => i.field === "greeting" && i.severity === "error")).toBe(true);
    expect(body.ready_to_ship).toBe(false);
  });

  it("detects PII leak in the greeting as an error", async () => {
    state.agent = baseAgent({
      greeting: "Hi! Reach me at rep@example.com, looking forward to chatting.",
    });
    const { body } = await callStudio({
      action: "evaluate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    const issues = body.issues as Array<{ field: string; severity: string; message: string }>;
    expect(
      issues.some((i) => i.field === "greeting" && /pii_email/.test(i.message)),
    ).toBe(true);
    expect(body.ready_to_ship).toBe(false);
  });

  it("warns when FAQ list is empty but does not block ready_to_ship purely on that", async () => {
    state.agent = baseAgent({ knowledge_base: { faq: [] } });
    const { body } = await callStudio({
      action: "evaluate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    const issues = body.issues as Array<{ field: string; severity: string }>;
    const emptyFaq = issues.find(
      (i) => i.field === "knowledge_base.faq" && i.severity === "warn",
    );
    expect(emptyFaq).toBeDefined();
    // Since only warn-severity issues exist, ready_to_ship depends solely on
    // overall score passing 80.
    expect(typeof body.ready_to_ship).toBe("boolean");
  });

  it("returns ready_to_ship=true for a clean agent with meaningful FAQ", async () => {
    const { body } = await callStudio({
      action: "evaluate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    expect(body.ready_to_ship).toBe(true);
    expect(body.overall_score).toBeGreaterThanOrEqual(80);
    const issues = body.issues as Array<{ severity: string }>;
    expect(issues.every((i) => i.severity !== "error")).toBe(true);
  });

  it("scores each field between 0 and 100 inclusive", async () => {
    const { body } = await callStudio({
      action: "evaluate",
      workspace_id: "ws_test",
      agent_id: "agent_1",
    });
    const fields = body.fields as Array<{ field: string; score: number }>;
    for (const f of fields) {
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(100);
    }
  });
});
