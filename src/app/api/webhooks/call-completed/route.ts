import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { resolvePostCallActions, type CallOutcomeType } from "@/lib/intelligence/post-call-resolver";
import { processEvent } from "@/lib/intelligence/reactive-event-processor";
import { log } from "@/lib/logger";

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed in ANY deployed environment — only skip locally.
    const isDeployed = process.env.NODE_ENV === "production";
    if (isDeployed) {
      log("error", "call_completed_webhook.secret_not_configured", {
        message: "rejecting webhook — VOICE_WEBHOOK_SECRET must be set in all deployed environments",
        node_env: process.env.NODE_ENV,
      });
      return false;
    }
    log("warn", "call_completed_webhook.secret_not_configured", { message: "skipping signature verification in local development only" });
    return true;
  }

  const expected = createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("hex");
  // Timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(signature, "utf-8"));
  } catch {
    return expected === signature;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-voice-webhook-signature") ?? "";

    // Verify webhook signature — rejects if secret is missing in production
    if (!verifyWebhookSignature(body, signature)) {
      log("warn", "call_completed_webhook.invalid_signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Extract call data from webhook
    const { callerId, duration, recordingUrl, outcome, leadId, timestamp } = payload as {
      callerId?: unknown;
      duration?: unknown;
      recordingUrl?: unknown;
      outcome?: unknown;
      leadId?: unknown;
      timestamp?: unknown;
    };

    // Validate all required fields
    if (!callerId || typeof callerId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: callerId" },
        { status: 400 }
      );
    }

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: leadId" },
        { status: 400 }
      );
    }

    // Validate optional fields if present
    if (duration !== undefined && typeof duration !== "number") {
      return NextResponse.json(
        { error: "Invalid field: duration must be a number" },
        { status: 400 }
      );
    }

    if (recordingUrl !== undefined && typeof recordingUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid field: recordingUrl must be a string" },
        { status: 400 }
      );
    }

    if (outcome !== undefined && typeof outcome !== "string") {
      return NextResponse.json(
        { error: "Invalid field: outcome must be a string" },
        { status: 400 }
      );
    }

    // Resolve post-call actions
    const postCallResult = await resolvePostCallActions({
      callerId: callerId || leadId,
      callerPhone: callerId || "",
      duration: (duration as number) ?? 0,
      outcome: ((outcome as string | undefined) ?? "completed") as CallOutcomeType,
      sentiment: "neutral",
      topicsDiscussed: [],
      keyMoments: [],
      transcriptSummary: "",
      timestamp: new Date().toISOString(),
    });

    // Process call_completed event with proper types
    const leadEvent = {
      id: `call-${Date.now()}`,
      type: "call_attempt_failed" as const,
      timestamp: (timestamp as string | undefined) || new Date().toISOString(),
      leadId,
      data: {
        callerId,
        duration: (duration as number) ?? 0,
        recordingUrl,
        outcome: (outcome as string | undefined) ?? "completed",
      },
    };

    const leadContext = {
      leadId,
      name: "",
      lifecyclePhase: "ENGAGED",
      daysSinceFirstContact: 0,
      daysSinceDark: 0,
      leadScore: 50,
      conversionProbability: 0.5,
      lastActivityAt: new Date().toISOString(),
      lastTouchChannel: "call" as const,
      totalTouchpoints: 1,
      recentEvents: [],
      sentiment: "neutral" as const,
      hasOptedOut: false,
      isHighValue: false,
    };

    const eventResult = await processEvent(leadEvent, leadContext);

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
