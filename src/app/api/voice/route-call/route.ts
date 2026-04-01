/**
 * POST /api/voice/route-call — Inbound call routing endpoint
 *
 * Called by Twilio when an inbound call arrives. Uses the call routing engine
 * to determine where to send the call (AI agent, human agent, voicemail, etc.)
 * and returns a TwiML response.
 *
 * Security: Validates Twilio request signature using account auth token.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { routeInboundCall, buildRoutingTwiml } from "@/lib/voice/call-routing-engine";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Twilio request signature using the auth token.
 * Twilio signs requests with HMAC-SHA1 of the full request URL and POST data.
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string | string[]>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProduction) {
      log("error", "voice_routing.twilio_auth_token_missing", { message: "rejecting request — TWILIO_AUTH_TOKEN must be set in production" });
      return false;
    }
    log("warn", "voice_routing.twilio_auth_token_missing", { message: "skipping signature verification in development" });
    return true;
  }

  // Build data string: URL + sorted POST params
  let data = url;
  const sorted = Object.keys(params).sort();
  for (const key of sorted) {
    const val = params[key];
    data += key + (Array.isArray(val) ? val[0] : val);
  }

  const expected = createHmac("sha1", authToken)
    .update(data, "utf-8")
    .digest("base64");

  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(signature, "utf-8"));
  } catch {
    return expected === signature;
  }
}

export async function POST(request: NextRequest) {
  // Verify Twilio signature
  const signature = request.headers.get("x-twilio-signature");
  const formData = await request.formData();

  // Build params object from FormData
  const params: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = value;
  }

  if (!verifyTwilioSignature(request.nextUrl.toString(), params, signature ?? "")) {
    log("error", "voice_routing.invalid_signature", { message: "Twilio signature verification failed" });
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Unauthorized request. Please try again.</Say>
</Response>`,
      {
        status: 401,
        headers: { "Content-Type": "application/xml" },
      }
    );
  }

  try {
    const twilio = {
      from: formData.get("From") as string,
      to: formData.get("To") as string,
      callSid: formData.get("CallSid") as string,
      accountSid: formData.get("AccountSid") as string,
    };

    // Validate required Twilio fields
    if (!twilio.from || !twilio.to || !twilio.callSid) {
      log("warn", "voice_routing.missing_params", {
        from: twilio.from,
        to: twilio.to,
        callSid: twilio.callSid,
      });
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're having technical difficulties. Please try again later.</Say>
</Response>`,
        {
          status: 400,
          headers: { "Content-Type": "application/xml" },
        }
      );
    }

    // Look up workspace by the "To" number (inbound DID)
    const db = getDb();
    const { data: phoneConfig } = await db
      .from("phone_numbers")
      .select("workspace_id")
      .eq("phone_number", twilio.to)
      .maybeSingle();

    if (!phoneConfig) {
      log("warn", "voice_routing.workspace_not_found", {
        toNumber: twilio.to,
        callSid: twilio.callSid,
      });
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This number is not configured. Please contact support.</Say>
</Response>`,
        {
          status: 404,
          headers: { "Content-Type": "application/xml" },
        }
      );
    }

    const workspaceId = (phoneConfig as { workspace_id: string }).workspace_id;

    // Route the call using the routing engine
    const decision = await routeInboundCall(
      workspaceId,
      twilio.from,
      twilio.to,
      { callSid: twilio.callSid, accountSid: twilio.accountSid }
    );

    // If decision includes after-hours metadata, handle special cases
    const routingMetadata = decision.metadata ?? {};

    // For emergency_only mode, we'll pass metadata through to voice provider
    // For forward action, buildRoutingTwiml will handle it directly

    // Build TwiML response
    const appUrl = request.nextUrl.origin;
    const twiml = buildRoutingTwiml(decision, appUrl, workspaceId);

    // Log routing decision
    log("info", "voice_routing.decision", {
      workspaceId,
      callSid: twilio.callSid,
      from: twilio.from,
      to: twilio.to,
      action: decision.action,
      agentId: decision.agent_id,
      reason: decision.reason,
      priority: decision.priority,
    });

    // Store call routing event
    try {
      await db.from("call_sessions").insert({
        workspace_id: workspaceId,
        twilio_call_sid: twilio.callSid,
        twilio_from: twilio.from,
        twilio_to: twilio.to,
        routing_decision: decision.action,
        routing_agent_id: decision.agent_id || null,
        routing_reason: decision.reason,
        started_at: new Date().toISOString(),
      });
    } catch (err) {
      log("warn", "voice_routing.failed_to_store_event", {
        error: err instanceof Error ? err.message : String(err),
        callSid: twilio.callSid,
      });
    }

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    log("error", "voice_routing.handler_error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/api/webhooks/twilio/voice/demo-turn" method="POST" speechTimeout="2" language="en-US">
    <Say voice="Polly.Joanna-Neural">Hi there! How can I help you today?</Say>
  </Gather>
</Response>`,
      {
        status: 500,
        headers: { "Content-Type": "application/xml" },
      }
    );
  }
}
