/**
 * GET /api/installation/today-risk?workspace_id=...
 * Minimal text lines only. No counts, timestamps, or numbers.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTodayRiskTextLines } from "@/lib/immediate-risk";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const lines = await getTodayRiskTextLines(workspaceId);
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
