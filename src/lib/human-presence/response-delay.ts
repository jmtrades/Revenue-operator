/**
 * Response Delay Engine — human timing before sending.
 * Humans do not reply instantly every time. Base delay by state + ±40% randomness.
 * Anti-pattern: never use the same delay twice in a row.
 */

import { getDb } from "@/lib/db/queries";
import type { ConversationState } from "@/lib/conversation-state/resolver";

/** Base delay ranges by state (min and max in seconds). */
const DELAY_BY_STATE: Record<ConversationState, { min: number; max: number }> = {
  NEW_INTEREST: { min: 20, max: 90 },
  CLARIFICATION: { min: 30, max: 120 },
  CONSIDERING: { min: 2 * 60, max: 6 * 60 },
  SOFT_OBJECTION: { min: 3 * 60, max: 10 * 60 },
  HARD_OBJECTION: { min: 3 * 60, max: 10 * 60 },
  DRIFT: { min: 30 * 60, max: 120 * 60 },
  COMMITMENT: { min: 20, max: 90 },
  POST_BOOKING: { min: 30, max: 120 },
  NO_SHOW: { min: 2 * 3600, max: 8 * 3600 },
  COLD: { min: 24 * 3600, max: 3 * 24 * 3600 },
};

const RANDOMIZATION_FACTOR = 0.4; // ±40%

function clamp(min: number, max: number, value: number): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

/**
 * Compute humanized delay in seconds. Applies ±40% and avoids repeating last delay.
 */
export function computeResponseDelaySeconds(
  state: ConversationState,
  momentumMultiplier: number = 1
): number {
  const range = DELAY_BY_STATE[state] ?? DELAY_BY_STATE.NEW_INTEREST;
  const span = range.max - range.min;
  const center = range.min + span * 0.5;
  const halfSpread = span * RANDOMIZATION_FACTOR * 0.5;
  const raw = center + (Math.random() * 2 - 1) * halfSpread;
  const withMomentum = raw * momentumMultiplier;
  return clamp(range.min, range.max, withMomentum);
}

/**
 * Get last used delay for this lead (to avoid repetition).
 */
export async function getLastResponseDelaySeconds(leadId: string): Promise<number | null> {
  const db = getDb();
  const { data } = await db
    .from("human_presence_meta")
    .select("last_delay_used_seconds")
    .eq("lead_id", leadId)
    .single();
  const v = (data as { last_delay_used_seconds?: number } | null)?.last_delay_used_seconds;
  return v != null ? v : null;
}

/**
 * Resolve final delay: if candidate is too close to last used, nudge away.
 */
export async function resolveHumanizedDelay(
  leadId: string,
  state: ConversationState,
  momentumMultiplier: number = 1
): Promise<{ delaySeconds: number; sendAt: Date }> {
  const lastDelay = await getLastResponseDelaySeconds(leadId);
  let delaySeconds = computeResponseDelaySeconds(state, momentumMultiplier);

  // Anti-pattern: avoid same interval (within 15% tolerance)
  if (lastDelay != null && Math.abs(delaySeconds - lastDelay) < Math.max(10, lastDelay * 0.15)) {
    const nudge = lastDelay * 0.2 + 5;
    delaySeconds = delaySeconds <= lastDelay ? Math.max(10, delaySeconds - nudge) : delaySeconds + nudge;
    delaySeconds = Math.round(delaySeconds);
  }

  const sendAt = new Date(Date.now() + delaySeconds * 1000);
  return { delaySeconds, sendAt };
}

/**
 * Persist delay after we've committed to sending (called when we enqueue or when worker sends).
 */
export async function recordResponseDelay(
  leadId: string,
  delaySeconds: number
): Promise<void> {
  const db = getDb();
  await db
    .from("human_presence_meta")
    .upsert(
      {
        lead_id: leadId,
        last_response_delay_seconds: delaySeconds,
        last_send_at: new Date().toISOString(),
        last_delay_used_seconds: delaySeconds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );
}
