/**
 * Handled situations: factual imprints of avoided manual tasks.
 * No totals, no counters. For use sparingly (after absence, weekly summary, first open).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getHandledImprints } from "@/lib/handled-imprints/query";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const imprints = await getHandledImprints(workspaceId);
  return NextResponse.json({ imprints });
}
