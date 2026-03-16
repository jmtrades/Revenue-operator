/**
 * Progressive Autonomy Controls
 * Per-workspace: autonomy_mode, feature_flags, autonomy_ramp_day
 * observe: no sends, only simulated action logs
 * assist: drafts, approval required for sensitive/high-value
 * act: autonomous within policy and guardrails
 */

import { getDb } from "@/lib/db/queries";

export type AutonomyMode = "observe" | "assist" | "act";

export type AutonomyFeature = "followups" | "confirmations" | "winback" | "booking" | "triage";

export interface AutonomySettings {
  autonomy_mode: AutonomyMode;
  feature_flags: Record<AutonomyFeature, boolean>;
  autonomy_ramp_day: number; // 0..14
}

const DEFAULT_AUTONOMY: AutonomySettings = {
  autonomy_mode: "assist",
  feature_flags: {
    followups: true,
    confirmations: true,
    winback: true,
    booking: true,
    triage: true,
  },
  autonomy_ramp_day: 0,
};

const _cache: Map<string, { s: AutonomySettings; at: number }> = new Map();
const CACHE_TTL_MS = 60_000;

/** Responsibility tier gates max autonomy: monitor->observe, handle->assist, guarantee->act */
const RESPONSIBILITY_TO_MAX_MODE: Record<string, AutonomyMode> = {
  monitor: "observe",
  handle: "assist",
  guarantee: "act",
};

function capModeByResponsibility(mode: AutonomyMode, responsibility: string): AutonomyMode {
  const max = RESPONSIBILITY_TO_MAX_MODE[responsibility] ?? "act";
  const order: AutonomyMode[] = ["observe", "assist", "act"];
  const mi = order.indexOf(mode);
  const maxi = order.indexOf(max);
  return order[Math.min(mi, maxi)];
}

export async function getAutonomySettings(workspaceId: string): Promise<AutonomySettings> {
  const cached = _cache.get(workspaceId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.s;

  const db = getDb();
  const { data: row } = await db
    .from("settings")
    .select("autonomy_mode, feature_flags, autonomy_ramp_day, responsibility_level")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const rawMode = (row?.autonomy_mode as AutonomyMode) ?? DEFAULT_AUTONOMY.autonomy_mode;
  const responsibility = (row?.responsibility_level as string) ?? "handle";
  const mode = capModeByResponsibility(rawMode, responsibility);
  const flags = {
    ...DEFAULT_AUTONOMY.feature_flags,
    ...(row?.feature_flags as Partial<Record<AutonomyFeature, boolean>> | undefined),
  };
  const ramp = Math.max(0, Math.min(14, Number(row?.autonomy_ramp_day) ?? 0));

  const s: AutonomySettings = { autonomy_mode: mode, feature_flags: flags, autonomy_ramp_day: ramp };
  _cache.set(workspaceId, { s, at: Date.now() });
  return s;
}

/** observe: never send; only simulated action logs */
export async function shouldSimulateOnly(workspaceId: string): Promise<boolean> {
  const a = await getAutonomySettings(workspaceId);
  return a.autonomy_mode === "observe";
}

/** assist: require approval for sensitive or high-value. act: no extra approval. */
export async function shouldRequireApproval(
  workspaceId: string,
  action: string,
  options?: { isSensitive?: boolean; dealValueCents?: number }
): Promise<boolean> {
  const a = await getAutonomySettings(workspaceId);
  if (a.autonomy_mode === "observe") return true; // observe = never actually send
  if (a.autonomy_mode === "act") return false;
  // assist
  if (options?.isSensitive) return true;
  const highValue = (options?.dealValueCents ?? 0) >= 10_000_00; // $10k+
  return highValue;
}

/** Check if feature is enabled */
export async function isFeatureEnabled(workspaceId: string, feature: AutonomyFeature): Promise<boolean> {
  const a = await getAutonomySettings(workspaceId);
  return a.feature_flags[feature] ?? true;
}

/** Ramp: restrict actions until day N. Day 0 = fully restricted by ramp. */
export async function isRampComplete(workspaceId: string): Promise<boolean> {
  const a = await getAutonomySettings(workspaceId);
  if (a.autonomy_ramp_day <= 0) return true;
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("created_at").eq("id", workspaceId).maybeSingle();
  const created = ws?.created_at ? new Date(ws.created_at) : new Date();
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
  return daysSinceCreation >= a.autonomy_ramp_day;
}
