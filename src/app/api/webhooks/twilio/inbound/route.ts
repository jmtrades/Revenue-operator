/**
 * Twilio Inbound SMS — Doctrine: only normalize to canonical signal, then enqueue process_signal.
 * No state mutation, no enqueueDecision. Signal consumer drives state + operators.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { burstDrain } from "@/lib/queue/burst-drain";
import { logWebhookFailure } from "@/lib/reliability/logging";
import { ingestInboundAsSignal } from "@/lib/signals/ingest-inbound";

function verifyTwilioSignature(
  _url: string,
  _params: URLSearchParams,
  _signature: string,
  _authToken: string
): boolean {
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

    const db = getDb();
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("workspace_id, twilio_account_sid, proxy_number")
      .or(`proxy_number.eq.${to},twilio_phone_sid.eq.${to}`)
      .eq("status", "active")
      .single();

    if (!phoneConfig) {
      if (accountSid) {
        const { data: configByAccount } = await db
          .from("phone_configs")
          .select("workspace_id")
          .eq("twilio_account_sid", accountSid)
          .eq("status", "active")
          .single();
        if (configByAccount) {
          const workspaceId = (configByAccount as { workspace_id: string }).workspace_id;
          try {
            const { signalId, inserted } = await ingestInboundAsSignal({
              workspace_id: workspaceId,
              channel: "sms",
              external_lead_id: from.replace(/[^0-9+]/g, ""),
              thread_id: from,
              message: body,
              external_message_id: messageSid,
            });
            if (inserted && signalId) {
              await enqueue({ type: "process_signal", signalId });
              await burstDrain();
            }
          } catch (err) {
            logWebhookFailure("twilio_inbound", err, workspaceId);
          }
          return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/xml" } });
        }
      }
      console.warn("[twilio-inbound] No workspace found", { to, from });
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    const workspaceId = (phoneConfig as { workspace_id: string }).workspace_id;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken && signature) {
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        if (typeof value === "string") params.append(key, value);
      });
      if (!verifyTwilioSignature(request.url, params, signature, authToken)) {
        console.warn("[twilio-inbound] Signature verification failed", { workspaceId });
      }
    }

    try {
      const { signalId, inserted } = await ingestInboundAsSignal({
        workspace_id: workspaceId,
        channel: "sms",
        external_lead_id: from.replace(/[^0-9+]/g, ""),
        thread_id: from,
        message: body,
        external_message_id: messageSid,
      });
      if (inserted && signalId) {
        await enqueue({ type: "process_signal", signalId });
        await burstDrain();
      }
    } catch (err) {
      logWebhookFailure("twilio_inbound", err, workspaceId);
    }

    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[twilio-inbound]", error);
    logWebhookFailure("twilio_inbound", error);
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
