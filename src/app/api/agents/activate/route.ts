export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

/**
 * POST /api/agents/activate
 *
 * Auto-activation pipeline: when an agent is activated, this endpoint:
 * 1. Sets is_active = true on the agent
 * 2. Auto-creates an outbound campaign in outbound_campaigns
 * 3. Enrolls ALL workspace leads (with valid phones, not opted out) into the campaign
 * 4. Sets campaign to 'active' so the cron dialer picks it up immediately
 *
 * This bridges the gap between agent setup and actual calling.
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agent_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agent_id } = body;
  if (!agent_id) {
    return NextResponse.json({ error: "agent_id required" }, { status: 400 });
  }

  const db = getDb();
  const workspaceId = session.workspaceId;

  try {
    // 1. Verify agent belongs to this workspace
    const { data: agent } = await db
      .from("agents")
      .select("id, name, purpose, workspace_id")
      .eq("id", agent_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentData = agent as { id: string; name: string; purpose?: string; workspace_id: string };

    // 2. Activate the agent
    await db
      .from("agents")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", agent_id);

    // 3. Get workspace business context for campaign naming
    const { data: wsCtx } = await db
      .from("workspace_business_context")
      .select("business_name, primary_goal, timezone")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const bizCtx = wsCtx as { business_name?: string; primary_goal?: string; timezone?: string } | null;
    const timezone = bizCtx?.timezone ?? "America/New_York";
    const primaryGoal = bizCtx?.primary_goal ?? "sales";

    // Determine campaign type based on agent purpose and business goal
    const campaignType = determineCampaignType(agentData.purpose, primaryGoal);

    // 4. Check if there's already an active auto-created campaign for this workspace
    const { data: existingCampaign } = await db
      .from("outbound_campaigns")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    let campaignId: string;
    let campaignCreated = false;

    if (existingCampaign) {
      // Already have an active campaign — just enroll any new leads into it
      campaignId = (existingCampaign as { id: string }).id;
    } else {
      // 5. Create a new outbound campaign
      const now = new Date().toISOString();
      const campaignName = `${agentData.name ?? "AI Agent"} — Auto Campaign`;

      const { data: newCampaign, error: campaignErr } = await db
        .from("outbound_campaigns")
        .insert({
          workspace_id: workspaceId,
          name: campaignName,
          type: campaignType,
          status: "active",
          timezone,
          total_leads: 0,
          leads_called: 0,
          connects: 0,
          appointments_booked: 0,
          metadata: {
            auto_created: true,
            agent_id: agent_id,
            max_concurrent_calls: 2,
            daily_limit: 50,
            call_window_start: 9,
            call_window_end: 18,
            auto_enroll_new_leads: true,
          },
          settings: {
            campaignType: campaignType,
            voiceId: null, // Uses workspace default
            maxRetries: 2,
            retryDelay: 60,
          },
          steps: [
            {
              channel: "call",
              delay: 0,
              message: null,
            },
          ],
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .maybeSingle();

      if (campaignErr || !newCampaign) {
        log("error", "[agents/activate] Failed to create campaign:", {
          error: campaignErr?.message ?? "No data returned",
        });
        // Still return success for agent activation — campaign creation is best-effort
        return NextResponse.json({
          ok: true,
          agent_activated: true,
          campaign_created: false,
          leads_enrolled: 0,
          message: "Agent activated but campaign creation failed. You can create a campaign manually.",
        });
      }

      campaignId = (newCampaign as { id: string }).id;
      campaignCreated = true;
    }

    // 6. Fetch all eligible leads from this workspace
    const { data: leads } = await db
      .from("leads")
      .select("id, phone, state")
      .eq("workspace_id", workspaceId)
      .not("phone", "is", null)
      .not("state", "in", "(OPTED_OUT,DO_NOT_CALL)")
      .limit(1000);

    const eligibleLeads = (leads ?? []) as Array<{ id: string; phone?: string; state?: string }>;

    // 7. Check which leads are already enrolled in this campaign
    let alreadyEnrolledIds = new Set<string>();
    if (eligibleLeads.length > 0) {
      const { data: existing } = await db
        .from("campaign_leads")
        .select("lead_id")
        .eq("campaign_id", campaignId);

      alreadyEnrolledIds = new Set(
        ((existing ?? []) as Array<{ lead_id: string }>).map((r) => r.lead_id)
      );
    }

    // 8. Enroll new leads into campaign_leads as pending
    const now = new Date().toISOString();
    const newEnrollments = eligibleLeads
      .filter((l) => !alreadyEnrolledIds.has(l.id))
      .map((l) => ({
        campaign_id: campaignId,
        lead_id: l.id,
        status: "pending",
        created_at: now,
      }));

    let enrolled = 0;
    if (newEnrollments.length > 0) {
      // Insert in batches of 100
      for (let i = 0; i < newEnrollments.length; i += 100) {
        const batch = newEnrollments.slice(i, i + 100);
        const { error: enrollErr } = await db
          .from("campaign_leads")
          .upsert(batch, { onConflict: "campaign_id,lead_id", ignoreDuplicates: true });

        if (enrollErr) {
          log("warn", "[agents/activate] campaign_leads batch insert failed:", {
            error: enrollErr.message,
            batch_start: i,
          });
        } else {
          enrolled += batch.length;
        }
      }
    }

    // 9. Update campaign total_leads count
    if (enrolled > 0 || campaignCreated) {
      const totalEnrolled = enrolled + alreadyEnrolledIds.size;
      await db
        .from("outbound_campaigns")
        .update({
          total_leads: totalEnrolled,
          updated_at: now,
        })
        .eq("id", campaignId);
    }

    log("info", "[agents/activate] Auto-activation complete", {
      agent_id,
      campaign_id: campaignId,
      campaign_created: campaignCreated,
      leads_enrolled: enrolled,
      total_eligible: eligibleLeads.length,
      already_enrolled: alreadyEnrolledIds.size,
    });

    return NextResponse.json({
      ok: true,
      agent_activated: true,
      campaign_id: campaignId,
      campaign_created: campaignCreated,
      leads_enrolled: enrolled,
      total_in_campaign: enrolled + alreadyEnrolledIds.size,
      message: enrolled > 0
        ? `Agent activated! ${enrolled} leads queued for calling. The AI will start reaching out automatically.`
        : campaignCreated
          ? "Agent activated! Campaign created. Add leads and they'll be called automatically."
          : "Agent activated! Leads are already enrolled in your active campaign.",
    });
  } catch (err) {
    log("error", "[agents/activate] Unexpected error:", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Activation failed. Please try again." }, { status: 500 });
  }
}

/**
 * Determines the best campaign type based on agent purpose and business goal.
 */
function determineCampaignType(
  agentPurpose?: string,
  primaryGoal?: string
): string {
  // Map business goals to campaign types
  if (primaryGoal === "book_appointments") return "appointment_setting";
  if (primaryGoal === "qualify_leads") return "lead_qualification";
  if (primaryGoal === "follow_up") return "lead_followup";
  if (primaryGoal === "sales") return "cold_outreach";
  if (primaryGoal === "support") return "lead_followup";

  // Fall back to agent purpose
  if (agentPurpose === "outbound") return "cold_outreach";
  if (agentPurpose === "both") return "lead_followup";

  return "lead_followup";
}
