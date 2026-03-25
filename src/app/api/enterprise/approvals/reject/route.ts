/**
 * POST /api/enterprise/approvals/reject — mark one message approval as rejected.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole, type WorkspaceRole } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { decideApproval } from "@/lib/governance/approval-queue";
import { getDb } from "@/lib/db/queries";
import { allowFeature } from "@/lib/feature-gate/resolver";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  const workspaceId = body.workspace_id?.trim();
  const approvalId = body.approval_id?.trim();
  if (!workspaceId || !approvalId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "compliance"]);
  if (authErr) return authErr;

  const session = await getSession(req);
  const decidedBy = session?.userId ?? null;
  const updated = await decideApproval(approvalId, workspaceId, "rejected", decidedBy);
  if (!updated) return NextResponse.json({ ok: false, reason: "not_found_or_already_decided" }, { status: 409 });

  // Compliance override: when compliance rejects under dual_approval, lock further attempts for a cooldown window.
  const dualApprovalEnabled = await allowFeature(workspaceId, "dual_approval");
  if (dualApprovalEnabled && decidedBy) {
    const db = getDb();
    let decidedRole: WorkspaceRole | "unknown" = "unknown";
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

    if (decidedRole === "compliance") {
      const cooldownMs = 24 * 60 * 60 * 1000;
      const lockedUntil = new Date(Date.now() + cooldownMs).toISOString();
      try {
        await db.from("message_approval_locks").insert({
          workspace_id: workspaceId,
          approval_id: approvalId,
          locked_until: lockedUntil,
          reason: "compliance_lock",
        });
      } catch {
        // ignore (lock is best-effort; append-only)
      }
    }
  }

  return NextResponse.json({ ok: true });
}
