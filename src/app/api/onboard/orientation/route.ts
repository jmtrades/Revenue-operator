/**
 * GET /api/onboard/orientation
 * Get orientation records for workspace.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data } = await db
    .from("orientation_records")
    .select("text")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(20);

  return NextResponse.json({
    lines: (data ?? []).map((r: { text: string }) => r.text),
  });
}
