import { NextRequest, NextResponse } from "next/server";
import {
  matchScenario,
  getScenarioResponse,
} from "@/lib/intelligence/scenario-intelligence";

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
      case "match":
        result = await matchScenario(params);
        break;

      case "playbook":
        result = await getScenarioResponse(params);
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
      { error: "Scenario matching failed", details: message },
      { status: 500 }
    );
  }
}
