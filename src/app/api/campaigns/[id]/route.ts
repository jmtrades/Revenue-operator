/**
 * GET /api/campaigns/[id] — Fetch a single campaign with leads summary.
 * PATCH /api/campaigns/[id] — Update campaign details and status.
 * DELETE /api/campaigns/[id] — Delete a draft/paused campaign.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const CAMPAIGN_TYPES = [
  "speed_to_lead",
  "lead_qualification",
  "appointment_setting",
  "no_show_recovery",
  "reactivation",
  "quote_chase",
  "review_request",
  "cold_outreach",
  "appointment_reminder",
  "custom",
  // Back-compat
  "lead_followup",
] as const;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const workspaceId = (campaign as { workspace_id: string }).workspace_id;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  // Fetch campaign leads summary
  const { data: leadsData, count: leadsCount } = await db
    .from("campaign_leads")
    .select("status", { count: "exact" })
    .eq("campaign_id", id);
  const leadStatusCounts: Record<string, number> = {};
  if (leadsData) {
    for (const row of leadsData as { status: string }[]) {
      leadStatusCounts[row.status] = (leadStatusCounts[row.status] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    ...campaign,
    leads_summary: {
      total: leadsCount ?? 0,
      ...leadStatusCounts,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing } = await db.from("campaigns").select("workspace_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const err = await requireWorkspaceAccess(req, (existing as { workspace_id: string }).workspace_id);
  if (err) return err;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined && ["draft", "active", "paused", "completed"].includes(String(body.status))) {
    updates.status = body.status;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.type === "string" && (CAMPAIGN_TYPES as readonly string[]).includes(body.type)) {
    updates.type = body.type;
  }
  if (body.target_filter && typeof body.target_filter === "object") {
    updates.target_filter = body.target_filter;
  }
  const { data: campaign, error } = await db.from("campaigns").update(updates).eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: existing } = await db
    .from("campaigns")
    .select("id, status, workspace_id")
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = (existing as { status: string }).status;
  if (status === "active") {
    return NextResponse.json(
      { error: "Pause the campaign before deleting it." },
      { status: 400 },
    );
  }

  // Remove campaign_leads junction records first
  await db.from("campaign_leads").delete().eq("campaign_id", id);

  const { error } = await db
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("workspace_id", session.workspaceId);
  if (error) {
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
