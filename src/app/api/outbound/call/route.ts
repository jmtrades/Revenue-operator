/**
 * POST /api/outbound/call — Start an outbound call to a lead via Vapi.
 * Creates call_session, gets or creates Vapi assistant, triggers outbound call.
 * End-of-call is handled by the same Vapi webhook (metadata includes call_session_id).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import type { CampaignType } from "@/lib/campaigns/prompt";
import { executeLeadOutboundCall } from "@/lib/outbound/execute-lead-call";

const VALID_CAMPAIGN_TYPES: CampaignType[] = [
  "lead_followup", "lead_qualification", "appointment_reminder", "appointment_setting",
  "reactivation", "cold_outreach", "review_request", "custom",
];

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: { lead_id: string; campaign_type?: string; campaign_prompt_options?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { lead_id, campaign_type, campaign_prompt_options } = body;
  if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const campaignType: CampaignType | undefined =
    typeof campaign_type === "string" && VALID_CAMPAIGN_TYPES.includes(campaign_type as CampaignType)
      ? (campaign_type as CampaignType)
      : undefined;
  const campaignPromptOptions =
    campaign_prompt_options && typeof campaign_prompt_options === "object" && !Array.isArray(campaign_prompt_options)
      ? (campaign_prompt_options as {
          qualifiedAction?: string;
          unqualifiedAction?: string;
          appointmentType?: string;
          availableTimes?: string;
          followUpContext?: string;
          nextStep?: string;
          reactivationAction?: string;
        })
      : undefined;

  const result = await executeLeadOutboundCall(workspaceId, lead_id, {
    campaignType,
    campaignPromptOptions,
  });

  if (result.ok) return NextResponse.json({ ok: true, call_session_id: result.call_session_id });

  const status = result.error === "Lead not found" ? 404 : result.error === "Lead has no valid phone number" ? 400 : result.error === "Outbound calling not configured" ? 503 : result.error === "No agent configured for workspace" ? 400 : 502;
  return NextResponse.json({ error: result.error }, { status });
}
