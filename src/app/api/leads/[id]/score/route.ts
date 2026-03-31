export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

/**
 * GET /api/leads/[id]/score
 *
 * Get a lead's full score breakdown with factors and recommendation.
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

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const { scoreLeadFull } = await import("@/lib/intelligence/lead-scoring");
    const score = await scoreLeadFull(workspaceId, id);
    return NextResponse.json(score);
  } catch (err) {
    log("error", "[lead-score]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to score lead" }, { status: 500 });
  }
}
import { log } from "@/lib/logger";
