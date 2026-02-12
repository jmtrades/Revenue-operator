/**
 * Twilio Inbound SMS Webhook Handler
 * Receives SMS messages from Twilio and creates/updates leads, then triggers decision pipeline
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { burstDrain } from "@/lib/queue/burst-drain";
import { logWebhookFailure } from "@/lib/reliability/logging";
import { getSession } from "@/lib/auth/request-session";

// Twilio webhook signature verification (optional but recommended)
function verifyTwilioSignature(
  url: string,
  params: URLSearchParams,
  signature: string,
  authToken: string
): boolean {
  // Twilio signature verification logic
  // For now, we'll rely on HTTPS and workspace isolation
  // In production, implement full Twilio signature verification
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string | null;
    const to = formData.get("To") as string | null;
    const body = formData.get("Body") as string | null;
    const messageSid = formData.get("MessageSid") as string | null;
    const accountSid = formData.get("AccountSid") as string | null;
    const signature = request.headers.get("x-twilio-signature");

    if (!from || !to || !body || !messageSid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find workspace by Twilio phone number (to field)
    const db = getDb();
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("workspace_id, twilio_account_sid, proxy_number")
      .or(`proxy_number.eq.${to},twilio_phone_sid.eq.${to}`)
      .eq("status", "active")
      .single();

    if (!phoneConfig) {
      // Try to find by account SID if provided
      if (accountSid) {
        const { data: configByAccount } = await db
          .from("phone_configs")
          .select("workspace_id")
          .eq("twilio_account_sid", accountSid)
          .eq("status", "active")
          .single();
        
        if (configByAccount) {
          const workspaceId = (configByAccount as { workspace_id: string }).workspace_id;
          
          // Create webhook event in standard format
          const webhookPayload = {
            workspace_id: workspaceId,
            channel: "sms",
            external_lead_id: from.replace(/[^0-9+]/g, ""), // Normalize phone number
            thread_id: from, // Use phone number as thread ID for SMS
            message: body,
            external_message_id: messageSid,
            direction: "inbound",
            metadata: {
              from,
              to,
              message_sid: messageSid,
              account_sid: accountSid,
            },
          };

          // Store in raw_webhook_events and trigger processing
          const { data: inserted } = await db
            .from("raw_webhook_events")
            .insert({
              workspace_id: workspaceId,
              payload: webhookPayload,
              source: "twilio_inbound",
              processed: false,
              dedupe_key: `twilio_${messageSid}`,
            })
            .select("id")
            .single();

          if (inserted) {
            const webhookId = (inserted as { id: string }).id;
            await enqueue({ type: "process_webhook", webhookId });
            await burstDrain();
          }

          return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/xml" } });
        }
      }

      // No workspace found - return 200 to Twilio (don't retry) but log
      console.warn("[twilio-inbound] No workspace found for phone number", { to, from });
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    const workspaceId = (phoneConfig as { workspace_id: string }).workspace_id;

    // Verify signature if auth token available (optional security enhancement)
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken && signature) {
      const url = request.url;
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        if (typeof value === "string") params.append(key, value);
      });
      if (!verifyTwilioSignature(url, params, signature, authToken)) {
        console.warn("[twilio-inbound] Signature verification failed", { workspaceId });
        // Continue anyway for now, but log
      }
    }

    // Create webhook event in standard format
    const webhookPayload = {
      workspace_id: workspaceId,
      channel: "sms",
      external_lead_id: from.replace(/[^0-9+]/g, ""), // Normalize phone number
      thread_id: from, // Use phone number as thread ID for SMS
      message: body,
      external_message_id: messageSid,
      direction: "inbound",
      metadata: {
        from,
        to,
        message_sid: messageSid,
        account_sid: accountSid,
      },
    };

    // Store in raw_webhook_events and trigger processing
    let inserted: { id: string } | null = null;
    try {
      const { data: insertedData, error } = await db
        .from("raw_webhook_events")
        .insert({
          workspace_id: workspaceId,
          payload: webhookPayload,
          source: "twilio_inbound",
          processed: false,
          dedupe_key: `twilio_${messageSid}`,
        })
        .select("id")
        .single();

      if (error) {
        // Check if duplicate
        const isDuplicate = String(error).includes("duplicate") || String(error).includes("unique");
        if (isDuplicate) {
          return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/xml" } });
        }
        throw error;
      }

      inserted = insertedData as { id: string } | null;
    } catch (err) {
      logWebhookFailure("twilio_inbound", err, workspaceId);
      // Queue retry silently
      if (inserted?.id) {
        await enqueue({ type: "process_webhook", webhookId: inserted.id });
      }
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    if (inserted) {
      const webhookId = inserted.id;
      await enqueue({ type: "process_webhook", webhookId });
      await burstDrain();
    }

    // Return TwiML response (empty - no automated reply from webhook)
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[twilio-inbound]", error);
    logWebhookFailure("twilio_inbound", error);
    // Always return 200 to Twilio to prevent retries
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
