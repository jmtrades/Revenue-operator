import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Cron: Process outbound dialer queues with lead-adaptive intelligence.
 * Runs every 2 minutes. Picks up active campaigns from outbound_campaigns table,
 * prioritizes leads by score, applies state/time/limit filters, and dials next pending leads.
 * Lead context (state, score, tags, notes, call history) is passed to the call execution.
 */

type LeadState = "NEW" | "CONTACTED" | "QUALIFIED" | "CUSTOMER" | "OPTED_OUT" | "DO_NOT_CALL";
export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  let callsInitiated = 0;

  try {
    // Query active campaigns from the outbound_campaigns table (not workspace metadata)
    const { data: campaigns } = await db
      .from("outbound_campaigns")
      .select("id, workspace_id, type, metadata, timezone")
      .eq("status", "active")
      .limit(50);

    const activeCampaigns = (campaigns ?? []) as Array<{
      id: string;
      workspace_id: string;
      type?: string;
      timezone?: string;
      metadata?: Record<string, unknown>;
    }>;

    if (activeCampaigns.length === 0) {
      return NextResponse.json({ ok: true, callsInitiated: 0 });
    }

    // Lazy-import to avoid circular dependencies at module level
    const { executeLeadOutboundCall } = await import("@/lib/outbound/execute-lead-call");

    for (const campaign of activeCampaigns) {
      const maxConcurrent = (campaign.metadata?.max_concurrent_calls as number) ?? 3;
      const dailyLimit = (campaign.metadata?.daily_limit as number) ?? null;
      const callWindowStart = (campaign.metadata?.call_window_start as number) ?? 9; // 9am default
      const callWindowEnd = (campaign.metadata?.call_window_end as number) ?? 18; // 6pm default
      const tz = campaign.timezone ?? "UTC";

      // Check business hours for this campaign/workspace
      if (!isWithinCallWindow(callWindowStart, callWindowEnd, tz)) {
        log("info", "cron.outbound_dialer.outside_call_window", {
          campaign_id: campaign.id,
          timezone: tz,
        });
        continue;
      }

      // Check daily call limit
      if (dailyLimit && dailyLimit > 0) {
        const { count: callsToday } = await db
          .from("campaign_leads")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .in("status", ["calling", "called"])
          .gte("updated_at", getTodayStart(tz));

        if ((callsToday ?? 0) >= dailyLimit) {
          log("info", "cron.outbound_dialer.daily_limit_reached", {
            campaign_id: campaign.id,
            limit: dailyLimit,
            today: callsToday,
          });
          continue;
        }
      }

      // Fetch next pending leads with lead data, ordered by score (highest first)
      const { data: pendingLeads } = await db
        .from("campaign_leads")
        .select(
          `
          id,
          lead_id,
          leads!inner(
            id,
            name,
            phone,
            company,
            state,
            qualification_score,
            last_activity_at
          )
          `
        )
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .order("leads.qualification_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(maxConcurrent);

      const leads = (pendingLeads ?? []) as unknown as Array<{
        id: string;
        lead_id: string;
        leads: {
          id: string;
          name?: string;
          phone?: string;
          company?: string;
          state?: LeadState;
          qualification_score?: number;
          last_activity_at?: string;
        };
      }>;

      if (leads.length === 0) continue;

      for (const cl of leads) {
        const leadData = cl.leads;

        // Skip leads in blocked states
        if (leadData.state === "OPTED_OUT" || leadData.state === "DO_NOT_CALL") {
          log("info", "cron.outbound_dialer.lead_skipped", {
            campaign_id: campaign.id,
            lead_id: cl.lead_id,
            reason: `state_${leadData.state}`,
          });
          await db.from("campaign_leads").update({
            status: "skipped",
            updated_at: new Date().toISOString(),
          }).eq("id", cl.id);
          continue;
        }

        try {
          // Mark lead as in-progress
          await db.from("campaign_leads").update({
            status: "calling",
            updated_at: new Date().toISOString(),
          }).eq("id", cl.id);

          // Load previous call history for this lead
          const { data: callHistory } = await db
            .from("call_sessions")
            .select("outcome, summary")
            .eq("lead_id", cl.lead_id)
            .not("call_ended_at", "is", null)
            .order("call_started_at", { ascending: false })
            .limit(3);

          const result = await executeLeadOutboundCall(
            campaign.workspace_id,
            cl.lead_id,
            {
              campaignType: (campaign.type as import("@/lib/campaigns/prompt").CampaignType) ?? "lead_followup",
              campaignPromptOptions: {
                previousCallCount: (callHistory ?? []).length,
                previousCallOutcomes: callHistory ?? [],
              },
            },
          );

          if (result.ok) {
            await db.from("campaign_leads").update({
              status: "called",
              call_session_id: result.call_session_id,
              updated_at: new Date().toISOString(),
            }).eq("id", cl.id);
            callsInitiated++;
          } else {
            await db.from("campaign_leads").update({
              status: "failed",
              error_message: result.error,
              updated_at: new Date().toISOString(),
            }).eq("id", cl.id);
          }
        } catch (err) {
          log("error", "cron.outbound_dialer.call_error", {
            campaign_id: campaign.id,
            lead_id: cl.lead_id,
            error: err instanceof Error ? err.message : String(err),
          });
          await db.from("campaign_leads").update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Unknown error",
            updated_at: new Date().toISOString(),
          }).eq("id", cl.id);
        }
      }
    }

    log("info", "cron.outbound_dialer", { callsInitiated });
    return NextResponse.json({ ok: true, callsInitiated });
  } catch (err) {
    log("error", "cron.outbound_dialer.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/**
 * Check if current time is within call window for given timezone.
 * Returns true if within window, false otherwise.
 */
function isWithinCallWindow(startHour: number, endHour: number, timezone: string): boolean {
  try {
    const now = new Date();
    // Simple approach: get current hour in the given timezone
    const formatter = new Intl.DateTimeFormat("en-US", { hour: "2-digit", timeZone: timezone, hour12: false });
    const hourStr = formatter.format(now);
    const currentHour = parseInt(hourStr, 10);
    return currentHour >= startHour && currentHour < endHour;
  } catch (err) {
    // If timezone parsing fails, assume we're within window
    log("warn", "cron.outbound_dialer.timezone_parse_failed", { timezone });
    return true;
  }
}

/**
 * Get start of today (00:00:00) in the given timezone.
 */
function getTodayStart(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const [year, month, day] = formatter.format(now).split("-");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}
