/**
 * GET /api/enterprise/audit?workspace_id=... — last 200 entries, newest first.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
    if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
    const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "auditor", "compliance"]);
    if (authErr) return authErr;

    const db = getDb();
    const { data: rows } = await db
      .from("audit_log")
      .select("id, actor_type, action_type, details_json, recorded_at")
      .eq("workspace_id", workspaceId)
      .order("recorded_at", { ascending: false })
      .limit(200);

    return NextResponse.json({ ok: true, entries: rows ?? [] });
  } catch (err) {
    log("error", "enterprise.audit.GET", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
