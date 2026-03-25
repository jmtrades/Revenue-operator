/**
 * Daily relief proof: last 24h continuity summary. Booleans only; no counts or metrics.
 */

import { getDb } from "@/lib/db/queries";
import { getStalledOpportunitiesRequiringAuthority } from "@/lib/opportunity-recovery";

const HOURS_24_MS = 24 * 60 * 60 * 1000;

export interface ContinuitySummary {
  followups_did_not_require_manual_check: boolean;
  commitments_reached_clear_outcome: boolean;
  customers_not_left_waiting: boolean;
}

export async function getContinuitySummary(workspaceId: string): Promise<ContinuitySummary> {
  const since = new Date(Date.now() - HOURS_24_MS).toISOString();
  const db = getDb();

  const [economicIn24h, commitmentResolvedIn24h, noReplyTimeoutIn24h, stalledNow] = await Promise.all([
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle(),
    db
      .from("commitments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("state", "resolved")
      .gte("updated_at", since)
      .limit(1)
      .maybeSingle(),
    db
      .from("events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "no_reply_timeout")
      .gte("created_at", since)
      .limit(1)
      .maybeSingle(),
    getStalledOpportunitiesRequiringAuthority(workspaceId),
  ]);

  const commitmentResolved = !!commitmentResolvedIn24h.data;

  const followupsHandled =
    !!economicIn24h?.data ||
    !!noReplyTimeoutIn24h?.data;

  return {
    followups_did_not_require_manual_check: followupsHandled,
    commitments_reached_clear_outcome: commitmentResolved,
    customers_not_left_waiting: stalledNow.length === 0,
  };
}
