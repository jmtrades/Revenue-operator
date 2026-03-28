/**
 * POST /api/voice/route-call — Inbound call routing endpoint
 *
 * Called by Twilio when an inbound call arrives. Uses the call routing engine
 * to determine where to send the call (AI agent, human agent, voicemail, etc.)
 * and returns a TwiML response.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { routeInboundCall, buildRoutingTwiml } from "@/lib/voice/call-routing-engine";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
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
