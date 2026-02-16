/**
 * RevenueLifecycle store — upsert and query. Updated by operators and event handlers.
 */

import { getDb } from "@/lib/db/queries";
import type { LifecycleStage, RevenueLifecycleState, LifetimeValueStage } from "./types";

export interface RevenueLifecycleRow {
  id: string;
  lead_id: string;
  workspace_id: string;
  first_contact_at: string | null;
  booked_at: string | null;
  showed_at: string | null;
  last_visit_at: string | null;
  next_expected_visit_at: string | null;
  lifecycle_stage: string;
  lifetime_value_stage: string;
  revenue_state: string;
  dropoff_risk: number;
  created_at: string;
  updated_at: string;
}

export async function getRevenueLifecycle(
  workspaceId: string,
  leadId: string
): Promise<RevenueLifecycleRow | null> {
  const db = getDb();
  const { data } = await db
    .from("revenue_lifecycles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .single();
  return (data as RevenueLifecycleRow | null) ?? null;
}

export async function upsertRevenueLifecycle(
  leadId: string,
  workspaceId: string,
  updates: Partial<{
    first_contact_at: string | null;
    booked_at: string | null;
    showed_at: string | null;
    last_visit_at: string | null;
    next_expected_visit_at: string | null;
    lifecycle_stage: LifecycleStage;
    lifetime_value_stage: LifetimeValueStage;
    revenue_state: RevenueLifecycleState;
    dropoff_risk: number;
  }>
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("revenue_lifecycles")
    .select("id")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .single();

  const row = {
    ...updates,
    updated_at: now,
  };

  if (existing) {
    await db.from("revenue_lifecycles").update(row).eq("id", (existing as { id: string }).id);
  } else {
    await db.from("revenue_lifecycles").insert({
      lead_id: leadId,
      workspace_id: workspaceId,
      first_contact_at: updates.first_contact_at ?? null,
      booked_at: updates.booked_at ?? null,
      showed_at: updates.showed_at ?? null,
      last_visit_at: updates.last_visit_at ?? null,
      next_expected_visit_at: updates.next_expected_visit_at ?? null,
      lifecycle_stage: updates.lifecycle_stage ?? "new_lead",
      lifetime_value_stage: updates.lifetime_value_stage ?? "new",
      revenue_state: updates.revenue_state ?? "potential",
      dropoff_risk: updates.dropoff_risk ?? 0,
      created_at: now,
      updated_at: now,
    });
  }
}
