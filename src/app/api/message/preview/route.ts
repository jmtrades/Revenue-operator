/**
 * POST /api/message/preview — doctrine-safe message preview with governance.
 * Auth: requireWorkspaceAccess. Response: message_text, decision, clauses_used, templates_used, policy_checks.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { compileGovernedMessage } from "@/lib/speech-governance";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });
    }

    const workspaceId = body.workspace_id?.trim();
    if (!workspaceId) {
      return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const domainType = body.domain_type ?? "general";
    const jurisdiction = body.jurisdiction ?? "UK";
    const channel = body.channel ?? "sms";
    if (!["sms", "email", "whatsapp"].includes(channel)) {
      return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
    }
    const intentType = body.intent_type ?? "follow_up";
    const slots = body.slots && typeof body.slots === "object" ? body.slots : {};
    const clausePlan = Array.isArray(body.clause_plan) ? body.clause_plan : [{ type: "acknowledgment" }];

    const result = await compileGovernedMessage({
      workspace_id: workspaceId,
      audience: body.audience ?? null,
      domain_type: domainType,
      jurisdiction,
      channel: channel as "sms" | "email" | "whatsapp",
      intent_type: intentType,
      clause_plan: clausePlan,
      slots,
      thread_id: body.thread_id ?? null,
      work_unit_id: body.work_unit_id ?? null,
    });

    const requiresReview = result.decision === "review_required";

    return NextResponse.json({
      ok: true,
      text: result.rendered_text,
      message_text: result.rendered_text,
      disclaimer_lines: result.trace.disclaimer_lines ?? [],
      approval_mode: result.trace.approval_mode ?? "autopilot",
      policy_id: result.trace.policy_id ?? null,
      template_id: result.trace.template_id ?? null,
      decision: result.decision,
      clauses_used: result.trace.clause_plan ?? clausePlan,
      templates_used: result.trace.templates_used,
      policy_checks: result.trace.policy_checks,
      requires_review: requiresReview,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no_approved_template") || msg.includes("policy_blocked") || msg.includes("length_exceeded")) {
      return NextResponse.json({ ok: false, reason: msg.includes("template") ? "no_approved_template" : msg.includes("length") ? "length_exceeded" : "policy_blocked" }, { status: 200 });
    }
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  }
}
