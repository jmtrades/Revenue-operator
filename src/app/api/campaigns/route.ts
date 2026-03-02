/**
 * GET /api/campaigns — List campaigns for workspace (v7 campaigns table).
 * POST /api/campaigns — Create a draft campaign.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;
  const db = getDb();
  try {
    const { data, error } = await db
      .from("campaigns")
      .select("id, workspace_id, agent_id, name, type, status, total_contacts, called, answered, appointments_booked, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaigns: data ?? [] });
  } catch {
    return NextResponse.json({ campaigns: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = (await import("@/lib/auth/request-session")).getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  let body: { name: string; type?: string; agent_id?: string; target_filter?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, type = "lead_followup", agent_id, target_filter } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const db = getDb();
  let agentId = agent_id ?? null;
  if (agentId) {
    const { data: ag } = await db.from("agents").select("id").eq("id", agentId).eq("workspace_id", session.workspaceId).maybeSingle();
    if (!ag) return NextResponse.json({ error: "Agent not found in workspace" }, { status: 400 });
  } else {
    const { data: first } = await db.from("agents").select("id").eq("workspace_id", session.workspaceId).limit(1).maybeSingle();
    agentId = (first as { id: string } | null)?.id ?? null;
  }
  if (!agentId) return NextResponse.json({ error: "No agent in workspace; create an agent first" }, { status: 400 });

  const typeVal = ["lead_followup", "appointment_reminder", "reactivation", "custom"].includes(type) ? type : "lead_followup";
  const insertPayload: Record<string, unknown> = {
    workspace_id: session.workspaceId,
    agent_id: agentId,
    name: name.trim(),
    type: typeVal,
    status: "draft",
  };
  if (target_filter && typeof target_filter === "object" && Object.keys(target_filter).length > 0) {
    insertPayload.target_filter = target_filter;
  }
  try {
    const { data: campaign, error } = await db
      .from("campaigns")
      .insert(insertPayload)
      .select("id, name, type, status, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(campaign);
  } catch (_e) {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
