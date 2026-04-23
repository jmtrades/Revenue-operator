/**
 * Phase 74 — Agent Studio (unified read-mostly surface).
 *
 * The existing agent surface was split across three routes — `/api/agents`
 * (CRUD), `/api/agents/activate` (rollout), `/api/onboarding/agent` (create).
 * This route does NOT replace those; it unifies the *studio* concerns they
 * don't cover today:
 *
 *   1. **Versioning** — deterministic content hash of the agent config so
 *      operators can tell "same config as yesterday" at a glance. Uses the
 *      revenue-core `stableHash` (canonical JSON → FNV-1a 64).
 *
 *   2. **Simulator** — given a caller utterance, synthesize what the agent
 *      would say in turn 1 based purely on its greeting + knowledge_base.
 *      This is an *inspector*, not a live agent. Runs text through the
 *      safety guardrails so operators see PII/injection issues in config
 *      BEFORE shipping it.
 *
 *   3. **Evaluator** — scores the greeting + each FAQ answer on:
 *        a) passes guardrails (no PII leak, no injection signatures)
 *        b) length is in a reasonable range for voice playback
 *        c) contains no placeholder tokens (e.g. "{{company}}")
 *      Returns a 0..100 score + per-field issues.
 *
 * All three actions are pure / synchronous — no external calls — so they
 * can run in the request path without a job queue.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { authorizeOrg } from "@/lib/auth/authorize-org";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";
import { guardText, type TextGuardResult } from "@/lib/revenue-core/safety";
import { stableHash } from "@/lib/revenue-core/audit";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type StudioAction = "version" | "simulate" | "evaluate";

interface AgentRow {
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
}

interface FaqItem {
  q: string;
  a: string;
}

interface FieldIssue {
  field: string;
  severity: "warn" | "error";
  message: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function parseFaq(kb: unknown): FaqItem[] {
  if (kb && typeof kb === "object" && "faq" in kb) {
    const faq = (kb as { faq?: unknown }).faq;
    if (Array.isArray(faq)) {
      return faq
        .map((x): FaqItem | null => {
          if (x && typeof x === "object" && "q" in x && "a" in x) {
            const q = String((x as { q?: unknown }).q ?? "").trim();
            const a = String((x as { a?: unknown }).a ?? "").trim();
            if (q && a) return { q, a };
          }
          return null;
        })
        .filter((x): x is FaqItem => x !== null);
    }
  }
  return [];
}

/** Canonical config shape that feeds the version hash. */
function canonicalConfig(agent: AgentRow): Record<string, unknown> {
  return {
    name: agent.name?.trim() ?? "",
    voice_id: agent.voice_id ?? "",
    personality: agent.personality ?? "",
    purpose: agent.purpose ?? "",
    greeting: agent.greeting?.trim() ?? "",
    faq: parseFaq(agent.knowledge_base),
    rules: agent.rules ?? {},
  };
}

function versionHashFor(agent: AgentRow): string {
  return stableHash(canonicalConfig(agent)).slice(0, 12);
}

// -----------------------------------------------------------------------------
// Simulate — naive first-turn response composer.
//
// We pick an FAQ answer whose question shares the most tokens with the
// caller's utterance. If none match, we fall back to the greeting with a
// polite acknowledgement. We also run the chosen text through guardText so
// operators can see if their own FAQ is leaking PII or hitting injection
// patterns.
// -----------------------------------------------------------------------------

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function simulateTurn(
  agent: AgentRow,
  utterance: string,
): {
  caller: string;
  agent: string;
  match: { kind: "faq"; question: string; score: number } | { kind: "fallback" };
  guardrails: TextGuardResult;
} {
  const faq = parseFaq(agent.knowledge_base);
  const uTokens = tokenize(utterance);

  let best: { item: FaqItem; score: number } | null = null;
  for (const item of faq) {
    const score = jaccard(uTokens, tokenize(item.q));
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }

  if (best && best.score >= 0.15) {
    const reply = best.item.a;
    return {
      caller: utterance,
      agent: reply,
      match: { kind: "faq", question: best.item.q, score: Number(best.score.toFixed(3)) },
      guardrails: guardText(reply),
    };
  }

  const fallback =
    agent.greeting?.trim() ||
    `Thanks for calling. I'd love to help — could you tell me a bit more about what you need?`;
  return {
    caller: utterance,
    agent: fallback,
    match: { kind: "fallback" },
    guardrails: guardText(fallback),
  };
}

// -----------------------------------------------------------------------------
// Evaluate — per-field quality report.
// -----------------------------------------------------------------------------

