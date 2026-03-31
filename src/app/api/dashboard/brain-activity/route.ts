/**
 * Dashboard Brain Activity Log API
 * GET: Returns workspace-wide autonomous actions log with pagination and filtering
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Query parameters
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
    const actionType = req.nextUrl.searchParams.get("action_type");
    const success = req.nextUrl.searchParams.get("success");

    // Validate pagination
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 1000); // Cap at 1000
    const offset = (validPage - 1) * validLimit;

    const db = getDb();

    // Build query for autonomous_actions
    let query = db
      .from("autonomous_actions")
      .select(
        "id,action_type,success,details,confidence,reason,executed_at,lead_id",
        { count: "exact" }
      )
      .eq("workspace_id", workspaceId);

    // Apply filters
    if (actionType) {
      query = query.eq("action_type", actionType);
    }

    if (success !== null && success !== undefined) {
      const successBool = success === "true" || success === "1";
      query = query.eq("success", successBool);
    }

    // Order by executed_at descending and apply pagination
    const { data: actions, count } = await query
      .order("executed_at", { ascending: false })
      .range(offset, offset + validLimit - 1);

    const actionsList = (actions ?? []) as Array<{
      id: string;
      action_type: string;
      success: boolean;
      details: string;
      confidence: number;
      reason: string;
      executed_at: string;
      lead_id: string;
    }>;

    // Get lead IDs and fetch lead names in one query
    const leadIds = [...new Set(actionsList.map((a) => a.lead_id).filter(Boolean))];

    const leadNames: Record<string, string | null> = {};
    if (leadIds.length > 0) {
      const { data: leads } = await db
        .from("leads")
        .select("id,name")
        .in("id", leadIds);

      const leadList = (leads ?? []) as Array<{ id: string; name: string }>;
      for (const lead of leadList) {
        leadNames[lead.id] = lead.name;
      }
    }

    // Format response
    const items = actionsList.map((action) => ({
      id: action.id,
      action_type: action.action_type,
      success: action.success,
      details: action.details,
      confidence: action.confidence,
      reason: action.reason,
      executed_at: action.executed_at,
      lead_id: action.lead_id,
      lead_name: action.lead_id ? leadNames[action.lead_id] ?? null : null,
    }));

    return NextResponse.json({
      items,
      total: count ?? 0,
      page: validPage,
      limit: validLimit,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log("error", "brain_activity.route_error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
