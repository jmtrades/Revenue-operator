import { NextRequest, NextResponse } from "next/server";
import {
  determineNextBestAction,
  generateFollowUpMessage,
  prioritizeActionQueue,
  calculateFollowUpFatigue,
} from "@/lib/intelligence/auto-follow-up-engine";

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
      case "next-action":
        result = await determineNextBestAction(params);
        break;

      case "message":
        result = await generateFollowUpMessage(params);
        break;

      case "prioritize":
        result = await prioritizeActionQueue(params);
        break;

      case "fatigue":
        result = await calculateFollowUpFatigue(params);
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
      { error: "Auto follow-up intelligence failed", details: message },
      { status: 500 }
    );
  }
}
