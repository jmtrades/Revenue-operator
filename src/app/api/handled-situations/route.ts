/**
 * Handled situations: factual imprints of avoided manual tasks.
 * No totals, no counters. For use sparingly (after absence, weekly summary, first open).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getHandledImprints } from "@/lib/handled-imprints/query";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const imprints = await getHandledImprints(workspaceId);
  return NextResponse.json({ imprints });
}
