/**
 * Workspace rate ceiling enforcement. Deterministic; no randomness.
 */

import { getDb } from "@/lib/db/queries";

export class RateLimitExceededError extends Error {
  readonly reason = "rate_limit_exceeded";
  constructor() {
    super("workspace_rate_limit_exceeded");
  }
}

export type RateKind = "message" | "voice";

export async function assertWithinRateLimit(workspaceId: string, kind: RateKind): Promise<boolean> {
  const db = getDb();

  const { data: limits } = await db
    .from("workspace_rate_limits")
    .select("max_outbound_per_hour, max_voice_per_hour")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!limits) {
    // No configured limits → no ceiling enforced (ops can set row to activate).
    return true;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  if (kind === "message") {
    const max = (limits as { max_outbound_per_hour: number }).max_outbound_per_hour;
    const { count } = await db
      .from("action_intents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("intent_type", "send_message")
      .gte("created_at", windowStart);
    if ((count ?? 0) >= max) {
      throw new RateLimitExceededError();
    }
  } else if (kind === "voice") {
    const max = (limits as { max_voice_per_hour: number }).max_voice_per_hour;
    const { count } = await db
      .from("action_intents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("intent_type", "place_outbound_call")
      .gte("created_at", windowStart);
    if ((count ?? 0) >= max) {
      throw new RateLimitExceededError();
    }
  }

  return true;
}

