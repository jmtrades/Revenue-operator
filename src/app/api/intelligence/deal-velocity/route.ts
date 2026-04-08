import { NextRequest, NextResponse } from "next/server";
import {
  analyzeDealVelocity,
  identifyBottlenecks,
  recommendAccelerators,
  predictDealCloseDate,
} from "@/lib/intelligence/deal-velocity-analyzer";

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
