/**
 * Financial exposure records: economic consequence without numbers.
 * One record per situation per day (dedupe by workspace/category/ref/day).
 * Auto-resolve when situation no longer applies.
 */

import { getDb } from "@/lib/db/queries";

export type FinancialExposureCategory =
  | "revenue_at_risk"
  | "payment_delay"
  | "customer_loss_risk"
  | "idle_capacity";

const STATEMENT_LINES: Record<FinancialExposureCategory, string> = {
  revenue_at_risk: "A waiting customer may disengage.",
  payment_delay: "A due payment remains incomplete.",
  customer_loss_risk: "A returning customer has gone silent after a commitment.",
  idle_capacity: "Available time passed without utilization.",
};

export function getExposureStatementLine(category: FinancialExposureCategory): string {
  return STATEMENT_LINES[category] ?? "An economic consequence is present.";
}

/** Create record if none exists for (workspace, category, ref, today). Dedupe by day. */
export async function upsertFinancialExposure(
  workspaceId: string,
  category: FinancialExposureCategory,
  relatedExternalRef?: string | null
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();

  let query = db
    .from("financial_exposure_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("category", category)
    .gte("created_at", dayStart)
    .lt("created_at", dayEnd);
  if (relatedExternalRef != null && relatedExternalRef !== "") {
    query = query.eq("related_external_ref", relatedExternalRef);
  } else {
    query = query.is("related_external_ref", null);
  }
  const { data: existing } = await query.maybeSingle();

  if (existing) return;

  const { error } = await db.from("financial_exposure_records").insert({
    workspace_id: workspaceId,
    category,
    related_external_ref: relatedExternalRef ?? null,
  });
  if (error?.code === "23505") return;
  if (error) throw new Error(error.message);
}

/** Mark exposure resolved when situation no longer applies. */
export async function resolveFinancialExposure(
  workspaceId: string,
  category: FinancialExposureCategory,
  relatedExternalRef?: string | null
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const ref = relatedExternalRef ?? null;
  await db
    .from("financial_exposure_records")
    .update({ resolved_at: now })
    .eq("workspace_id", workspaceId)
    .eq("category", category)
    .is("resolved_at", null)
    .is("related_external_ref", ref);
}

/** Get unresolved (resolved_at is null) exposure records for workspace. */
export async function getUnresolvedExposures(workspaceId: string): Promise<
  { id: string; category: string; related_external_ref: string | null; created_at: string }[]
> {
  const db = getDb();
  const { data } = await db
    .from("financial_exposure_records")
    .select("id, category, related_external_ref, created_at")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null);
  return (data ?? []) as { id: string; category: string; related_external_ref: string | null; created_at: string }[];
}

/** Plain text statement lines for economic-pressure API. No counts, no amounts. */
export async function getEconomicPressureLines(workspaceId: string): Promise<string[]> {
  const rows = await getUnresolvedExposures(workspaceId);
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of rows) {
    if (seen.has(r.category)) continue;
    seen.add(r.category);
    lines.push(getExposureStatementLine(r.category as FinancialExposureCategory));
  }
  return lines;
}

/** Whether workspace has any unresolved financial exposure. */
export async function hasUnresolvedFinancialExposure(workspaceId: string): Promise<boolean> {
  const rows = await getUnresolvedExposures(workspaceId);
  return rows.length > 0;
}

/** Count records per category in last 7 days (for repeated-instability incident). */
export async function countExposuresByCategoryInLast7Days(workspaceId: string): Promise<Record<string, number>> {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("financial_exposure_records")
    .select("category")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);
  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    const cat = (r as { category: string }).category;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
}

/** Whether workspace had financial exposure on two consecutive days (for pre-activation conversion). */
export async function hadExposureOnTwoConsecutiveDays(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString().slice(0, 10);

  const { data: todayRows } = await db
    .from("financial_exposure_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("created_at", `${todayStart}T00:00:00.000Z`)
    .lt("created_at", `${todayStart}T23:59:59.999Z`)
    .limit(1);
  const { data: yesterdayRows } = await db
    .from("financial_exposure_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("created_at", `${yesterdayStart}T00:00:00.000Z`)
    .lt("created_at", `${yesterdayStart}T23:59:59.999Z`)
    .limit(1);

  return (todayRows?.length ?? 0) > 0 && (yesterdayRows?.length ?? 0) > 0;
}
