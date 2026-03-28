import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import type { DialerMode, CampaignStatus } from "@/lib/voice/outbound-dialer";

export const dynamic = "force-dynamic";

/** List campaigns for a workspace */
export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { data: rawCampaigns } = await db
      .from("outbound_campaigns")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!rawCampaigns) {
      return NextResponse.json({ campaigns: [] });
    }

    // Transform each campaign to flatten stats and calculate missing fields
    const campaigns = await Promise.all(
      rawCampaigns.map(async (campaign: Record<string, unknown>) => {
        const stats = (campaign.stats ?? {}) as Record<string, unknown>;
        const totalLeads = (stats.total_leads as number) ?? 0;
        const dialed = (stats.dialed as number) ?? 0;
        const answered = (stats.answered as number) ?? 0;

        // Count appointments for this campaign
        let appointmentsBooked = (stats.appointments_booked as number) ?? 0;
        if (appointmentsBooked === 0) {
          const { count } = await db
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .ilike("notes", `%campaign:${campaign.id}%`);
          appointmentsBooked = count ?? 0;
        }

        return {
          id: campaign.id as string,
          name: campaign.name as string,
          mode: (campaign.mode ?? "preview") as "power" | "preview" | "progressive",
          status: (campaign.status ?? "draft") as "draft" | "active" | "paused" | "completed",
          total_leads: totalLeads,
          leads_called: dialed,
          leads_remaining: Math.max(0, totalLeads - dialed),
          connects: answered,
          appointments_booked: appointmentsBooked,
          created_at: campaign.created_at as string,
          started_at: (campaign.started_at as string | null) ?? null,
          completed_at: (campaign.completed_at as string | null) ?? null,
        };
      })
    );

    return NextResponse.json({ campaigns });
  } catch (err) {
    log("error", "api.campaigns.list_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to list campaigns" }, { status: 500 });
  }
}

/** Create a new campaign */
export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await request.json() as {
      workspace_id: string;
      name: string;
      mode: DialerMode;
      from_number: string;
      settings?: Record<string, unknown>;
    };

    if (!body.workspace_id || !body.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(request, body.workspace_id);
    if (authErr) return authErr;

    const db = getDb();

    // Resolve from_number: if "workspace_default" or missing, look up workspace phone config
    let fromNumber = body.from_number;
    if (!fromNumber || fromNumber === "workspace_default") {
      try {
        const { data: phoneConfig } = await db
          .from("phone_configs")
          .select("phone_number")
          .eq("workspace_id", body.workspace_id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        fromNumber = (phoneConfig as { phone_number?: string } | null)?.phone_number ?? "";
      } catch { /* ignore */ }
    }
    if (!fromNumber) {
      return NextResponse.json({ error: "No phone number configured. Please set up a phone number first." }, { status: 400 });
    }

    const { data, error } = await db
      .from("outbound_campaigns")
      .insert({
        workspace_id: body.workspace_id,
        name: body.name,
        mode: body.mode ?? "preview",
        from_number: fromNumber,
        settings: body.settings ?? {
          max_concurrent_calls: 1,
          max_attempts_per_lead: 3,
          retry_delay_minutes: 60,
          voicemail_behavior: "drop",
          recording_enabled: true,
          calling_hours: { start: "09:00", end: "20:00" },
          calling_days: [1, 2, 3, 4, 5],
          preview_delay_seconds: 5,
          ring_timeout_seconds: 25,
        },
        stats: {
          total_leads: 0, dialed: 0, answered: 0, voicemails: 0,
          no_answers: 0, transferred: 0, callbacks_scheduled: 0,
          dnc_hits: 0, failed: 0, avg_call_duration_seconds: 0,
          conversion_rate: 0, connect_rate: 0, calls_per_hour: 0,
        },
      })
      .select()
      .single();

    if (error) throw error;

    log("info", "api.campaigns.created", { campaignId: (data as Record<string, unknown>)?.id, name: body.name });
    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (err) {
    log("error", "api.campaigns.create_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

/** Update campaign status or settings */
export async function PATCH(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await request.json() as {
      campaign_id: string;
      status?: CampaignStatus;
      name?: string;
      settings?: Record<string, unknown>;
      workspace_id?: string;
    };

    if (!body.campaign_id) return NextResponse.json({ error: "Missing campaign_id" }, { status: 400 });

    const db = getDb();
    const campaign = await db.from("outbound_campaigns").select("workspace_id").eq("id", body.campaign_id).maybeSingle();
    const workspaceId = body.workspace_id || (campaign?.data as { workspace_id?: string } | null)?.workspace_id;
    if (!workspaceId) return NextResponse.json({ error: "Cannot determine workspace" }, { status: 400 });

    const authErr = await requireWorkspaceAccess(request, workspaceId);
    if (authErr) return authErr;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status) {
      updates.status = body.status;
      if (body.status === "active" && !updates.started_at) updates.started_at = new Date().toISOString();
      if (body.status === "completed" || body.status === "cancelled") updates.completed_at = new Date().toISOString();
    }
    if (body.name) updates.name = body.name;
    if (body.settings) updates.settings = body.settings;

    const { data } = await db
      .from("outbound_campaigns")
      .update(updates)
      .eq("id", body.campaign_id)
      .select()
      .single();

    return NextResponse.json({ campaign: data });
  } catch (err) {
    log("error", "api.campaigns.update_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
