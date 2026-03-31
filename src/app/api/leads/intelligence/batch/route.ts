export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export interface BatchIntelligenceSummary {
  urgency_score: number;
  intent_score: number;
  engagement_score: number;
  conversion_probability: number;
  churn_risk: number;
  next_best_action: string;
  risk_flags: string[];
  action_confidence: number;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace access
    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;

    let body: { lead_ids?: string[] } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const leadIds = body.lead_ids ?? [];
    if (!Array.isArray(leadIds)) {
      return NextResponse.json({ error: "lead_ids must be an array" }, { status: 400 });
    }

    // Limit to 50 leads per batch
    if (leadIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 lead_ids per request" },
        { status: 400 }
      );
    }

    if (leadIds.length === 0) {
      return NextResponse.json({});
    }

    const db = getDb();

    // Query lead_intelligence table for all matching leads in one query
    const { data: intelligenceRows, error } = await db
      .from("lead_intelligence")
      .select(
        "lead_id,urgency_score,intent_score,engagement_score,conversion_probability,churn_risk,next_best_action,risk_flags_json,action_confidence"
      )
      .eq("workspace_id", session.workspaceId)
      .in("lead_id", leadIds);

    if (error) {
      log("error", "leads.intelligence.batch_lookup_error", { error: error.message });
      return NextResponse.json({ error: "Could not process lead data" }, { status: 500 });
    }

    // Build map of lead_id -> intelligence summary
    const result: Record<string, BatchIntelligenceSummary | null> = {};

    for (const leadId of leadIds) {
      const row = (intelligenceRows ?? []).find(
        (r: Record<string, unknown>) => r.lead_id === leadId
      );

      if (row) {
        result[leadId] = {
          urgency_score: (row as Record<string, unknown>).urgency_score as number,
          intent_score: (row as Record<string, unknown>).intent_score as number,
          engagement_score: (row as Record<string, unknown>).engagement_score as number,
          conversion_probability: (row as Record<string, unknown>).conversion_probability as number,
          churn_risk: (row as Record<string, unknown>).churn_risk as number,
          next_best_action: (row as Record<string, unknown>).next_best_action as string,
          risk_flags: ((row as Record<string, unknown>).risk_flags_json as string[]) || [],
          action_confidence: (row as Record<string, unknown>).action_confidence as number,
        };
      } else {
        result[leadId] = null;
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    log("error", "leads.intelligence.batch_route_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
