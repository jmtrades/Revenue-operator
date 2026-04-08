import { NextRequest, NextResponse } from "next/server";
import {
  buildBrainFromInteractions,
  computeNextAction,
  updateBrainWithEvent,
  assessLeadHealth,
} from "@/lib/intelligence/lead-brain";
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
      case "build":
        result = await buildBrainFromInteractions(params);
        break;

      case "compute":
        result = await computeNextAction(params);
        break;

      case "update":
        result = await updateBrainWithEvent(params);
        break;

      case "health":
        result = await assessLeadHealth(params);
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
      { error: "Lead brain operation failed", details: message },
      { status: 500 }
    );
  }
}
