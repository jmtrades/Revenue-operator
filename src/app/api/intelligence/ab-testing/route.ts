import { NextRequest, NextResponse } from "next/server";
import {
  createExperiment,
  assignVariant,
  recordOutcome,
  evaluateExperiment,
  autoPromoteWinner,
} from "@/lib/intelligence/ab-testing-engine";

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
      case "create":
        result = await createExperiment(params);
        break;

      case "assign":
        result = await assignVariant(params.experimentId, params.prospectId);
        break;

      case "record":
        result = await recordOutcome(
          params.experimentId,
          params.prospectId,
          params.outcome
        );
        break;

      case "evaluate":
        result = await evaluateExperiment(params.experimentId);
        break;

      case "promote":
        result = await autoPromoteWinner(params.experimentId);
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
      { error: "A/B testing intelligence failed", details: message },
      { status: 500 }
    );
  }
}
