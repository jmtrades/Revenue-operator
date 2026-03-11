/**
 * GET /api/integrations/sync-log — Sync history for current workspace (Task 19).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getSyncHistory } from "@/lib/integrations/sync-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;
  const provider = searchParams.get("provider")?.trim() || undefined;
  const dir = searchParams.get("direction");
  const direction = dir === "inbound" || dir === "outbound" ? dir : undefined;

  const { entries, total } = await getSyncHistory({
    workspaceId: session.workspaceId,
    limit,
    offset,
    provider,
    direction,
  });
  return NextResponse.json({ entries, total });
}
