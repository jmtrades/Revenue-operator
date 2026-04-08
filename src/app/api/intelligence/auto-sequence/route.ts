import { NextRequest, NextResponse } from "next/server";
import {
  generateOptimalSequence,
  adaptSequenceFromPerformance,
} from "@/lib/sequences/auto-sequence-generator";

export async function POST(request: NextRequest) {
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
