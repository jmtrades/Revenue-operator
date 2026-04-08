/**
 * Conversation Readiness for a lead
 * Single score (0–100) + explanation + risk factors + timing window
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { computeReadiness } from "@/lib/readiness/engine";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const { getDb } = await import("@/lib/db/queries");
    const db = getDb();
    const { data: lead } = await db
      .from("leads")
      .select("id, workspace_id")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const { data: deal } = await db
      .from("deals")
      .select("id")
      .eq("lead_id", leadId)
      .eq("workspace_id", workspaceId)
      .in("status", ["open", "booked"])
      .limit(1)
      .maybeSingle();

    const result = await computeReadiness(
      workspaceId,
      leadId,
      (deal as { id: string } | null)?.id
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("readiness route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
