import { NextRequest, NextResponse } from "next/server";
import {
  computeActionForLead,
  batchComputeActions,
  evaluateOutcome,
  explainDecision,
} from "@/lib/intelligence/contextual-action-engine";

export async function POST(request: NextRequest) {
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
        result = await computeActionForLead(params);
        break;

      case "batch":
        result = await batchComputeActions(params);
        break;

      case "evaluate":
        result = await evaluateOutcome(params);
        break;

      case "explain":
        result = await explainDecision(params);
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
