import { NextRequest, NextResponse } from "next/server";
import {
  analyzeDealVelocity,
  identifyBottlenecks,
  recommendAccelerators,
  predictDealCloseDate,
} from "@/lib/intelligence/deal-velocity-analyzer";
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
      case "velocity":
        result = await analyzeDealVelocity(params);
        break;

      case "bottlenecks":
        result = await identifyBottlenecks(params);
        break;

      case "accelerators":
        result = await recommendAccelerators(params);
        break;

      case "predict-close":
        result = await predictDealCloseDate(params);
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
      { error: "Deal velocity intelligence failed", details: message },
      { status: 500 }
    );
  }
}
