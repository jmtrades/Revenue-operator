/**
 * Closure Layer — Persist responsibility transitions. Insert on every change.
 */

import { getDb } from "@/lib/db/queries";
import type { ResponsibilityState } from "./responsibility";

const TABLE = "lead_responsibility_history";

export async function getLastResponsibilityState(leadId: string): Promise<ResponsibilityState | null> {
  const db = getDb();
  const { data } = await db
    .from(TABLE)
    .select("new_state")
    .eq("lead_id", leadId)
    .order("resolved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const s = (data as { new_state?: string } | null)?.new_state;
  return (s as ResponsibilityState) ?? null;
}

export async function recordResponsibilityChange(params: {
  leadId: string;
  previousState: ResponsibilityState | null;
  newState: ResponsibilityState;
  reason: string;
}): Promise<void> {
  const db = getDb();
  await db.from(TABLE).insert({
    lead_id: params.leadId,
    previous_state: params.previousState,
    new_state: params.newState,
    resolved_at: new Date().toISOString(),
    reason: params.reason,
  });
}
