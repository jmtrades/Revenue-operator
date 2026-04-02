/**
 * Cron: Cold Lead Sweep
 *
 * Automatically populates cold_lead_queue by scanning the leads table for:
 * 1. Leads not contacted in 30+ days (reason: no_activity_30d)
 * 2. Leads with no reply after 14+ days (reason: no_reply_14d)
 * 3. Lost deals (reason: lost_deal)
 * 4. Inbound calls that didn't convert within 7+ days (reason: inbound_no_convert)
 *
 * Runs on a schedule (recommended: every 6 hours).
 * Skips leads already in cold_lead_queue or opted-out.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

interface SweepResult {
  no_activity_30d: number;
  no_reply_14d: number;
  lost_deal: number;
  inbound_no_convert: number;
  total_added: number;
  skipped_existing: number;
  duration_ms: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const start = Date.now();
  const db = getDb();
  const now = new Date().toISOString();

  const result: SweepResult = {
    no_activity_30d: 0,
    no_reply_14d: 0,
    lost_deal: 0,
    inbound_no_convert: 0,
    total_added: 0,
    skipped_existing: 0,
    duration_ms: 0,
  };

  try {
    // Get all workspaces that have active leads
    const { data: workspaces, error: wsErr } = await db
      .from("workspaces")
      .select("id");

    if (wsErr || !workspaces?.length) {
      return NextResponse.json({
        ok: true,
        message: "No workspaces found",
        ...result,
        duration_ms: Date.now() - start,
      });
    }

    const workspaceIds = (workspaces as Array<{ id: string }>).map((w) => w.id);

    // Fetch all existing cold_lead_queue entries to avoid duplicates
    const { data: existingEntries } = await db
      .from("cold_lead_queue")
      .select("lead_id")
      .in("workspace_id", workspaceIds);

    const existingLeadIds = new Set(
      (existingEntries ?? []).map((e: { lead_id: string }) => e.lead_id)
    );

    const recordsToInsert: Array<{
      lead_id: string;
      workspace_id: string;
      status: string;
      reason: string;
      priority: string;
      attempts: number;
      max_attempts: number;
      created_at: string;
      updated_at: string;
    }> = [];

    // --- 1. Leads with no activity in 30+ days ---
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: staleLeads } = await db
      .from("leads")
      .select("id, workspace_id, state")
      .in("workspace_id", workspaceIds)
      .in("state", ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED"])
      .eq("opt_out", false)
      .lt("last_activity_at", thirtyDaysAgo)
      .limit(500);

    for (const lead of (staleLeads ?? []) as Array<{
      id: string;
      workspace_id: string;
      state: string;
    }>) {
      if (existingLeadIds.has(lead.id)) {
        result.skipped_existing++;
        continue;
      }
      existingLeadIds.add(lead.id);
      recordsToInsert.push({
        lead_id: lead.id,
        workspace_id: lead.workspace_id,
        status: "pending",
        reason: "no_activity_30d",
        priority: "high",
        attempts: 0,
        max_attempts: 6,
        created_at: now,
        updated_at: now,
      });
      result.no_activity_30d++;
    }

    // --- 2. Leads contacted but no reply in 14+ days ---
    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: noReplyLeads } = await db
      .from("leads")
      .select("id, workspace_id, state")
      .in("workspace_id", workspaceIds)
      .in("state", ["CONTACTED", "REACTIVATE"])
      .eq("opt_out", false)
      .lt("last_activity_at", fourteenDaysAgo)
      .limit(500);

    for (const lead of (noReplyLeads ?? []) as Array<{
      id: string;
      workspace_id: string;
      state: string;
    }>) {
      if (existingLeadIds.has(lead.id)) {
        result.skipped_existing++;
        continue;
      }
      existingLeadIds.add(lead.id);
      recordsToInsert.push({
        lead_id: lead.id,
        workspace_id: lead.workspace_id,
        status: "pending",
        reason: "no_reply_14d",
        priority: "medium",
        attempts: 0,
        max_attempts: 6,
        created_at: now,
        updated_at: now,
      });
      result.no_reply_14d++;
    }

    // --- 3. Lost deals ---
    const { data: lostDeals } = await db
      .from("deals")
      .select("lead_id, workspace_id")
      .in("workspace_id", workspaceIds)
      .eq("status", "lost")
      .limit(500);

    for (const deal of (lostDeals ?? []) as Array<{
      lead_id: string;
      workspace_id: string;
    }>) {
      if (!deal.lead_id || existingLeadIds.has(deal.lead_id)) {
        if (deal.lead_id) result.skipped_existing++;
        continue;
      }

      // Check the lead is not opted out
      const { data: leadCheck } = await db
        .from("leads")
        .select("id, opt_out")
        .eq("id", deal.lead_id)
        .eq("opt_out", false)
        .maybeSingle();

      if (!leadCheck) continue;

      existingLeadIds.add(deal.lead_id);
      recordsToInsert.push({
        lead_id: deal.lead_id,
        workspace_id: deal.workspace_id,
        status: "pending",
        reason: "lost_deal",
        priority: "medium",
        attempts: 0,
        max_attempts: 6,
        created_at: now,
        updated_at: now,
      });
      result.lost_deal++;
    }

    // --- 4. Inbound calls that didn't convert (7+ days old, still NEW) ---
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: inboundLeads } = await db
      .from("leads")
      .select("id, workspace_id, metadata")
      .in("workspace_id", workspaceIds)
      .in("state", ["NEW"])
      .eq("opt_out", false)
      .lt("created_at", sevenDaysAgo)
      .limit(500);

    for (const lead of (inboundLeads ?? []) as Array<{
      id: string;
      workspace_id: string;
      metadata?: { source?: string } | null;
    }>) {
      if (existingLeadIds.has(lead.id)) {
        result.skipped_existing++;
        continue;
      }

      const source = lead.metadata?.source ?? "";
      const isInbound = [
        "inbound_call",
        "missed_call",
        "voicemail",
        "website",
        "form",
        "landing_page",
      ].includes(source);

      if (!isInbound) continue;

      existingLeadIds.add(lead.id);
      recordsToInsert.push({
        lead_id: lead.id,
        workspace_id: lead.workspace_id,
        status: "pending",
        reason: "no_reply_14d",
        priority: "high",
        attempts: 0,
        max_attempts: 6,
        created_at: now,
        updated_at: now,
      });
      result.inbound_no_convert++;
    }

    // --- Batch insert ---
    if (recordsToInsert.length > 0) {
      // Insert in chunks of 100 to avoid payload limits
      const chunkSize = 100;
      for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
        const chunk = recordsToInsert.slice(i, i + chunkSize);
        const { error: insertErr } = await db
          .from("cold_lead_queue")
          .insert(chunk);

        if (insertErr) {
          log("error", "[cold-lead-sweep] Batch insert failed:", {
            error: insertErr.message,
            chunk_index: i,
          });
        }
      }
      result.total_added = recordsToInsert.length;
    }

    result.duration_ms = Date.now() - start;

    log("info", "[cold-lead-sweep] Completed", {
      ...result,
    });

    return NextResponse.json({
      ok: true,
      message: `Cold lead sweep completed. Added ${result.total_added} leads to queue.`,
      ...result,
    });
  } catch (error) {
    log("error", "[cold-lead-sweep] Unexpected error:", { error });
    return NextResponse.json(
      {
        error: "Cold lead sweep failed",
        duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
