/**
 * Twilio Inbound SMS and WhatsApp — Doctrine: only normalize to canonical signal, then enqueue process_signal.
 * From/To may be "whatsapp:+E164" for WhatsApp; we normalize for lookup and ingest with channel sms or whatsapp.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { burstDrain } from "@/lib/queue/burst-drain";
import { logWebhookFailure } from "@/lib/reliability/logging";
import { ingestInboundAsSignal } from "@/lib/signals/ingest-inbound";
import { log } from "@/lib/logger";
import { normalizePhone } from "@/lib/security/phone";
import {
  verifyTwilioRequest,
  buildTwilioCandidateUrls,
  TwilioSignatureConfigError,
} from "@/lib/security/twilio-signature";

/** Strip whatsapp: prefix for DB lookup; return normalized number. */
function normalizeToForLookup(to: string): string {
  const s = (to ?? "").trim();
  return s.startsWith("whatsapp:") ? s.slice(9).trim() : s;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const signature = request.headers.get("x-twilio-signature");

    // Phase 78/Phase 4 (P0-3): signature check is the FIRST thing after parsing
    // the body — no DB reads, no enqueues, no side effects until the request is
    // proven to be from Twilio. `verifyTwilioRequest` is fail-closed: it throws
    // `TwilioSignatureConfigError` if `TWILIO_AUTH_TOKEN` is unset (caught below
    // and returned as 500) rather than silently accepting.
    if (!verifyTwilioRequest(buildTwilioCandidateUrls(request), formData, signature)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const from = formData.get("From") as string | null;
    const to = formData.get("To") as string | null;
    const body = formData.get("Body") as string | null;
    const messageSid = formData.get("MessageSid") as string | null;
    const accountSid = formData.get("AccountSid") as string | null;

    if (!from || !to || !body || !messageSid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const toNormalized = normalizeToForLookup(to);
    const isWhatsApp = (to ?? "").startsWith("whatsapp:") || (from ?? "").startsWith("whatsapp:");
    const channel: "sms" | "whatsapp" = isWhatsApp ? "whatsapp" : "sms";

    // Phase 78/Phase 3 (D7): pre-validate to strict E.164 before any PostgREST
    // `.or(...)` interpolation. `toNormalized` is still attacker-controlled
    // form-data; passing it directly into `.or(...)` would permit filter-graft
    // injection (e.g. `+1...,workspace_id.eq.<uuid>`).
    const toE164 = normalizePhone(toNormalized);
    const db = getDb();
    let phoneConfig:
      | {
          workspace_id: string;
          twilio_account_sid?: string;
          proxy_number?: string;
          whatsapp_enabled?: boolean;
        }
      | null = null;
    if (toE164) {
      const toDigits = toE164.slice(1);
      const { data } = await db
        .from("phone_configs")
        .select("workspace_id, twilio_account_sid, proxy_number, whatsapp_enabled")
        .or(`proxy_number.eq.${toE164},proxy_number.eq.${toDigits}`)
        .eq("status", "active")
        .maybeSingle();
      phoneConfig = (data as typeof phoneConfig) ?? null;
    }

    if (!phoneConfig) {
      if (accountSid) {
        const { data: configByAccount } = await db
          .from("phone_configs")
          .select("workspace_id")
          .eq("twilio_account_sid", accountSid)
          .eq("status", "active")
          .maybeSingle();
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
      // No workspace found for this phone number
      log("warn", "twilio_inbound.no_workspace", { from: formData.get("From"), to: formData.get("To") });
      return new NextResponse("Not Found", { status: 404, headers: { "Content-Type": "text/xml" } });
    }

    const workspaceId = (phoneConfig as { workspace_id: string }).workspace_id;

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
    // Phase 78/Phase 4: missing TWILIO_AUTH_TOKEN is a deploy-time misconfig.
    // Return 500 (loud) so ops notices — not 200 that silently drops the SMS.
    if (error instanceof TwilioSignatureConfigError) {
      log("error", "twilio_inbound.signature_config_error", { message: error.message });
      return new NextResponse("Server misconfigured", { status: 500 });
    }
    logWebhookFailure("twilio_inbound", error);
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
