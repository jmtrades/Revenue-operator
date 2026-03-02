/**
 * Channel escalation engine. Deterministic rules only. No AI decides.
 * e.g. SMS ignored → voice; voice missed → voicemail_drop; email unopened → SMS.
 */

import { getDb } from "@/lib/db/queries";
import type { ChannelType } from "@/lib/channel-policy/types";

export type EscalationTrigger = "ignored" | "missed" | "unopened" | "no_response";

const DEFAULT_ESCALATION: Record<string, ChannelType> = {
  sms: "voice",
  email: "sms",
  whatsapp: "sms",
  voice: "voicemail_drop",
  voicemail_drop: "email",
  instagram_dm: "sms",
  web_chat: "email",
};

export interface EscalationRuleRow {
  escalation_sequence_json: string[];
  timing_intervals_json: number[];
}

/**
 * Get next channel in escalation sequence for workspace/domain/stage and trigger.
 * Returns null if no rule or no next step.
 */
export async function getNextEscalationChannel(
  workspaceId: string,
  domainType: string,
  stageState: string,
  currentChannel: string,
  _trigger: EscalationTrigger
): Promise<ChannelType | null> {
  const db = getDb();
  const { data } = await db
    .from("channel_escalation_rules")
    .select("escalation_sequence_json")
    .eq("workspace_id", workspaceId)
    .eq("domain_type", domainType)
    .eq("stage_state", stageState)
    .maybeSingle();

  if (data && Array.isArray((data as { escalation_sequence_json?: unknown }).escalation_sequence_json)) {
    const seq = (data as { escalation_sequence_json: string[] }).escalation_sequence_json;
    const idx = seq.indexOf(currentChannel);
    if (idx >= 0 && idx < seq.length - 1) return seq[idx + 1] as ChannelType;
    return null;
  }

  const next = DEFAULT_ESCALATION[currentChannel] ?? null;
  return next as ChannelType | null;
}

/**
 * Get timing interval in minutes before next escalation step. Returns null if use default.
 */
export async function getEscalationTimingMinutes(
  workspaceId: string,
  domainType: string,
  stageState: string,
  stepIndex: number
): Promise<number | null> {
  const db = getDb();
  const { data } = await db
    .from("channel_escalation_rules")
    .select("timing_intervals_json")
    .eq("workspace_id", workspaceId)
    .eq("domain_type", domainType)
    .eq("stage_state", stageState)
    .maybeSingle();

  const intervals = (data as { timing_intervals_json?: number[] } | null)?.timing_intervals_json;
  if (Array.isArray(intervals) && intervals[stepIndex] != null) return intervals[stepIndex];
  return null;
}
