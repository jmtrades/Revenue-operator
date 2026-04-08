import { NextRequest, NextResponse } from "next/server";
import {
  evaluateTransition,
  getStageRequirements,
  calculateStageHealth,
  generateTransitionMap,
  defineStagePlaybook,
} from "@/lib/intelligence/lead-lifecycle-machine";
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
      case "transition":
        result = await evaluateTransition(params);
        break;

      case "requirements":
        result = await getStageRequirements(params);
        break;

      case "health":
        result = await calculateStageHealth(params);
        break;

      case "map":
        result = await generateTransitionMap(params);
        break;

      case "playbook":
        result = await defineStagePlaybook(params);
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
      { error: "Lifecycle management failed", details: message },
      { status: 500 }
    );
  }
}
