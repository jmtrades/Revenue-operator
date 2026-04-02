/**
 * POST /api/cold-leads/sync — Auto-sync leads in REACTIVATE, LOST, or CONTACTED state into cold_lead_queue.
 * Query leads not contacted in 14+ days and add them to the queue if not already present.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

interface SyncRequest {
  workspace_id?: string;
}

interface SyncResponse {
  synced: number;
  total_cold: number;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json(
      { synced: 0, total_cold: 0, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: SyncRequest = {};
  try {
    body = await req.json();
  } catch {
    // Request body is optional
  }

  const workspaceId = body.workspace_id || session.workspaceId;

  // Verify workspace access for provided workspace_id
  if (body.workspace_id && body.workspace_id !== session.workspaceId) {
    const authErr = await requireWorkspaceAccess(req, body.workspace_id);
    if (authErr) return authErr;
  }

  const db = getDb();

  try {
    const now = new Date().toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Collect all candidate leads from multiple sources
    type CandidateLead = { id: string; reason: string; priority: string };
    const candidates: CandidateLead[] = [];

    // 1. Leads in REACTIVATE, LOST, or CONTACTED state inactive 14+ days
    const { data: coldLeads, error: queryErr } = await db
      .from("leads")
      .select("id, state, last_activity_at")
      .eq("workspace_id", workspaceId)
      .in("state", ["REACTIVATE", "LOST", "CONTACTED"])
      .eq("opt_out", false)
      .lt("last_activity_at", fourteenDaysAgo);

    if (queryErr) {
      log("error", "[cold-leads-sync] Query failed:", { error: queryErr.message });
      return NextResponse.json(
        { synced: 0, total_cold: 0, error: "Failed to query leads" },
        { status: 500 }
      );
    }

    for (const lead of (coldLeads ?? []) as Array<{ id: string; state: string }>) {
      let reason: string;
      let priority: string;
      switch (lead.state) {
        case "REACTIVATE":
          reason = "no_activity_30d";
          priority = "high";
          break;
        case "LOST":
          reason = "lost_deal";
          priority = "medium";
          break;
        case "CONTACTED":
          reason = "no_reply_14d";
          priority = "low";
          break;
        default:
          reason = "no_activity_30d";
          priority = "medium";
      }
      candidates.push({ id: lead.id, reason, priority });
    }

    // 2. Leads with no activity in 30+ days (NEW, ENGAGED, QUALIFIED states)
    const { data: staleLeads } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("state", ["NEW", "ENGAGED", "QUALIFIED"])
      .eq("opt_out", false)
      .lt("last_activity_at", thirtyDaysAgo)
      .limit(200);

    for (const lead of (staleLeads ?? []) as Array<{ id: string }>) {
      candidates.push({ id: lead.id, reason: "no_activity_30d", priority: "high" });
    }

    // 3. Lost deals
    const { data: lostDeals } = await db
      .from("deals")
      .select("lead_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "lost")
      .limit(200);

    for (const deal of (lostDeals ?? []) as Array<{ lead_id: string }>) {
      if (deal.lead_id) {
        candidates.push({ id: deal.lead_id, reason: "lost_deal", priority: "medium" });
      }
    }

    // 4. Inbound calls that didn't convert (NEW state, 7+ days old, inbound source)
    const { data: inboundLeads } = await db
      .from("leads")
      .select("id, metadata")
      .eq("workspace_id", workspaceId)
      .in("state", ["NEW"])
      .eq("opt_out", false)
      .lt("created_at", sevenDaysAgo)
      .limit(200);

    for (const lead of (inboundLeads ?? []) as Array<{ id: string; metadata?: { source?: string } | null }>) {
      const source = lead.metadata?.source ?? "";
      if (["inbound_call", "missed_call", "voicemail", "website", "form", "landing_page"].includes(source)) {
        candidates.push({ id: lead.id, reason: "inbound_no_convert", priority: "high" });
      }
    }

    // De-duplicate by lead id (first match wins)
    const seen = new Set<string>();
    const uniqueCandidates = candidates.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    if (uniqueCandidates.length === 0) {
      return NextResponse.json({ synced: 0, total_cold: 0 });
    }

    const leadIds = uniqueCandidates.map((c) => c.id);

    // Check which leads are already in cold_lead_queue
    const { data: existingQueue } = await db
      .from("cold_lead_queue")
      .select("lead_id")
      .eq("workspace_id", workspaceId)
      .in("lead_id", leadIds);

    const existingLeadIds = new Set((existingQueue ?? []).map((q: { lead_id: string }) => q.lead_id));

    // Filter out leads already in queue
    const leadsToAdd = uniqueCandidates.filter((c) => !existingLeadIds.has(c.id));

    if (leadsToAdd.length === 0) {
      return NextResponse.json({ synced: 0, total_cold: leadIds.length });
    }

    // Build insert records
    const recordsToInsert = leadsToAdd.map((c) => ({
      lead_id: c.id,
      workspace_id: workspaceId,
      status: "pending",
      reason: c.reason,
      priority: c.priority,
      attempts: 0,
      max_attempts: 6,
      created_at: now,
      updated_at: now,
    }));

    // Insert records into cold_lead_queue
    const { error: insertErr } = await db
      .from("cold_lead_queue")
      .insert(recordsToInsert);

    if (insertErr) {
      log("error", "[cold-leads-sync] Insert failed:", { error: insertErr.message });
      return NextResponse.json(
        { synced: 0, total_cold: leadIds.length, error: "Failed to insert leads" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      synced: leadsToAdd.length,
      total_cold: leadIds.length,
    });
  } catch (error) {
    log("error", "[cold-leads-sync] Unexpected error:", { error: error });
    return NextResponse.json(
      { synced: 0, total_cold: 0, error: "Internal server error" },
      { status: 500 }
    );
  }
}
