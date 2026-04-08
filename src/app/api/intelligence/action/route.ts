import { NextRequest, NextResponse } from "next/server";
import {
  computeActionForLead,
  batchComputeActions,
  evaluateOutcome,
  explainDecision,
} from "@/lib/intelligence/contextual-action-engine";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(request);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "compute":
        result = await computeActionForLead(params.leadId, params.trigger, params.fullContext);
        break;

      case "batch":
        result = await batchComputeActions(params.leads);
        break;

      case "evaluate":
        result = await evaluateOutcome(params.leadId, params.action, params.outcome);
        break;

      case "explain":
        result = await explainDecision(params.plan);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Action computation failed", details: message },
      { status: 500 }
    );
  }
}
