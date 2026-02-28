/**
 * GET /api/enterprise/message-preview?workspace_id=...&intent_type=first_record_send
 * Returns proposed text, policy basis, and requires_approval. No auth for onboarding context.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { resolveDomainContext } from "@/lib/domain-packs/resolve";
import { compileGovernedMessage } from "@/lib/speech-governance";

const DEFAULT_FIRST_SEND = "This matches what we agreed. Adjust it if anything is off.";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  const intentType = req.nextUrl.searchParams.get("intent_type")?.trim() || "first_record_send";
  if (!workspaceId) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  }

  try {
    const { domain_type, jurisdiction } = await resolveDomainContext(workspaceId);
    const channel = "sms" as const;
    const result = await compileGovernedMessage({
      workspace_id: workspaceId,
      domain_type,
      jurisdiction,
      channel,
      intent_type: intentType,
      clause_plan: [{ type: "first_record_send" }],
      slots: {},
    });

    const proposedText = result.rendered_text || DEFAULT_FIRST_SEND;
    const requiresApproval = result.decision === "review_required";

    return NextResponse.json({
      ok: true,
      proposed_text: proposedText,
      disclosures: [] as string[],
      requires_approval: requiresApproval,
      policy_basis: result.trace.policy_checks,
      templates_used: result.trace.templates_used,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      proposed_text: DEFAULT_FIRST_SEND,
      disclosures: [] as string[],
      requires_approval: false,
      policy_basis: [],
      templates_used: [],
    });
  }
}
