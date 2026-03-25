/**
 * Thread emotional signals store. Validated keys only. Deterministic. No Date.now() in logic.
 */

import { getDb } from "@/lib/db/queries";

const SIGNAL_KEYS = [
  "urgency_score",
  "skepticism_score",
  "compliance_sensitivity",
  "aggression_level",
  "authority_resistance",
  "trust_requirement",
] as const;

export type EmotionalSignalsKey = (typeof SIGNAL_KEYS)[number];

export interface EmotionalSignalsRecord {
  urgency_score?: number;
  skepticism_score?: number;
  compliance_sensitivity?: number;
  aggression_level?: number;
  authority_resistance?: number;
  trust_requirement?: number;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, Number(n)));
}

function validateSignalsJson(obj: unknown): EmotionalSignalsRecord {
  if (!obj || typeof obj !== "object") return {};
  const out: EmotionalSignalsRecord = {};
  for (const key of SIGNAL_KEYS) {
    const v = (obj as Record<string, unknown>)[key];
    if (typeof v === "number" && !Number.isNaN(v)) out[key] = clamp(v);
  }
  return out;
}

export async function getSignals(
  workspaceId: string,
  threadId: string
): Promise<EmotionalSignalsRecord> {
  const db = getDb();
  const { data } = await db
    .from("thread_emotional_signals")
    .select("signals_json")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", threadId)
    .maybeSingle();
  const raw = (data as { signals_json?: unknown } | null)?.signals_json;
  return validateSignalsJson(raw);
}

export async function mergeAndUpsertSignals(
  workspaceId: string,
  threadId: string,
  partialSignals: Partial<EmotionalSignalsRecord>,
  updatedAt?: string
): Promise<EmotionalSignalsRecord> {
  const db = getDb();
  const current = await getSignals(workspaceId, threadId);
  const merged: EmotionalSignalsRecord = {
    urgency_score: partialSignals.urgency_score ?? current.urgency_score ?? 0,
    skepticism_score: partialSignals.skepticism_score ?? current.skepticism_score ?? 0,
    compliance_sensitivity: partialSignals.compliance_sensitivity ?? current.compliance_sensitivity ?? 0,
    aggression_level: partialSignals.aggression_level ?? current.aggression_level ?? 0,
    authority_resistance: partialSignals.authority_resistance ?? current.authority_resistance ?? 0,
    trust_requirement: partialSignals.trust_requirement ?? current.trust_requirement ?? 0,
  };
  const normalized: EmotionalSignalsRecord = {};
  for (const k of SIGNAL_KEYS) {
    normalized[k] = clamp(merged[k] ?? 0);
  }
  const now = updatedAt ?? new Date().toISOString();
  await db
    .from("thread_emotional_signals")
    .upsert(
      {
        workspace_id: workspaceId,
        thread_id: threadId,
        signals_json: normalized,
        updated_at: now,
      },
      { onConflict: "workspace_id,thread_id" }
    );
  return normalized;
}
