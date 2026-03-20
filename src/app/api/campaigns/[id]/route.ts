/**
 * PATCH /api/campaigns/[id] — Update campaign details and status.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
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
