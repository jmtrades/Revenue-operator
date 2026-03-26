/**
 * POST /api/internal/scenarios/incident
 * Internal-only. Auth: Bearer SCENARIO_INGEST_KEY or FOUNDER_EXPORT_KEY, or x-scenario-ingest-key / x-founder-key.
 * Inserts into scenario_incidents (append-only). Returns 200 + { ok, reason? } or { ok: true, id }.
 * No stack traces. No internal IDs in error payloads.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/intelligence/scenario-universe";
import { OUTCOME_TYPES, NEXT_REQUIRED_ACTIONS } from "@/lib/intelligence/outcome-taxonomy";
import { assertSameOrigin } from "@/lib/http/csrf";

const SCENARIO_INGEST_KEY = process.env.SCENARIO_INGEST_KEY ?? "";
const FOUNDER_KEY = process.env.FOUNDER_EXPORT_KEY ?? "";
const MAX_CONTEXT_BYTES = 10 * 1024;
const CHANNELS = ["voice", "message", "system", "inbound"] as const;
const STOP_REASONS = [
  "risk_threshold", "jurisdiction_unspecified", "consent_missing", "disclosure_incomplete",
  "objection_chain_exceeded", "attempt_limit_exceeded", "rate_headroom_exhausted", "execution_stale",
  "compliance_lock", "cadence_restriction", "hostile_cooldown", "broken_commitment_threshold",
  "outcome_requires_pause", "excessive_hostility_loop", "repeated_unknown_outcome",
] as const;

function assertScenarioAuth(request: NextRequest): NextResponse | null {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const headerKey = request.headers.get("x-scenario-ingest-key") ?? request.headers.get("x-founder-key");
  const key = token ?? headerKey ?? "";
  const valid = (SCENARIO_INGEST_KEY && key === SCENARIO_INGEST_KEY) || (FOUNDER_KEY && key === FOUNDER_KEY);
  if (!valid || !key) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 403 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  const authErr = assertScenarioAuth(request);
  if (authErr) return authErr;

  let body: {
    workspace_id?: string;
    thread_id?: string | null;
    channel?: string;
    scenario_category?: string;
    symptom_key?: string | null;
    structured_context_json?: Record<string, unknown>;
    expected_outcome_type?: string;
    expected_next_required_action?: string | null;
    expected_stop_reason?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) {
    return NextResponse.json({ ok: false, reason: "workspace_id_required" }, { status: 400 });
  }

  const channel = body.channel && CHANNELS.includes(body.channel as (typeof CHANNELS)[number]) ? body.channel : "inbound";
  const category = body.scenario_category?.trim();
  if (!category || !SCENARIO_CATEGORIES.includes(category as ScenarioCategory)) {
    return NextResponse.json({ ok: false, reason: "invalid_scenario_category" }, { status: 400 });
  }

  const context = body.structured_context_json && typeof body.structured_context_json === "object"
    ? body.structured_context_json
    : {};
  const contextStr = JSON.stringify(context);
  if (contextStr.length > MAX_CONTEXT_BYTES) {
    return NextResponse.json({ ok: false, reason: "structured_context_too_large" }, { status: 400 });
  }

  const expectedOutcome = body.expected_outcome_type?.trim();
  if (!expectedOutcome || !OUTCOME_TYPES.includes(expectedOutcome as (typeof OUTCOME_TYPES)[number])) {
    return NextResponse.json({ ok: false, reason: "invalid_expected_outcome_type" }, { status: 400 });
  }

  const expectedNext = body.expected_next_required_action?.trim();
  if (expectedNext != null && expectedNext !== "" && !NEXT_REQUIRED_ACTIONS.includes(expectedNext as (typeof NEXT_REQUIRED_ACTIONS)[number])) {
    return NextResponse.json({ ok: false, reason: "invalid_expected_next_required_action" }, { status: 400 });
  }

  const expectedStop = body.expected_stop_reason?.trim();
  if (expectedStop != null && expectedStop !== "" && !STOP_REASONS.includes(expectedStop as (typeof STOP_REASONS)[number])) {
    return NextResponse.json({ ok: false, reason: "invalid_expected_stop_reason" }, { status: 400 });
  }

  const db = getDb();
  try {
    const { data, error } = await db
      .from("scenario_incidents")
      .insert({
        workspace_id: workspaceId,
        thread_id: (body.thread_id ?? null)?.slice(0, 512) ?? null,
        channel,
        scenario_category: category,
        symptom_key: (body.symptom_key ?? null)?.slice(0, 128) ?? null,
        structured_context_json: context,
        expected_outcome_type: expectedOutcome,
        expected_next_required_action: expectedNext || null,
        expected_stop_reason: expectedStop || null,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, reason: "insert_failed" }, { status: 500 });
    }
    const id = (data as { id?: string } | null)?.id;
    return NextResponse.json({ ok: true, id: id ?? null }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "insert_failed" }, { status: 500 });
  }
}
