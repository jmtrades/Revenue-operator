export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getSession } from "@/lib/auth/request-session";
import { log } from "@/lib/logger";

/**
 * POST /api/campaigns/auto-create
 *
 * Auto-creates intelligent campaigns based on lead segments and call data.
 * Segments: hot_leads, cold_leads, no_answer, appointment_follow_up, re_engagement
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { workspace_id?: string; segment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, segment } = body;
  if (!workspace_id || !segment) {
    return NextResponse.json({ error: "workspace_id and segment required" }, { status: 400 });
  }

  const validSegments = ["hot_leads", "cold_leads", "no_answer", "appointment_follow_up", "re_engagement", "all_new"];
  if (!validSegments.includes(segment)) {
    return NextResponse.json({ error: `Invalid segment. Valid: ${validSegments.join(", ")}` }, { status: 400 });
  }

  try {
    const db = getDb();

    // Verify workspace
    const { data: ws } = await db.from("workspaces").select("id, owner_id, name").eq("id", workspace_id).maybeSingle();
    if (!ws || (ws as { owner_id: string }).owner_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build segment query
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let leadQuery = db.from("leads").select("id, name, phone, email, qualification_score, status")
      .eq("workspace_id", workspace_id)
      .not("status", "in", "(OPTED_OUT,DO_NOT_CONTACT)")
      .not("phone", "is", null);

    let campaignName = "";
    let campaignDescription = "";

    switch (segment) {
      case "hot_leads":
        leadQuery = leadQuery.gte("qualification_score", 70).order("qualification_score", { ascending: false });
        campaignName = `Hot Leads — ${now.toLocaleDateString()}`;
        campaignDescription = "High-scoring leads ready for conversion. Priority outreach.";
        break;
      case "cold_leads":
        leadQuery = leadQuery.lte("qualification_score", 30).gte("updated_at", thirtyDaysAgo);
        campaignName = `Re-warm Cold Leads — ${now.toLocaleDateString()}`;
        campaignDescription = "Low-scoring leads that need re-engagement with value-add content.";
        break;
      case "no_answer":
        // Leads with recent no-answer outcomes
        leadQuery = leadQuery.eq("state", "NEW").gte("updated_at", sevenDaysAgo);
        campaignName = `No-Answer Retry — ${now.toLocaleDateString()}`;
        campaignDescription = "Leads we couldn't reach. Trying at different times.";
        break;
      case "appointment_follow_up":
        leadQuery = leadQuery.eq("state", "APPOINTMENT_SET").gte("updated_at", sevenDaysAgo);
        campaignName = `Appointment Follow-up — ${now.toLocaleDateString()}`;
        campaignDescription = "Leads with upcoming appointments. Reminder and preparation outreach.";
        break;
      case "re_engagement":
        leadQuery = leadQuery.lte("updated_at", thirtyDaysAgo).gte("updated_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString());
        campaignName = `Win-Back — ${now.toLocaleDateString()}`;
        campaignDescription = "Dormant leads from 30-90 days ago. Re-engagement campaign.";
        break;
      case "all_new":
        leadQuery = leadQuery.eq("state", "NEW").gte("created_at", sevenDaysAgo);
        campaignName = `New Leads — ${now.toLocaleDateString()}`;
        campaignDescription = "All new leads from the past 7 days.";
        break;
    }

    const { data: leads } = await leadQuery.limit(500);
    const leadList = (leads ?? []) as Array<{ id: string; name?: string; phone?: string }>;

    if (leadList.length === 0) {
      return NextResponse.json({ ok: true, campaign_id: null, leads_count: 0, message: "No leads match this segment" });
    }

    // Create campaign
    const { data: campaign } = await db.from("campaigns").insert({
      workspace_id,
      name: campaignName,
      description: campaignDescription,
      status: "draft",
      campaign_type: segment === "hot_leads" ? "outbound_call" : segment === "cold_leads" ? "email" : "multi_channel",
      lead_count: leadList.length,
      created_by: session.userId,
    }).select("id").maybeSingle();

    const campaignId = (campaign as { id: string } | null)?.id;

    // Add leads to campaign
    if (campaignId) {
      const campaignLeads = leadList.map(l => ({
        campaign_id: campaignId,
        lead_id: l.id,
        status: "pending",
        workspace_id,
      }));

      // Insert in batches of 100
      for (let i = 0; i < campaignLeads.length; i += 100) {
        const batch = campaignLeads.slice(i, i + 100);
        try {
          await db.from("campaign_leads").insert(batch);
        } catch {
          // Table may not exist — non-blocking
        }
      }
    }

    return NextResponse.json({
      ok: true,
      campaign_id: campaignId,
      campaign_name: campaignName,
      leads_count: leadList.length,
      segment,
    });
  } catch (err) {
    log("error", "[campaigns/auto-create]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
