/**
 * GET /api/installation/economic-pressure?workspace_id=...
 * Plain text statements only. No counts, amounts, currency, or percentages.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEconomicPressureLines } from "@/lib/financial-exposure";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lines = await getEconomicPressureLines(workspaceId);
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
