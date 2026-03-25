/**
 * GET /api/operational/next-action?workspace_id=...
 * Returns exactly one primary next action for the operator. Used by /dashboard/start only.
 * No metrics. No secondary actions.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ ok: false, reason: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  const { data: hostedHeartbeat } = await db
    .from("system_cron_heartbeats")
    .select("last_ran_at")
    .eq("job_name", "hosted-executor")
    .limit(1)
    .maybeSingle();
  const lastRan = (hostedHeartbeat as { last_ran_at?: string } | null)?.last_ran_at;
  const execution_stale = lastRan
    ? Date.now() - new Date(lastRan).getTime() > 20 * 60 * 1000
    : true;

  // Billing paused → resolve billing
  const { data: billing } = await db
    .from("workspace_billing")
    .select("status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const status = (billing as { status?: string } | null)?.status;
  if (status === "paused" || status === "past_due") {
    return NextResponse.json({
      ok: true,
      next_action: "resolve_billing",
      label: "Resolve authorization",
      href: "/dashboard/billing",
      execution_stale,
    });
  }

  // Pending approvals → confirm governance (single CTA)
  const { data: approvals } = await db
    .from("message_approval_decisions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("decided_at", null)
    .limit(1);
  if (Array.isArray(approvals) && approvals.length > 0) {
    return NextResponse.json({
      ok: true,
      next_action: "confirm_approvals",
      label: "Confirm governance",
      href: "/dashboard/approvals",
      execution_stale,
    });
  }

  // Policies: UNSPECIFIED or preview/approval required → confirm governance
  const { data: policyRows } = await db
    .from("message_policies")
    .select("jurisdiction, approval_mode")
    .eq("workspace_id", workspaceId)
    .limit(10);
  const policies = Array.isArray(policyRows) ? policyRows : [];
  const hasUnspecified = policies.some(
    (p: { jurisdiction?: string | null }) => (p.jurisdiction ?? "").toUpperCase() === "UNSPECIFIED"
  );
  const hasPreviewOrApproval = policies.some((p: { approval_mode?: string | null }) => {
    const m = (p.approval_mode ?? "").toLowerCase();
    return m === "preview_required" || m === "approval_required";
  });
  if (hasUnspecified || hasPreviewOrApproval) {
    return NextResponse.json({
      ok: true,
      next_action: "confirm_governance",
      label: "Confirm governance",
      href: "/dashboard/policies",
      execution_stale,
    });
  }

  // Has public record → Open record or Share record (if invite pending)
  const { data: sharedRow } = await db
    .from("shared_transactions")
    .select("external_ref")
    .eq("workspace_id", workspaceId)
    .not("external_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hasRecord = !!((sharedRow as { external_ref?: string } | null)?.external_ref);

  if (hasRecord) {
    const externalRef = (sharedRow as { external_ref: string }).external_ref;
    const recordPath = `/public/work/${encodeURIComponent(externalRef)}`;

    const { data: pendingInvite } = await db
      .from("workspace_invites")
      .select("id")
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null)
      .limit(1)
      .maybeSingle();
    const invitePending = !!(pendingInvite as { id?: string } | null)?.id;

    return NextResponse.json({
      ok: true,
      next_action: invitePending ? "share_record" : "copy_record_link",
      label: invitePending ? "Share record" : "Open record",
      record_path: recordPath,
      href: "/dashboard/record",
      execution_stale,
    });
  }

  // No record → Record activation (single CTA)
  return NextResponse.json({
    ok: true,
    next_action: "record_activation",
    label: "Record activation",
    href: "/dashboard/import",
    execution_stale,
  });
}
