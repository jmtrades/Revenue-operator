/**
 * Channel Orchestration - Recommend Endpoint
 * POST /api/channel-orchestration/recommend
 * Returns channel recommendations for one or more leads.
 * Rate limited: 50 requests per minute per workspace.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { determineOptimalChannel } from "@/lib/channel-orchestration/engine";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    // Auth and workspace validation
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Rate limiting: 50 per minute per workspace
    const rateLimitKey = `channel-orchestration:recommend:${workspaceId}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 50, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
      );
    }

    // Parse request body
    let body: { lead_id?: string; lead_ids?: string[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate input
    const leadIds = body.lead_ids ?? (body.lead_id ? [body.lead_id] : []);
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "lead_id (string) or lead_ids (array) required" },
        { status: 400 }
      );
    }

    // Cap at 100 leads per request to prevent abuse
    if (leadIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 leads per request" },
        { status: 400 }
      );
    }

    // Generate recommendations for each lead
    const recommendations = await Promise.all(
      leadIds.map(async (leadId) => {
        try {
          const recommendation = await determineOptimalChannel(workspaceId, leadId);
          return {
            lead_id: leadId,
            recommendation,
            error: null,
          };
        } catch (error) {
          log("error", `[channel-orchestration/recommend] Error for lead ${leadId}:`, { error: error });
          return {
            lead_id: leadId,
            recommendation: null,
            error: "Recommendation failed",
          };
        }
      })
    );

    return NextResponse.json(
      {
        workspace_id: workspaceId,
        recommendations,
        timestamp: new Date().toISOString(),
        rate_limit: {
          remaining: rateLimit.remaining,
          reset_at: rateLimit.resetAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    log("error", "[channel-orchestration/recommend] Error:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
