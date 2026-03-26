/**
 * POST /api/enterprise/approvals/approve — mark one message approval as approved.
 * Recompile path: after approve, emit send_message action intent so executor can send. No direct send.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole, type WorkspaceRole } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { decideApproval } from "@/lib/governance/approval-queue";
import { getDb } from "@/lib/db/queries";
import { createActionIntent } from "@/lib/action-intents";
import { allowFeature } from "@/lib/feature-gate/resolver";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  const workspaceId = body.workspace_id?.trim();
  const approvalId = body.approval_id?.trim();
  if (!workspaceId || !approvalId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: row } = await db
    .from("message_approvals")
    .select("id, status, proposed_message, thread_id, conversation_id, work_unit_id, workspace_id")
    .eq("id", approvalId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!row) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const r = row as {
    status: string;
    proposed_message: string;
    thread_id: string | null;
    conversation_id: string | null;
    work_unit_id: string | null;
  };
  if (r.status !== "pending") {
    return NextResponse.json({ ok: true, idempotent: true }, { status: 200 });
  }

  const session = await getSession(req);
  const decidedBy = session?.userId ?? null;

  // Determine workspace role for decision chain.
  let decidedRole: WorkspaceRole | "unknown" = "unknown";
  if (decidedBy) {
    const { data: wsRow } = await db
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();
    const ownerId = (wsRow as { owner_id?: string } | null)?.owner_id ?? null;
    if (ownerId && ownerId === decidedBy) {
      decidedRole = "owner";
    } else {
      const { data: roleRow } = await db
        .from("workspace_roles")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", decidedBy)
        .maybeSingle();
      const role = (roleRow as { role?: string } | null)?.role as WorkspaceRole | undefined;
      if (role) decidedRole = role;
    }
  }

  const dualApprovalEnabled = await allowFeature(workspaceId, "dual_approval");

  // Compliance lock: prevent approval when locked.
  if (dualApprovalEnabled) {
    const nowIso = new Date().toISOString();
    const { data: locks } = await db
      .from("message_approval_locks")
      .select("locked_until")
      .eq("workspace_id", workspaceId)
      .eq("approval_id", approvalId)
      .gt("locked_until", nowIso)
      .limit(1);
    if (locks && locks.length > 0) {
      return NextResponse.json({ ok: false, reason: "compliance_lock" }, { status: 423 });
    }
  }

  if (dualApprovalEnabled) {
    // Append decision to chain.
    try {
      await db.from("message_approval_decisions").insert({
        workspace_id: workspaceId,
        approval_id: approvalId,
        decision: "approved",
        decided_by: decidedBy,
        decided_role: decidedRole === "unknown" ? null : decidedRole,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "23505") {
        return NextResponse.json({ ok: false, reason: "decision_record_failed" }, { status: 500 });
      }
    }

    const { data: decisions } = await db
      .from("message_approval_decisions")
      .select("decided_by, decided_role, decision")
      .eq("workspace_id", workspaceId)
      .eq("approval_id", approvalId)
      .order("recorded_at", { ascending: true });
    const approved = (decisions ?? []).filter((d) => d.decision === "approved");

    if (approved.length === 0) {
      return NextResponse.json({ ok: false, reason: "dual_approval_internal_error" }, { status: 500 });
    }

    if (approved.length === 1) {
      // First approval: must be admin or compliance; no send yet.
      if (decidedRole !== "admin" && decidedRole !== "compliance") {
        return NextResponse.json({ ok: false, reason: "dual_approval_role_mismatch" }, { status: 403 });
      }
      return NextResponse.json({ ok: true, pending_second_approval: true }, { status: 200 });
    }

    // Second and subsequent approvals: require distinct actor and owner/admin role.
    const first = approved[0];
    if (first.decided_by && first.decided_by === decidedBy) {
      return NextResponse.json({ ok: true, idempotent: true }, { status: 200 });
    }
    if (decidedRole !== "owner" && decidedRole !== "admin") {
      return NextResponse.json({ ok: false, reason: "dual_approval_role_mismatch" }, { status: 403 });
    }

    const updated = await decideApproval(approvalId, workspaceId, "approved", decidedBy);
    if (!updated) return NextResponse.json({ ok: false, reason: "not_found_or_already_decided" }, { status: 409 });

    await createActionIntent(workspaceId, {
      threadId: r.thread_id ?? null,
      workUnitId: r.work_unit_id ?? null,
      intentType: "send_message",
      payload: {
        channel: "sms",
        text: r.proposed_message,
        thread_id: r.thread_id ?? undefined,
        conversation_id: r.conversation_id ?? undefined,
        workspace_id: workspaceId,
        approval_id: approvalId,
      },
      dedupeKey: `approval-approved:${approvalId}`,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Single-approval path (non-enterprise or dual_approval disabled).
  const updated = await decideApproval(approvalId, workspaceId, "approved", decidedBy);
  if (!updated) return NextResponse.json({ ok: false, reason: "not_found_or_already_decided" }, { status: 409 });

  await createActionIntent(workspaceId, {
    threadId: r.thread_id ?? null,
    workUnitId: r.work_unit_id ?? null,
    intentType: "send_message",
    payload: {
      channel: "sms",
      text: r.proposed_message,
      thread_id: r.thread_id ?? undefined,
      conversation_id: r.conversation_id ?? undefined,
      workspace_id: workspaceId,
      approval_id: approvalId,
    },
    dedupeKey: `approval-approved:${approvalId}`,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
