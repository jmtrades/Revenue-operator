import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Cron: Process outbound dialer queues.
 * Runs every 2 minutes. Picks up active campaigns from outbound_campaigns table
 * and dials next pending leads via campaign_leads junction.
 */
export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  let callsInitiated = 0;

  try {
    // Query active campaigns from the outbound_campaigns table (not workspace metadata)
    const { data: campaigns } = await db
      .from("outbound_campaigns")
      .select("id, workspace_id, type, metadata")
      .eq("status", "active")
      .limit(50);

    const activeCampaigns = (campaigns ?? []) as Array<{
      id: string;
      workspace_id: string;
      type?: string;
      metadata?: Record<string, unknown>;
    }>;

    if (activeCampaigns.length === 0) {
      return NextResponse.json({ ok: true, callsInitiated: 0 });
    }

    // Lazy-import to avoid circular dependencies at module level
    const { executeLeadOutboundCall } = await import("@/lib/outbound/execute-lead-call");

    for (const campaign of activeCampaigns) {
      const maxConcurrent = (campaign.metadata?.max_concurrent_calls as number) ?? 3;

      // Fetch next pending leads from campaign_leads junction table
      const { data: pendingLeads } = await db
        .from("campaign_leads")
        .select("id, lead_id")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(maxConcurrent);

      const leads = (pendingLeads ?? []) as Array<{ id: string; lead_id: string }>;
      if (leads.length === 0) continue;

      for (const cl of leads) {
        try {
          // Mark lead as in-progress
          await db.from("campaign_leads").update({
            status: "calling",
            updated_at: new Date().toISOString(),
          }).eq("id", cl.id);

          const result = await executeLeadOutboundCall(
            campaign.workspace_id,
            cl.lead_id,
            {
              campaignType: (campaign.type as import("@/lib/campaigns/prompt").CampaignType) ?? "lead_followup",
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
