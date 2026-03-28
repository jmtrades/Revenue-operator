export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

/**
 * GET /api/leads/[id]/optimal-call-time
 *
 * Get the optimal time to call this lead based on historical data.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const timezone = req.nextUrl.searchParams.get("timezone") || undefined;

  try {
    const { getLeadCallSchedule } = await import("@/lib/intelligence/smart-scheduling");
    const schedule = await getLeadCallSchedule(workspaceId, id, timezone);
    return NextResponse.json(schedule);
  } catch (err) {
    log("error", "leads.optimal_call_time.GET", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to get optimal call time" }, { status: 500 });
  }
}
