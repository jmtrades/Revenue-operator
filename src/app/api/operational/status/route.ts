/**
 * GET /api/operational/status?workspace_id=...
 * Read-only. Returns display lines for Operational Status Card. No pipeline or logic changes.
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

  let call_handling = "Active";
  let inbound_source = "—";
  let outbound_queue = "—";
  let review_level = "Standard";

  try {
    const { data: ws } = await db.from("workspaces").select("status, pause_reason").eq("id", workspaceId).maybeSingle();
    const row = ws as { status?: string; pause_reason?: string } | null;
    if (row?.pause_reason || row?.status === "paused" || row?.status === "expired") call_handling = "Paused";
    else if (row?.status === "under_review") call_handling = "Under review";

    const { count } = await db.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    if (typeof count === "number") outbound_queue = count === 0 ? "0 leads" : `${count} leads`;

    const { data: policies } = await db
      .from("message_policies")
      .select("approval_mode")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle();
    const mode = (policies as { approval_mode?: string } | null)?.approval_mode ?? "";
    if (mode.toLowerCase() === "approval_required") review_level = "Approval required";
    else if (mode.toLowerCase() === "preview_required") review_level = "Preview required";

    const { data: anyThread } = await db
      .from("shared_transactions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle();
    if (anyThread) inbound_source = "Connected";
  } catch {
    // leave defaults
  }

  return NextResponse.json({
    ok: true,
    call_handling,
    inbound_source,
    outbound_queue,
    review_level,
  });
}
