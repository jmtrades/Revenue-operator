import { NextRequest, NextResponse } from "next/server";
import {
  processEvent,
  classifyUrgency,
  buildEventChain,
  detectReactivationSignals,
} from "@/lib/intelligence/reactive-event-processor";

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
      case "process":
        result = await processEvent(params);
        break;

      case "urgency":
        result = await classifyUrgency(params);
        break;

      case "chain":
        result = await buildEventChain(params);
        break;

      case "reactivation":
        result = await detectReactivationSignals(params);
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
      { error: "Event processing failed", details: message },
      { status: 500 }
    );
  }
}
