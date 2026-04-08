import { NextRequest, NextResponse } from "next/server";
import {
  generateOptimalSequence,
  adaptSequenceFromPerformance,
} from "@/lib/sequences/auto-sequence-generator";
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
    const { action, params } = body;

    if (!action || !params) {
      return NextResponse.json(
        { error: "Missing required fields: action, params" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "generate":
        result = await generateOptimalSequence(params);
        break;

      case "adapt":
        if (!params.sequence || !params.metrics) {
          return NextResponse.json(
            { error: "Missing required fields for adapt: sequence, metrics" },
            { status: 400 }
          );
        }
        result = await adaptSequenceFromPerformance(
          params.sequence,
          params.metrics
        );
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
      { error: "Auto sequence intelligence failed", details: message },
      { status: 500 }
    );
  }
}
