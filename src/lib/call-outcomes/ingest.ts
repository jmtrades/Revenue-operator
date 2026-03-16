/**
 * Ingest call outcome: append to call_outcomes, merge into lead_memory and emotional signals.
 * Deterministic. No freeform text.
 */

import { getDb } from "@/lib/db/queries";
import { getLeadMemory, upsertLeadMemory } from "@/lib/lead-memory";
import { mergeAndUpsertSignals } from "@/lib/emotional-signals/store";
import type { CallOutcomeInput } from "./types";

export async function ingestCallOutcome(
  input: CallOutcomeInput,
  threadId: string | null,
  nowIso?: string
): Promise<string | null> {
  const now = nowIso ?? new Date().toISOString();
  const db = getDb();

  const { data: row } = await db
    .from("call_outcomes")
    .insert({
      workspace_id: input.workspace_id,
      work_unit_id: input.work_unit_id ?? null,
      lead_id: input.lead_id ?? null,
      conversation_id: input.conversation_id ?? null,
      duration_seconds: input.duration_seconds ?? null,
      disposition: input.disposition ?? null,
      objections_tags_json: input.objections_tags ?? [],
      commitment_outcome: input.commitment_outcome ?? null,
      sentiment_score: input.sentiment_score ?? null,
      consent_confirmed: input.consent_confirmed ?? null,
      compliance_confirmed: input.compliance_confirmed ?? null,
    })
    .select("id")
    .maybeSingle();

  const id = (row as { id: string } | null)?.id ?? null;

  if (input.lead_id) {
    const memory = await getLeadMemory(input.workspace_id, input.lead_id);
    const objections = memory?.objections_history_json ?? [];
    const newObjections = (input.objections_tags ?? []).map((tag) => ({
      tag,
      at: now,
    }));
    await upsertLeadMemory(input.workspace_id, input.lead_id, {
      objections_history_json: [...objections, ...newObjections],
      last_channel_used: "voice",
      last_contact_attempt_at: now,
      risk_flags_json: input.compliance_confirmed === false ? [...(memory?.risk_flags_json ?? []), "compliance_not_confirmed"] : memory?.risk_flags_json ?? [],
      emotional_profile_json: {
        ...memory?.emotional_profile_json,
        ...(input.sentiment_score != null && { trust_requirement: input.sentiment_score }),
      },
      updated_at: now,
    });
  }

  if (threadId && input.sentiment_score != null) {
    await mergeAndUpsertSignals(
      input.workspace_id,
      threadId,
      { trust_requirement: input.sentiment_score },
      now
    );
  }

  return id;
}