const PLACEHOLDER_RE = /\{\{\s*[a-z_]+\s*\}\}|TODO:|FIXME|\[your/i;

function evaluateField(
  field: string,
  text: string | null | undefined,
  opts: { minLen: number; maxLen: number; requiredForScore: boolean },
): { issues: FieldIssue[]; score: number } {
  const issues: FieldIssue[] = [];
  const trimmed = (text ?? "").trim();

  if (!trimmed) {
    if (opts.requiredForScore) {
      issues.push({ field, severity: "error", message: "field is empty" });
      return { issues, score: 0 };
    }
    return { issues, score: 100 };
  }

  if (trimmed.length < opts.minLen) {
    issues.push({
      field,
      severity: "warn",
      message: `length ${trimmed.length} < ${opts.minLen} (too short)`,
    });
  }
  if (trimmed.length > opts.maxLen) {
    issues.push({
      field,
      severity: "warn",
      message: `length ${trimmed.length} > ${opts.maxLen} (too long for voice playback)`,
    });
  }
  if (PLACEHOLDER_RE.test(trimmed)) {
    issues.push({
      field,
      severity: "error",
      message: "contains placeholder tokens (e.g. {{variable}})",
    });
  }
  const g = guardText(trimmed);
  for (const hit of g.hits) {
    if (hit.kind === "profanity") {
      issues.push({ field, severity: "warn", message: `profanity match: "${hit.match}"` });
    } else {
      issues.push({ field, severity: "error", message: `${hit.kind} detected` });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warn").length;
  const score = Math.max(0, 100 - errorCount * 40 - warnCount * 10);
  return { issues, score };
}

function evaluateAgent(agent: AgentRow): {
  overall: number;
  fields: Array<{ field: string; score: number }>;
  issues: FieldIssue[];
} {
  const results: Array<{ field: string; score: number }> = [];
  const allIssues: FieldIssue[] = [];

  const greetingRes = evaluateField("greeting", agent.greeting, {
    minLen: 10,
    maxLen: 240,
    requiredForScore: true,
  });
  results.push({ field: "greeting", score: greetingRes.score });
  allIssues.push(...greetingRes.issues);

  const nameRes = evaluateField("name", agent.name, {
    minLen: 2,
    maxLen: 60,
    requiredForScore: true,
  });
  results.push({ field: "name", score: nameRes.score });
  allIssues.push(...nameRes.issues);

  const faq = parseFaq(agent.knowledge_base);
  if (faq.length === 0) {
    allIssues.push({
      field: "knowledge_base.faq",
      severity: "warn",
      message: "no FAQ entries — agent will fall back for most inbound questions",
    });
    results.push({ field: "faq", score: 70 });
  } else {
    let faqTotal = 0;
    for (let i = 0; i < faq.length; i++) {
      const item = faq[i];
      if (!item) continue;
      const r = evaluateField(`faq[${i}].a`, item.a, {
        minLen: 10,
        maxLen: 320,
        requiredForScore: true,
      });
      faqTotal += r.score;
      allIssues.push(...r.issues);
    }
    const faqAvg = Math.round(faqTotal / faq.length);
    results.push({ field: "faq", score: faqAvg });
  }

  const overall = Math.round(
    results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length),
  );
  return { overall, fields: results, issues: allIssues };
}

// -----------------------------------------------------------------------------
// Route handler
// -----------------------------------------------------------------------------

interface StudioRequestBody {
  action?: StudioAction;
  workspace_id?: string;
  agent_id?: string;
  utterance?: string;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: StudioRequestBody;
  try {
    body = (await req.json()) as StudioRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  const workspaceId = body.workspace_id;
  const agentId = body.agent_id;

  if (!action || !workspaceId || !agentId) {
    return NextResponse.json(
      { error: "action, workspace_id, and agent_id are required" },
      { status: 400 },
    );
  }
  if (action !== "version" && action !== "simulate" && action !== "evaluate") {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const auth = await authorizeOrg(req, workspaceId, "viewer");
  if (!auth.ok) return auth.response;

  try {
    const db = getDb();
    const { data: agent } = await db
      .from("agents")
      .select("id, workspace_id, name, voice_id, personality, purpose, greeting, knowledge_base, rules, is_active")
      .eq("id", agentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const row = agent as AgentRow | null;
    if (!row) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const version = versionHashFor(row);

    if (action === "version") {
      return NextResponse.json({
        agent_id: row.id,
        version,
        is_active: row.is_active === true,
      });
    }

    if (action === "simulate") {
      const utterance = (body.utterance ?? "").trim();
      if (!utterance) {
        return NextResponse.json(
          { error: "utterance is required for simulate" },
          { status: 400 },
        );
      }
      if (utterance.length > 500) {
        return NextResponse.json(
          { error: "utterance exceeds 500 chars" },
          { status: 400 },
        );
      }
      const sim = simulateTurn(row, utterance);
      return NextResponse.json({
        agent_id: row.id,
        version,
        turn: sim,
      });
    }

    // action === "evaluate"
    const evalResult = evaluateAgent(row);
    return NextResponse.json({
      agent_id: row.id,
      version,
      overall_score: evalResult.overall,
      fields: evalResult.fields,
      issues: evalResult.issues,
      ready_to_ship: evalResult.overall >= 80 && evalResult.issues.every((i) => i.severity !== "error"),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("error", "agents.studio.failed", { action, agent_id: agentId, error: errMsg });
    return NextResponse.json({ error: "Studio request failed" }, { status: 500 });
  }
}
