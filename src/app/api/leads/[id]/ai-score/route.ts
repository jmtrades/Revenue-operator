export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { scoreLeadWithAI, saveLeadScore } from "@/lib/lead-scoring/ai-scorer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    const authSession = await getSession(req);
    const workspaceId =
      req.nextUrl.searchParams.get("workspace_id") || authSession?.workspaceId;
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const rateLimitKey = `ai-score:${workspaceId}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 30 requests per minute per workspace.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimitResult.resetAt / 1000)),
          },
        }
      );
    }

    const db = getDb();
    const { data: lead, error: leadError } = await db
      .from("leads")
      .select("id, workspace_id")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const score = await scoreLeadWithAI(workspaceId, leadId);

    await saveLeadScore(workspaceId, leadId, score);

    return NextResponse.json({
      lead_id: leadId,
      ...score,
    });
  } catch (error) {
    console.error("[API] leads/[id]/ai-score error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        error: "Failed to score lead",
        details: message,
      },
      { status: 500 }
    );
  }
}
