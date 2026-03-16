/**
 * Disinterest detection: soft negative signals.
 * When detected → LOW_PRESSURE_MODE: double intervals, max 1 msg/72h, passive check-ins only.
 */

import { getDb } from "@/lib/db/queries";

const DISINTEREST_SIGNALS = [
  /\b(?:later|later on)\b/i,
  /\b(?:busy|swamped|overwhelmed)\b/i,
  /\b(?:not now|not right now)\b/i,
  /\b(?:maybe|perhaps|we'll see)\b/i,
  /\b(?:i'll think|let me think|need to think)\b/i,
  /\b(?:reach out when|ping me when)\b/i,
  /\b(?:not interested|no thanks|pass)\b/i,
  /\b(?:maybe next (?:week|month|quarter))\b/i,
  /\b(?:things (?:are|got) (?:crazy|busy))\b/i,
  /^ok$/i,
  /^no$/i,
  /^maybe\.?$/i,
];

export interface DisinterestResult {
  detected: boolean;
  signal?: string;
  lowPressureMode: boolean;
}

/**
 * Detect disinterest in last user message.
 */
export function detectDisinterest(lastUserMessage: string | null | undefined): DisinterestResult {
  if (!lastUserMessage || typeof lastUserMessage !== "string") {
    return { detected: false, lowPressureMode: false };
  }

  const trimmed = lastUserMessage.trim();
  if (trimmed.length < 2) {
    return { detected: true, signal: "short_reply", lowPressureMode: true };
  }

  for (const pattern of DISINTEREST_SIGNALS) {
    if (pattern.test(trimmed)) {
      return {
        detected: true,
        signal: trimmed.slice(0, 50),
        lowPressureMode: true,
      };
    }
  }

  return { detected: false, lowPressureMode: false };
}

/**
 * Check if lead is in low-pressure mode (from DB or recent detection).
 */
export async function isLowPressureMode(
  workspaceId: string,
  leadId: string
): Promise<boolean> {
  const db = getDb();

  // Check lead metadata
  const { data: lead } = await db
    .from("leads")
    .select("metadata")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const meta = (lead as { metadata?: { low_pressure_mode?: boolean } })?.metadata;
  return meta?.low_pressure_mode === true;
}

/**
 * Set low-pressure mode for a lead.
 */
export async function setLowPressureMode(
  workspaceId: string,
  leadId: string,
  enabled: boolean
): Promise<void> {
  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("metadata")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const meta = (lead as { metadata?: Record<string, unknown> })?.metadata ?? {};
  await db
    .from("leads")
    .update({
      metadata: { ...meta, low_pressure_mode: enabled },
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("workspace_id", workspaceId);

}
