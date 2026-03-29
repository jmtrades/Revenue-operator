/**
 * GET /api/campaigns/[id] — Fetch a single campaign with leads summary.
 * PATCH /api/campaigns/[id] — Update campaign details and status.
 * DELETE /api/campaigns/[id] — Delete a draft/paused campaign.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

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

/** Helper: find campaign in outbound_campaigns first, fall back to campaigns */
async function findCampaign(db: ReturnType<typeof getDb>, id: string, select = "*") {
  const primary = await db.from("outbound_campaigns").select(select).eq("id", id).maybeSingle();
  if (primary.data && !primary.error) {
    return { data: primary.data as unknown as Record<string, unknown>, error: null, table: "outbound_campaigns" as const };
  }
  const fallback = await db.from("campaigns").select(select).eq("id", id).maybeSingle();
  return { data: fallback.data as unknown as Record<string, unknown> | null, error: fallback.error, table: "campaigns" as const };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const { data: campaign, error } = await findCampaign(db, id);
  if (error || !campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const workspaceId = (campaign as Record<string, unknown>).workspace_id as string;
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
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing, table } = await findCampaign(db, id, "workspace_id");
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const err = await requireWorkspaceAccess(req, (existing as Record<string, unknown>).workspace_id as string);
  if (err) return err;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updateCampaignSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    status: z.enum(["draft", "active", "paused", "completed"]).optional(),
    type: z.enum(CAMPAIGN_TYPES as unknown as [string, ...string[]]).optional(),
    target_filter: z.record(z.string(), z.unknown()).optional(),
  }).strict();

  const parsed = updateCampaignSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.target_filter !== undefined) updates.target_filter = parsed.data.target_filter;
  const { data: campaign, error } = await db.from(table).update(updates).eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await ctx.params;
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // Rate limit: 10 campaign deletes per minute per workspace
  const rl = await checkRateLimit(`campaigns_delete:${session.workspaceId}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many delete requests. Please slow down." }, { status: 429 });
  }

  const db = getDb();
  const { data: existing, table } = await findCampaign(db, id, "id, status, workspace_id");
  if (!existing || (existing as Record<string, unknown>).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = (existing as Record<string, unknown>).status as string;
  if (status === "active") {
    return NextResponse.json(
      { error: "Pause the campaign before deleting it." },
      { status: 400 },
    );
  }

  // Remove campaign_leads junction records first
  await db.from("campaign_leads").delete().eq("campaign_id", id);

  const { error } = await db
    .from(table)
    .delete()
    .eq("id", id)
    .eq("workspace_id", session.workspaceId);
  if (error) {
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
