/**
 * Channel policy resolver: select primary, fallback, escalation per intent.
 * Deterministic. Quiet hour enforcement from compliance pack.
 */

import { getDb } from "@/lib/db/queries";
import { resolveCompliancePack } from "@/lib/governance";
import type { ChannelPolicy, ChannelPolicyResolverInput } from "./types";
import type { ChannelType } from "./types";

const DEFAULT_POLICY: ChannelPolicy = {
  primary_channel: "sms",
  fallback_channel: "email",
  escalation_channel: "voice",
  quiet_hours_enforced: true,
  quiet_hours_tz: "UTC",
  quiet_hours_start: "21:00",
  quiet_hours_end: "08:00",
};

/**
 * Resolve channel policy for workspace + intent. Uses workspace config or defaults.
 * Quiet hours from compliance pack when available.
 */
export async function resolveChannelPolicy(
  input: ChannelPolicyResolverInput
): Promise<ChannelPolicy> {
  const { workspaceId, intentType, compliancePackQuietHours } = input;
  const db = getDb();

  let row: Record<string, unknown> | null = null;
  try {
    const { data } = await db
      .from("channel_policies")
      .select("primary_channel, fallback_channel, escalation_channel, quiet_hours_enforced, quiet_hours_tz, quiet_hours_start, quiet_hours_end")
      .eq("workspace_id", workspaceId)
      .eq("intent_type", intentType)
      .maybeSingle();
    row = data as Record<string, unknown> | null;
  } catch {
    row = null;
  }

  if (row && row.primary_channel) {
    const r = row as {
      primary_channel?: string;
      fallback_channel?: string | null;
      escalation_channel?: string;
      quiet_hours_enforced?: boolean;
      quiet_hours_tz?: string | null;
      quiet_hours_start?: string | null;
      quiet_hours_end?: string | null;
    };
    return {
      primary_channel: (r.primary_channel as ChannelType) ?? "sms",
      fallback_channel: (r.fallback_channel as ChannelType | null) ?? "email",
      escalation_channel: (r.escalation_channel as ChannelType) ?? "voice",
      quiet_hours_enforced: r.quiet_hours_enforced ?? true,
      quiet_hours_tz: compliancePackQuietHours?.tz ?? r.quiet_hours_tz ?? undefined,
      quiet_hours_start: compliancePackQuietHours?.start ?? r.quiet_hours_start ?? undefined,
      quiet_hours_end: compliancePackQuietHours?.end ?? r.quiet_hours_end ?? undefined,
    };
  }

  const compliance = await resolveCompliancePack(workspaceId);
  return {
    ...DEFAULT_POLICY,
    quiet_hours_tz: compliance.quiet_hours?.tz ?? DEFAULT_POLICY.quiet_hours_tz,
    quiet_hours_start: compliance.quiet_hours?.start ?? DEFAULT_POLICY.quiet_hours_start,
    quiet_hours_end: compliance.quiet_hours?.end ?? DEFAULT_POLICY.quiet_hours_end,
  };
}

/**
 * Check if current time is within quiet hours for the given policy. Deterministic.
 */
export function isWithinQuietHours(policy: ChannelPolicy, now?: Date): boolean {
  if (!policy.quiet_hours_enforced || !policy.quiet_hours_start || !policy.quiet_hours_end) return false;
  const tz = policy.quiet_hours_tz ?? "UTC";
  const d = now ?? new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [hour, minute] = formatter.format(d).split(":").map(Number);
  const currentMins = hour * 60 + minute;
  const [startH, startM] = policy.quiet_hours_start.split(":").map(Number);
  const [endH, endM] = policy.quiet_hours_end.split(":").map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  if (startMins > endMins) {
    return currentMins >= startMins || currentMins < endMins;
  }
  return currentMins >= startMins && currentMins < endMins;
}
