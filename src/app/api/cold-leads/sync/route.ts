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

interface _SyncResponse {
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
    // 1. Find leads in REACTIVATE, LOST, or CONTACTED state that haven't been contacted in 14+ days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

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

    const leadIds = (coldLeads ?? []).map((l: { id: string }) => l.id);
    const stateMap = (coldLeads ?? []).reduce(
      (acc: Record<string, string>, l: { id: string; state: string }) => {
        acc[l.id] = l.state;
        return acc;
      },
      {}
    );

    if (leadIds.length === 0) {
      return NextResponse.json({ synced: 0, total_cold: 0 });
    }

    // 2. Check which leads are already in cold_lead_queue
    const { data: existingQueue } = await db
      .from("cold_lead_queue")
      .select("lead_id")
      .eq("workspace_id", workspaceId)
      .in("lead_id", leadIds);

    const existingLeadIds = new Set((existingQueue ?? []).map((q: { lead_id: string }) => q.lead_id));

    // 3. Filter out leads already in queue
    const leadsToAdd = leadIds.filter((id: string) => !existingLeadIds.has(id));

    if (leadsToAdd.length === 0) {
      return NextResponse.json({ synced: 0, total_cold: leadIds.length });
    }

    // 4. Build insert records with reason and priority based on lead state
    const now = new Date().toISOString();
    const recordsToInsert = leadsToAdd.map((leadId: string) => {
      const state = stateMap[leadId];
      let reason: string;
      let priority: string;

      switch (state) {
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

      return {
        lead_id: leadId,
        workspace_id: workspaceId,
        status: "pending",
        reason,
        priority,
        attempts: 0,
        max_attempts: 6,
        created_at: now,
        updated_at: now,
      };
    });

    // 5. Insert records into cold_lead_queue
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
