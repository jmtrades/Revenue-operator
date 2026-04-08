/**
 * Campaign execution: process active campaigns — fetch uncalled leads, trigger real outbound calls.
 * Runs on cron schedule. Respects daily limits per billing tier.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { BILLING_PLANS, normalizeTier } from "@/lib/billing-plans";

/** Max calls to trigger per cron tick per campaign (keep bounded but allow mass operations) */
const MAX_PER_TICK = 25;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;
  const db = getDb();
  let processed = 0;
  let failed = 0;
  let throttledWorkspaces = 0;
  try {
    // Check for backpressure: count active calls in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: activeCalls } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress")
      .gte("call_started_at", fiveMinutesAgo);

    const activeCallCount = activeCalls ?? 0;
    if (activeCallCount > 50) {
      log("info", "campaign_cron_backpressure", {
        active_calls: activeCallCount,
        threshold: 50,
        skipping_tick: true
      });
      return NextResponse.json({
        ok: true,
        processed,
        failed,
        throttled_workspaces: throttledWorkspaces,
        backpressure: true,
        active_calls: activeCallCount
      });
    }

    const { data: active } = await db
      .from("outbound_campaigns")
      .select("id, workspace_id, total_leads, leads_called, type, metadata")
      .eq("status", "active")
      .limit(50);
    const activeRows = (active ?? []) as Array<{
      id: string;
      workspace_id: string;
      total_leads: number;
      leads_called: number;
      type?: string;
      metadata?: Record<string, unknown>;
    }>;
    if (activeRows.length === 0) {
      return NextResponse.json({ ok: true, processed, failed, throttled_workspaces: throttledWorkspaces });
    }

    const workspaceIds = [...new Set(activeRows.map((r) => r.workspace_id))];
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id, billing_tier")
      .in("id", workspaceIds);
    const tierByWorkspace = new Map(
      ((workspaces ?? []) as Array<{ id: string; billing_tier?: string | null }>).map((w) => [
        w.id,
        normalizeTier(w.billing_tier),
      ]),
    );

    const counterDate = new Date().toISOString().slice(0, 10);
    const { data: existingCounters } = await db
      .from("campaign_daily_counters")
      .select("workspace_id, campaign_id, calls_made")
      .eq("date_key", counterDate)
      .in("workspace_id", workspaceIds);
    // Sum calls per workspace across all campaigns for daily limit check
    const processedByWorkspace = new Map<string, number>();
    for (const r of ((existingCounters ?? []) as Array<{ workspace_id: string; campaign_id: string | null; calls_made: number }>)) {
      processedByWorkspace.set(r.workspace_id, (processedByWorkspace.get(r.workspace_id) ?? 0) + (Number(r.calls_made) || 0));
    }
    // Track calls per campaign for upsert
    const callsByCampaign = new Map<string, number>();

    // Lazy-import to avoid circular dependencies at module level
    const { executeLeadOutboundCall } = await import("@/lib/outbound/execute-lead-call");

    for (const row of activeRows) {
      const tier = tierByWorkspace.get(row.workspace_id) ?? "solo";
      const plan = BILLING_PLANS[tier];
      const dailyCap = plan.outboundDailyLimit === -1 ? Infinity : plan.outboundDailyLimit;
      const used = processedByWorkspace.get(row.workspace_id) ?? 0;
      const workspaceRemaining = Math.max(0, dailyCap - used);
      if (workspaceRemaining <= 0) {
        throttledWorkspaces += 1;
        continue;
      }

      // Only complete if total_leads > 0 and all have been called. Don't auto-complete new campaigns with 0 leads.
      const totalLeads = Number(row.total_leads || 0);
      const leadsCalled = Number(row.leads_called || 0);
      if (totalLeads > 0 && leadsCalled >= totalLeads) {
        // Campaign exhausted — mark as completed
        await db.from("outbound_campaigns").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", row.id);
        continue;
      }

      const campaignRemaining = Math.max(0, totalLeads - leadsCalled);
      if (campaignRemaining <= 0) {
        // No leads to process this tick — continue to next campaign
        continue;
      }

      const toProcess = Math.min(workspaceRemaining, campaignRemaining, MAX_PER_TICK);
      if (toProcess <= 0) continue;

      // Fetch uncalled leads for this campaign
      const { data: campaignLeads } = await db
        .from("campaign_leads")
        .select("id, lead_id")
        .eq("campaign_id", row.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(toProcess);

      const leads = (campaignLeads ?? []) as Array<{ id: string; lead_id: string }>;
      if (leads.length === 0) {
        // No more pending leads — mark campaign completed
        await db.from("outbound_campaigns").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", row.id);
        continue;
      }

      const campaignType = (row.type ?? "lead_followup") as import("@/lib/campaigns/prompt").CampaignType;
      let callsMade = 0;

      for (const cl of leads) {
        try {
          // Pre-check: skip leads that have opted out since campaign launch
          const { data: leadCheck } = await db
            .from("leads")
            .select("opt_out")
            .eq("id", cl.lead_id)
            .maybeSingle();
          if ((leadCheck as { opt_out?: boolean } | null)?.opt_out === true) {
            await db.from("campaign_leads").update({ status: "skipped", updated_at: new Date().toISOString() }).eq("id", cl.id);
            continue;
          }

          // Mark lead as in-progress
          await db.from("campaign_leads").update({ status: "calling", updated_at: new Date().toISOString() }).eq("id", cl.id);

          const result = await executeLeadOutboundCall(row.workspace_id, cl.lead_id, {
            campaignType,
          });

          if (result.ok) {
            await db.from("campaign_leads").update({
              status: "called",
              call_session_id: result.call_session_id,
              updated_at: new Date().toISOString(),
            }).eq("id", cl.id);
            callsMade++;
            processed++;
          } else {
            // Handle TCPA quiet hours separately — mark as retry_later instead of failed
            if (result.error === "blocked_tcpa_hours") {
              await db.from("campaign_leads").update({
                status: "retry_later",
                error_message: "TCPA quiet hours — will retry during compliant window",
                updated_at: new Date().toISOString(),
              }).eq("id", cl.id);
              log("info", "campaign_lead_tcpa_blocked", {
                campaign_id: row.id,
                lead_id: cl.lead_id,
              });
            } else {
              await db.from("campaign_leads").update({
                status: "failed",
                error_message: result.error,
                updated_at: new Date().toISOString(),
              }).eq("id", cl.id);
              failed++;
            }
          }
        } catch (err) {
          log("error", "campaign_call_error", {
            campaign_id: row.id,
            lead_id: cl.lead_id,
            error: err instanceof Error ? err.message : String(err),
          });
          await db.from("campaign_leads").update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Unknown error",
            updated_at: new Date().toISOString(),
          }).eq("id", cl.id);
          failed++;
        }
      }

      // Update campaign counter
      const nextCalled = Number(row.leads_called || 0) + callsMade;
      await db
        .from("outbound_campaigns")
        .update({ leads_called: nextCalled, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      processedByWorkspace.set(row.workspace_id, used + callsMade);
      callsByCampaign.set(row.id, (callsByCampaign.get(row.id) ?? 0) + callsMade);
    }

    // Upsert per-campaign daily counters (matches unique constraint: workspace_id, campaign_id, date_key)
    const counterRows: Array<{ workspace_id: string; campaign_id: string; date_key: string; calls_made: number }> = [];
    for (const campaignRow of activeRows) {
      const calls = callsByCampaign.get(campaignRow.id);
      if (calls && calls > 0) {
        counterRows.push({
          workspace_id: campaignRow.workspace_id,
          campaign_id: campaignRow.id,
          date_key: counterDate,
          calls_made: calls,
        });
      }
    }
    if (counterRows.length > 0) {
      await db
        .from("campaign_daily_counters")
        .upsert(counterRows, { onConflict: "workspace_id,campaign_id,date_key" });
    }
  } catch (err) {
    log("error", "campaign_process_cron_error", { error: err instanceof Error ? err.message : String(err) });
  }
  return NextResponse.json({ ok: true, processed, failed, throttled_workspaces: throttledWorkspaces });
}
