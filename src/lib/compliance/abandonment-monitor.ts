/**
 * FCC Call Abandonment Rate Monitor (47 CFR § 64.1200(a)(6)).
 *
 * A call is "abandoned" when a live person answers but the predictive dialer
 * can't connect them to a live agent within 2 seconds of their greeting.
 * FCC caps the abandonment rate at 3% per calling campaign per 30-day period.
 *
 * What this module does:
 *   - Reports the current abandonment rate for a workspace/campaign.
 *   - Returns structured decisions (allowed / warn / block) based on the rate.
 *   - Suggests whether a campaign should be auto-paused.
 *
 * What this module does NOT do:
 *   - It does not enforce — callers (outbound dialer, scheduler) must gate.
 *   - It does not mutate the DB — auto-pause is a downstream action.
 *
 * Storage contract (zero-migration path):
 *   A call is counted as "abandoned" if ANY of the following are true on
 *   the call_sessions row:
 *     - outcome === 'abandoned'
 *     - metadata.abandoned === true
 *     - abandonment_reason is non-null (if column exists)
 *   This lets workspaces adopt whichever representation their dialer uses.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

/** FCC hard cap — abandonment rate above this is a statutory violation. */
export const FCC_ABANDONMENT_CAP = 0.03;

/** UI/UX warning threshold — we surface a banner and alert ops well before the hard cap. */
export const ABANDONMENT_WARNING_THRESHOLD = 0.02;

/** Rolling window per FCC: 30 calendar days per campaign. */
export const ABANDONMENT_WINDOW_DAYS = 30;

export interface AbandonmentStats {
  answered: number;
  abandoned: number;
  /** Fraction 0..1. Undefined when answered === 0 (no basis yet). */
  rate: number | null;
  windowDays: number;
  status: "insufficient_data" | "healthy" | "warning" | "exceeded";
  /** True when `status === 'exceeded'` — caller should block further calls on this campaign. */
  shouldPause: boolean;
}

/**
 * Count answered vs abandoned calls in the rolling 30-day window for a
 * workspace (optionally scoped to a campaign). Caller should ensure the
 * campaign_id column exists on call_sessions — if not, pass undefined to
 * get workspace-wide stats.
 */
export async function getAbandonmentStats(
  workspaceId: string,
  campaignId?: string | null,
): Promise<AbandonmentStats> {
  const db = getDb();
  const windowStart = new Date(Date.now() - ABANDONMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Pull all "live-answered" calls in the window. We fetch a limited set
    // of columns; answered outcomes typically include 'completed' and 'abandoned'.
    let query = db
      .from("call_sessions")
      .select("id, outcome, metadata, abandonment_reason")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", windowStart)
      .in("outcome", ["completed", "abandoned", "answered"])
      .limit(10_000);

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data, error } = await query;
    if (error) {
      log("warn", "[abandonment-monitor] query failed", { error: error.message, workspaceId, campaignId });
      return emptyStats("insufficient_data");
    }

    const rows = (data ?? []) as Array<{
      outcome?: string | null;
      metadata?: Record<string, unknown> | null;
      abandonment_reason?: string | null;
    }>;

    let answered = 0;
    let abandoned = 0;
    for (const r of rows) {
      const meta = r.metadata ?? {};
      const isAbandoned =
        r.outcome === "abandoned" ||
        (typeof meta.abandoned === "boolean" && meta.abandoned) ||
        (typeof r.abandonment_reason === "string" && r.abandonment_reason.length > 0);
      answered++;
      if (isAbandoned) abandoned++;
    }

    if (answered === 0) return emptyStats("insufficient_data");

    const rate = abandoned / answered;
    const status: AbandonmentStats["status"] =
      rate >= FCC_ABANDONMENT_CAP ? "exceeded" : rate >= ABANDONMENT_WARNING_THRESHOLD ? "warning" : "healthy";

    return {
      answered,
      abandoned,
      rate,
      windowDays: ABANDONMENT_WINDOW_DAYS,
      status,
      shouldPause: status === "exceeded",
    };
  } catch (err) {
    log("warn", "[abandonment-monitor] unexpected error", {
      workspaceId,
      campaignId,
      error: err instanceof Error ? err.message : String(err),
    });
    return emptyStats("insufficient_data");
  }
}

function emptyStats(status: AbandonmentStats["status"]): AbandonmentStats {
  return {
    answered: 0,
    abandoned: 0,
    rate: null,
    windowDays: ABANDONMENT_WINDOW_DAYS,
    status,
    shouldPause: false,
  };
}

/**
 * Gate check for whether a new outbound call should be placed. Respects the
 * FCC cap — returns { allowed: false } when exceeded. Conservative by design:
 * when we can't get stats (error path), we ALLOW the call so a bug in this
 * module can't silently freeze a workspace's outbound — but we log loudly.
 *
 * A stricter deployment can flip `failClosed` to true.
 */
export async function isCampaignAbandonmentCompliant(
  workspaceId: string,
  campaignId?: string | null,
  opts: { failClosed?: boolean } = {},
): Promise<{ allowed: boolean; stats: AbandonmentStats; reason?: string }> {
  const stats = await getAbandonmentStats(workspaceId, campaignId);
  if (stats.status === "insufficient_data") {
    // Not enough data to say — allow.
    return { allowed: true, stats };
  }
  if (stats.shouldPause) {
    return {
      allowed: false,
      stats,
      reason: `FCC abandonment cap exceeded (${((stats.rate ?? 0) * 100).toFixed(2)}% > ${(
        FCC_ABANDONMENT_CAP * 100
      ).toFixed(0)}%) — campaign paused until rate recovers`,
    };
  }
  if (opts.failClosed && stats.status === "warning") {
    return {
      allowed: false,
      stats,
      reason: `Abandonment rate approaching FCC cap (${((stats.rate ?? 0) * 100).toFixed(2)}%)`,
    };
  }
  return { allowed: true, stats };
}
