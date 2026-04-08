import { NextRequest, NextResponse } from "next/server";
import {
  predictBestContactWindow,
  rankLeadsForCurrentWindow,
  generateDailyCallPlan,
} from "@/lib/intelligence/best-time-engine";

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
      case "predict":
        result = await predictBestContactWindow(params);
        break;

      case "rank":
        result = await rankLeadsForCurrentWindow(params);
        break;

      case "plan":
        result = await generateDailyCallPlan(params);
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
      { error: "Best time intelligence failed", details: message },
      { status: 500 }
    );
  }
}
