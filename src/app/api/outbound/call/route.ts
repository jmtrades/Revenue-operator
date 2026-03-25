/**
 * POST /api/outbound/call — Start an outbound call to a lead via Vapi.
 * Creates call_session, gets or creates Vapi assistant, triggers outbound call.
 * End-of-call is handled by the same Vapi webhook (metadata includes call_session_id).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import type { CampaignType } from "@/lib/campaigns/prompt";
import { executeLeadOutboundCall } from "@/lib/outbound/execute-lead-call";
import { parseBody } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getDb } from "@/lib/db/queries";
import { canMakeOutboundCall } from "@/lib/billing/plan-enforcement";

const VALID_CAMPAIGN_TYPES: CampaignType[] = [
  "lead_followup", "lead_qualification", "appointment_reminder", "appointment_setting",
  "reactivation", "cold_outreach", "review_request", "custom",
];

const outboundCallSchema = z.object({
  lead_id: z.string().uuid("Invalid lead_id"),
  campaign_type: z.enum(["lead_followup" as const, "lead_qualification" as const, "appointment_reminder" as const, "appointment_setting" as const, "reactivation" as const, "cold_outreach" as const, "review_request" as const, "custom" as const]).optional(),
  campaign_prompt_options: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const rl = await checkRateLimit(`outbound:${workspaceId}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = await parseBody(req, outboundCallSchema);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  const { lead_id, campaign_type, campaign_prompt_options } = body;
  if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  // Enforce daily outbound call limit per billing plan
  const outboundEnforcement = await canMakeOutboundCall(workspaceId);
  if (!outboundEnforcement.allowed) {
    return NextResponse.json(
      {
        error: outboundEnforcement.message,
        reason: outboundEnforcement.reason,
        upgrade_to: outboundEnforcement.upgradeTo,
        current: outboundEnforcement.current,
        limit: outboundEnforcement.limit,
      },
      { status: 403 },
    );
  }

  // Pre-flight: verify workspace has an active phone number configured
  const db = getDb();
  const { data: phoneConfig } = await db
    .from("phone_configs")
    .select("proxy_number, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const cfg = phoneConfig as { proxy_number?: string | null; status?: string } | null;
  if (!cfg?.proxy_number) {
    return NextResponse.json(
      {
        error: "No phone number configured. Go to Settings → Phone to set up a number before making calls.",
        code: "NO_PHONE_CONFIGURED",
      },
      { status: 400 },
    );
  }
  if (cfg.status !== "active") {
    return NextResponse.json(
      {
        error: "Your phone number is not active. Check Settings → Phone for details.",
        code: "PHONE_INACTIVE",
      },
      { status: 400 },
    );
  }

  // Pre-flight: verify the lead has a valid phone number
  const { data: leadData } = await db
    .from("leads")
    .select("phone")
    .eq("id", lead_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const lead = leadData as { phone?: string | null } | null;
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!lead.phone || lead.phone.trim().length < 10) {
    return NextResponse.json(
      {
        error: "This lead has no valid phone number. Add a phone number to the lead before calling.",
        code: "LEAD_NO_PHONE",
      },
      { status: 400 },
    );
  }

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

  const status =
    result.error === "Workspace trial expired"
      ? 402
      : result.error === "Lead not found"
        ? 404
        : result.error === "Lead has no valid phone number"
          ? 400
          : result.error === "Outbound calling not configured"
            ? 503
            : result.error === "No agent configured for workspace"
              ? 400
              : 502;
  return NextResponse.json({ error: result.error }, { status });
}
