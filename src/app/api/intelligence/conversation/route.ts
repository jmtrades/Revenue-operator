import { NextRequest, NextResponse } from "next/server";
import {
  analyzeConversation,
  scoreCallPerformance,
  extractCoachingInsights,
  detectKeyMoments,
} from "@/lib/intelligence/conversation-intelligence";

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
      case "analyze":
        result = await analyzeConversation(params);
        break;

      case "score":
        result = await scoreCallPerformance(params);
        break;

      case "coaching":
        result = await extractCoachingInsights(params);
        break;

      case "moments":
        result = await detectKeyMoments(params);
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
      { error: "Conversation intelligence failed", details: message },
      { status: 500 }
    );
  }
}
