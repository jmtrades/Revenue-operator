/**
 * Immediate risk events: failure likely within 24h. Decision pressure only.
 * No metrics, no counts in user-facing output.
 */

import { getDb } from "@/lib/db/queries";

export type ImmediateRiskCategory =
  | "unconfirmed_commitment"
  | "unpaid_due"
  | "expected_response"
  | "promised_followup"
  | "deposit_missing";

const RISK_WINDOW_HOURS = 24;
const TEXT_LINES: Record<ImmediateRiskCategory, string> = {
  unconfirmed_commitment: "A scheduled interaction lacks confirmation.",
  unpaid_due: "A payment is due without completion.",
  expected_response: "A response expectation exists without action.",
  promised_followup: "A follow-through commitment has no completion.",
  deposit_missing: "A booking has no payment path.",
};

export function getRiskTextLine(category: ImmediateRiskCategory): string {
  return TEXT_LINES[category] ?? "An operational risk is within window.";
}

/** Upsert unresolved immediate risk. risk_window_end_at = now + 24h. Idempotent by (workspace_id, category, related_external_ref). */
export async function upsertImmediateRisk(
  workspaceId: string,
  category: ImmediateRiskCategory,
  relatedExternalRef: string | null,
  riskWindowEndAt?: Date
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const endAt = riskWindowEndAt ?? new Date(now.getTime() + RISK_WINDOW_HOURS * 60 * 60 * 1000);

  const { data: existing } = await db
    .from("immediate_risk_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category", category)
    .eq("resolved", false)
    .is("related_external_ref", relatedExternalRef)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await db
      .from("immediate_risk_events")
      .update({ risk_window_end_at: endAt.toISOString(), detected_at: now.toISOString() })
      .eq("id", (existing as { id: string }).id);
    return;
  }

  await db.from("immediate_risk_events").insert({
    workspace_id: workspaceId,
    category,
    related_external_ref: relatedExternalRef,
    risk_window_end_at: endAt.toISOString(),
  });
}

/** Mark risk resolved (condition disappeared). */
export async function resolveImmediateRisk(
  workspaceId: string,
  category: ImmediateRiskCategory,
  relatedExternalRef: string | null
): Promise<void> {
  const db = getDb();
  await db
    .from("immediate_risk_events")
    .update({ resolved: true })
    .eq("workspace_id", workspaceId)
    .eq("category", category)
    .eq("resolved", false)
    .is("related_external_ref", relatedExternalRef);
}

/** Get unresolved immediate risk events for workspace (risk_window_end_at >= now). */
export async function getUnresolvedImmediateRisks(workspaceId: string): Promise<
  { id: string; category: string; related_external_ref: string | null; risk_window_end_at: string }[]
> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data } = await db
    .from("immediate_risk_events")
    .select("id, category, related_external_ref, risk_window_end_at")
    .eq("workspace_id", workspaceId)
    .eq("resolved", false)
    .gte("risk_window_end_at", now);
  return (data ?? []) as { id: string; category: string; related_external_ref: string | null; risk_window_end_at: string }[];
}

/** Get minimal text lines for today-risk API. No counts, no timestamps. */
export async function getTodayRiskTextLines(workspaceId: string): Promise<string[]> {
  const rows = await getUnresolvedImmediateRisks(workspaceId);
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of rows) {
    if (seen.has(r.category)) continue;
    seen.add(r.category);
    lines.push(getRiskTextLine(r.category as ImmediateRiskCategory));
  }
  return lines;
}

/** Record that this category was seen during observing (for continuation_prevented). */
export async function recordRiskCategoryDuringObserving(workspaceId: string, category: ImmediateRiskCategory): Promise<void> {
  const db = getDb();
  await db.from("immediate_risk_categories_during_observing").upsert(
    { workspace_id: workspaceId, category, first_seen_at: new Date().toISOString() },
    { onConflict: "workspace_id,category" }
  );
}

/** Categories that had risk during observing. */
export async function getRiskCategoriesDuringObserving(workspaceId: string): Promise<ImmediateRiskCategory[]> {
  const db = getDb();
  const { data } = await db
    .from("immediate_risk_categories_during_observing")
    .select("category")
    .eq("workspace_id", workspaceId);
  return (data ?? []).map((r: { category: string }) => r.category as ImmediateRiskCategory);
}

/** Remove category from during-observing tracking (after continuation_prevented emitted). */
export async function clearRiskCategoryDuringObserving(workspaceId: string, category: string): Promise<void> {
  const db = getDb();
  await db.from("immediate_risk_categories_during_observing").delete().eq("workspace_id", workspaceId).eq("category", category);
}

/** Count unresolved immediate risks for workspace (for activation trigger). */
export async function countUnresolvedImmediateRisks(workspaceId: string): Promise<number> {
  const rows = await getUnresolvedImmediateRisks(workspaceId);
  return rows.length;
}
