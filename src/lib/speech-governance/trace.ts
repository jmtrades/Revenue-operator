/**
 * Append-only message trace. No PII in slots_json; redact if needed.
 */

import { getDb } from "@/lib/db/queries";

export interface MessageTraceInput {
  workspace_id: string;
  channel: string;
  intent_type: string;
  audience?: string | null;
  domain_type?: string | null;
  jurisdiction?: string | null;
  clause_plan_json?: Record<string, unknown> | unknown[] | null;
  templates_used_json?: Record<string, unknown>[] | null;
  slots_json?: Record<string, unknown> | null;
  policy_versions_json?: Record<string, unknown> | null;
  policy_checks_json?: unknown[] | null;
  rendered_text?: string | null;
  result_status: "prepared" | "sent" | "blocked" | "skipped" | "failed";
  related_thread_id?: string | null;
  related_work_unit_id?: string | null;
}

function redactSlots(slots: Record<string, unknown> | null): Record<string, unknown> {
  if (!slots || typeof slots !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(slots)) {
    const lower = String(v).toLowerCase();
    if (lower.includes("@") || /\d{10,}/.test(String(v))) {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function recordMessageTrace(input: MessageTraceInput): Promise<void> {
  const db = getDb();
  await db.from("message_traces").insert({
    workspace_id: input.workspace_id,
    channel: input.channel,
    intent_type: input.intent_type,
    audience: input.audience ?? null,
    domain_type: input.domain_type ?? null,
    jurisdiction: input.jurisdiction ?? null,
    clause_plan_json: input.clause_plan_json ?? null,
    templates_used_json: input.templates_used_json ?? null,
    slots_json: input.slots_json ? redactSlots(input.slots_json as Record<string, unknown>) : null,
    policy_versions_json: input.policy_versions_json ?? null,
    policy_checks_json: input.policy_checks_json ?? null,
    rendered_text: input.rendered_text ?? null,
    result_status: input.result_status,
    related_thread_id: input.related_thread_id ?? null,
    related_work_unit_id: input.related_work_unit_id ?? null,
  });
}
