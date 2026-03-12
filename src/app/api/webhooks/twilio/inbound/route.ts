/**
 * Twilio Inbound SMS and WhatsApp — Doctrine: only normalize to canonical signal, then enqueue process_signal.
 * From/To may be "whatsapp:+E164" for WhatsApp; we normalize for lookup and ingest with channel sms or whatsapp.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { burstDrain } from "@/lib/queue/burst-drain";
import { logWebhookFailure } from "@/lib/reliability/logging";
import { ingestInboundAsSignal } from "@/lib/signals/ingest-inbound";

function verifyTwilioSignature(
  url: string,
  params: URLSearchParams,
  signature: string,
  authToken: string
): boolean {
  const data = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, value]) => `${acc}${key}${value}`, url);
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf8"))
    .digest("base64");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  return (
    expectedBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf)
  );
}

function getValidationUrl(request: NextRequest): string {
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredBase) return request.url;
  const incoming = new URL(request.url);
  const base = configuredBase.replace(/\/$/, "");
  return `${base}${incoming.pathname}${incoming.search}`;
}

/** Strip whatsapp: prefix for DB lookup; return normalized number. */
function normalizeToForLookup(to: string): string {
  const s = (to ?? "").trim();
  return s.startsWith("whatsapp:") ? s.slice(9).trim() : s;
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

    const toNormalized = normalizeToForLookup(to);
    const isWhatsApp = (to ?? "").startsWith("whatsapp:") || (from ?? "").startsWith("whatsapp:");
    const channel: "sms" | "whatsapp" = isWhatsApp ? "whatsapp" : "sms";

    const db = getDb();
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("workspace_id, twilio_account_sid, proxy_number, whatsapp_enabled")
      .or(`proxy_number.eq.${toNormalized},twilio_phone_sid.eq.${toNormalized}`)
      .eq("status", "active")
      .maybeSingle();

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
          const fromNorm = (from ?? "").startsWith("whatsapp:") ? from.slice(9).replace(/[^0-9+]/g, "") : from.replace(/[^0-9+]/g, "");
          try {
            const { signalId, inserted } = await ingestInboundAsSignal({
              workspace_id: workspaceId,
              channel,
              external_lead_id: fromNorm,
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
      // No workspace; 404 below
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    const workspaceId = (phoneConfig as { workspace_id: string }).workspace_id;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken && signature) {
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        if (typeof value === "string") params.append(key, value);
      });
      const validationUrl = getValidationUrl(request);
      if (!verifyTwilioSignature(validationUrl, params, signature, authToken)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    try {
      const normalizedPhone = (from ?? "").startsWith("whatsapp:") ? from.slice(9).replace(/[^0-9+]/g, "") : from.replace(/[^0-9+]/g, "");
      const { signalId, inserted } = await ingestInboundAsSignal({
        workspace_id: workspaceId,
        channel,
        external_lead_id: normalizedPhone,
        thread_id: from,
        message: body,
        external_message_id: messageSid,
      });
      if (inserted && signalId) {
        await enqueue({ type: "process_signal", signalId });
        await burstDrain();
      }
      const { data: leadRow } = await db
        .from("leads")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("external_id", normalizedPhone)
        .limit(1)
        .maybeSingle();
      const leadId = (leadRow as { id: string } | null)?.id;
      if (leadId) {
        const now = new Date().toISOString();
        try {
          await db.from("messages").insert({
            workspace_id: workspaceId,
            lead_id: leadId,
            direction: "inbound",
            channel,
            content: body,
            status: "delivered",
            trigger: "manual",
            sent_at: now,
          });
        } catch {
          // ignore insert failure (e.g. table shape differs)
        }
      }
    } catch (err) {
      logWebhookFailure("twilio_inbound", err, workspaceId);
    }

    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    // Error response below
    logWebhookFailure("twilio_inbound", error);
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
