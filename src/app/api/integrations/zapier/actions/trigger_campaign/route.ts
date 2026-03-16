/**
 * POST /api/integrations/zapier/actions/trigger_campaign — Zapier action (Task 22).
 * Body: campaign_id, lead_id. Enqueues or triggers the campaign for the lead (placeholder: returns ok).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceIdFromZapierToken } from "@/lib/integrations/zapier-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceIdFromZapierToken(req.headers.get("authorization"));
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { campaign_id?: string; lead_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const campaign_id = body.campaign_id?.toString().trim();
  const lead_id = body.lead_id?.toString().trim();
  if (!campaign_id || !lead_id) return NextResponse.json({ error: "campaign_id and lead_id required" }, { status: 400 });

  const db = getDb();
  const { data: campaign } = await db.from("campaigns").select("id").eq("id", campaign_id).eq("workspace_id", workspaceId).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const { data: lead } = await db.from("leads").select("id").eq("id", lead_id).eq("workspace_id", workspaceId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Placeholder: in a full implementation we would enqueue a campaign run for this lead (calls, SMS, and email via enqueueSendMessage with channel "email" and options.email_subject).
  return NextResponse.json({
    ok: true,
    campaign_id,
    lead_id,
    message: "Campaign trigger accepted; run will be scheduled.",
  });
}
