/**
 * POST /api/enterprise/preview-message — preview exactly what will be sent. No send.
 * Body: workspace_id, domain_type, jurisdiction, channel, intent_type, sample_vars (strict).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { resolveMessagePolicy } from "@/lib/governance/message-policy";
import { resolveCompliancePack } from "@/lib/governance/compliance-pack";
import { getApprovedTemplate, renderTemplate } from "@/lib/speech-governance/templates";
import { containsForbiddenLanguage, trimToMaxChars, MAX_SMS_CHARS } from "@/lib/speech-governance/doctrine";

const MAX_DISCLAIMER_LINE = 90;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });

  const workspaceId = body.workspace_id?.trim();
  const domain_type = body.domain_type?.trim() || "general";
  const jurisdiction = body.jurisdiction?.trim() || "UK";
  const channel = (body.channel?.trim() || "sms") as "sms" | "email" | "whatsapp";
  const intent_type = body.intent_type?.trim() || "follow_up";
  const sample_vars = body.sample_vars && typeof body.sample_vars === "object" ? body.sample_vars as Record<string, string | number | boolean> : {};

  if (!workspaceId)
    return NextResponse.json({ ok: false, reason: "workspace_id_required" }, { status: 200 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator", "compliance", "auditor"]);
  if (authErr) return authErr;

  const channelNorm = channel === "email" ? "email" : channel === "whatsapp" ? "whatsapp" : "sms";
  const clauseType = "acknowledgment";

  const template = await getApprovedTemplate(workspaceId, domain_type, jurisdiction, channelNorm, intent_type, clauseType);
  if (!template) {
    return NextResponse.json({
      ok: false,
      reason: "no_approved_template",
      text: null,
      disclaimer_lines: [],
      approval_mode: null,
      policy_id: null,
      template_id: null,
    }, { status: 200 });
  }

  let text = renderTemplate(template.body, sample_vars);

  const messagePolicy = await resolveMessagePolicy(workspaceId, domain_type, jurisdiction, channelNorm, intent_type);
  const compliance = await resolveCompliancePack(workspaceId, domain_type);
  const disclaimer_lines = [
    ...(messagePolicy?.required_disclaimers ?? []),
    ...(compliance.disclaimers ?? []),
  ].filter(Boolean).map((s) => s.slice(0, MAX_DISCLAIMER_LINE));

  if (disclaimer_lines.length) {
    text = (text + "\n" + disclaimer_lines.join("\n")).trim();
  }

  if (containsForbiddenLanguage(text)) {
    return NextResponse.json({
      ok: false,
      reason: "forbidden_language",
      text: null,
      disclaimer_lines: [],
      approval_mode: messagePolicy?.approval_mode ?? null,
      policy_id: messagePolicy?.id ?? null,
      template_id: template.key,
    }, { status: 200 });
  }

  const maxChars = channelNorm === "sms" ? MAX_SMS_CHARS : 2000;
  if (text.length > maxChars) {
    text = trimToMaxChars(text, maxChars);
  }

  return NextResponse.json({
    ok: true,
    text,
    disclaimer_lines,
    approval_mode: messagePolicy?.approval_mode ?? "autopilot",
    policy_id: messagePolicy?.id ?? null,
    template_id: template.key,
  });
}
