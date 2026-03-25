/**
 * Recovery aggression profile: conservative | standard | assertive.
 * No UI; use API PATCH on workspace settings.
 */

import { getDb } from "@/lib/db/queries";

export type RecoveryProfile = "conservative" | "standard" | "assertive";

export interface RecoveryTimings {
  stalledHours: number;
  lostHours: number;
  maxReviveAttempts: number;
  paymentSpacingHours: number;
  commitmentReminderHours: number;
}

const TIMINGS: Record<RecoveryProfile, RecoveryTimings> = {
  conservative: { stalledHours: 18, lostHours: 72, maxReviveAttempts: 2, paymentSpacingHours: 24, commitmentReminderHours: 24 },
  standard: { stalledHours: 12, lostHours: 60, maxReviveAttempts: 3, paymentSpacingHours: 12, commitmentReminderHours: 12 },
  assertive: { stalledHours: 6, lostHours: 36, maxReviveAttempts: 4, paymentSpacingHours: 8, commitmentReminderHours: 6 },
};

export async function getRecoveryProfile(workspaceId: string): Promise<RecoveryProfile> {
  const db = getDb();
  const { data } = await db
    .from("settings")
    .select("recovery_profile")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const p = (data as { recovery_profile?: RecoveryProfile } | null)?.recovery_profile;
  return p && TIMINGS[p] ? p : "standard";
}

export function getRecoveryTimings(profile: RecoveryProfile): RecoveryTimings {
  return TIMINGS[profile];
}

export async function getRecoveryTimingsForWorkspace(workspaceId: string): Promise<RecoveryTimings> {
  const profile = await getRecoveryProfile(workspaceId);
  return getRecoveryTimings(profile);
}
