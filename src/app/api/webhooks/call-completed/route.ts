import { NextRequest, NextResponse } from "next/server";
import { resolvePostCallActions } from "@/lib/intelligence/post-call-resolver";
import { processEvent } from "@/lib/intelligence/reactive-event-processor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate webhook signature (implement based on your webhook provider)
    // const isValid = validateWebhookSignature(request, body);
    // if (!isValid) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    // Extract call data from webhook
    const { callerId, duration, recordingUrl, outcome, leadId, timestamp } = body;

    if (!callerId || !leadId) {
      return NextResponse.json(
        { error: "Missing required fields: callerId, leadId" },
        { status: 400 }
      );
    }

    // Resolve post-call actions
    const postCallResult = await resolvePostCallActions({
      leadId,
      callerId,
      duration,
      recordingUrl,
      outcome,
    });

    // Process call_completed event
    const eventResult = await processEvent({
      leadId,
      eventType: "call_completed",
      eventData: {
        callerId,
        duration,
        recordingUrl,
        outcome,
        timestamp: timestamp || new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        postCall: postCallResult,
        event: eventResult,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Call completion webhook failed", details: message },
      { status: 500 }
    );
  }
}
