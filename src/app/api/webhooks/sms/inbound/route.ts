/**
 * Phase 14 — Multi-provider inbound SMS webhook.
 *
 * Accepts:
 *   - Twilio (form-encoded)  — validated via X-Twilio-Signature
 *   - Bandwidth (JSON)       — Bearer INBOUND_SMS_WEBHOOK_SECRET
 *   - Telnyx (JSON)          — Bearer INBOUND_SMS_WEBHOOK_SECRET
 *   - Generic snake_case JSON
 *
 * Flow:
 *   1. Parse body (form OR JSON).
 *   2. Auth — signature for Twilio, Bearer secret for the rest.
 *   3. normalizeInboundSms() auto-detects provider.
 *   4. Resolve workspace by toNumber → workspace_phone_numbers.phone_number.
 *   5. Resolve lead by fromNumber within workspace.
 *   6. Persist to raw_webhook_events (dedupe key on messageId).
 *   7. Enqueue process_sms_reply so the reactive event processor fires.
 *
 * Always 2xx — providers aggressively retry on non-2xx.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { log } from "@/lib/logger";
import {
  normalizeInboundSms,
  toSmsReplyEventData,
} from "@/lib/integrations/inbound-sms";
import { classifySmsKeyword } from "@/lib/compliance/sms-carrier-compliance";
import { normalizePhone } from "@/lib/security/phone";

const SECRET =
  process.env.INBOUND_SMS_WEBHOOK_SECRET ??
  process.env.INBOUND_WEBHOOK_SECRET ??
  null;

function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const data = url + sorted;
  const expected = crypto
    .createHmac("sha1", token)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let payload: Record<string, unknown>;
  let isTwilioForm = false;
  let rawFormParams: Record<string, string> = {};

  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      rawFormParams = Object.fromEntries(new URLSearchParams(text));
      payload = rawFormParams as unknown as Record<string, unknown>;
      isTwilioForm =
        typeof payload.From === "string" && typeof payload.To === "string";
    } else {
      payload = (await req.json()) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Auth
  if (isTwilioForm) {
    const sig = req.headers.get("x-twilio-signature");
    if (process.env.TWILIO_AUTH_TOKEN && process.env.NODE_ENV === "production") {
      const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/sms/inbound`;
      if (!sig || !verifyTwilioSignature(url, rawFormParams, sig)) {
        log("warn", "inbound_sms.twilio_invalid_signature", {});
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  } else {
    if (!SECRET && process.env.NODE_ENV === "production") {
      log("error", "inbound_sms.secret_not_configured", {});
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    }
    if (SECRET) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  const normalized = normalizeInboundSms(payload);
  if (!normalized) {
    return NextResponse.json({ received: true, normalized: false });
  }

  // Phase 15 — CTIA keyword handling BEFORE any downstream routing. STOP/HELP
  // must be honored immediately (before DB lookups can fail) to stay inside
  // TCPA's "reasonable time" window for honoring revocation.
  const keyword = classifySmsKeyword(normalized.body);

  const db = getDb();

  // Phase 78/Phase 3 (D7): defense-in-depth — re-validate to strict E.164
  // before any PostgREST `.or(...)` interpolation. `normalizeInboundSms`
  // already normalizes, but this module is the injection-safety boundary.
  const toE164 = normalizePhone(normalized.toNumber);
  const fromE164 = normalizePhone(normalized.fromNumber);

  // Resolve workspace by matching the recipient number to a provisioned
  // workspace phone number. Try E.164 first, then digits-only, then fall back
  // to owned number lookups in the older `phone_numbers` table if present.
  let workspaceId: string | null = null;
  try {
    const { data } = await db
      .from("workspace_phone_numbers")
      .select("workspace_id, phone_number")
      .eq("phone_number", toE164 ?? normalized.toNumber)
      .maybeSingle();
    if (data) workspaceId = (data as { workspace_id: string }).workspace_id;
  } catch {
    // table may not exist yet
  }
  if (!workspaceId && toE164) {
    try {
      const toDigits = toE164.slice(1);
      const { data } = await db
        .from("phone_numbers")
        .select("workspace_id, e164")
        .or(`e164.eq.${toE164},e164.eq.+${toDigits}`)
        .limit(1)
        .maybeSingle();
      if (data) workspaceId = (data as { workspace_id: string }).workspace_id;
    } catch {
      // additive
    }
  }

  // Always ack — providers retry on non-2xx.
  if (!workspaceId) {
    return NextResponse.json({ received: true, scoped: false });
  }

  // Resolve the lead by from-number in this workspace.
  let leadId: string | null = null;
  if (fromE164) {
    try {
      const fromDigits = fromE164.slice(1);
      const { data: lead } = await db
        .from("leads")
        .select("id, phone")
        .eq("workspace_id", workspaceId)
        .or(
          `phone.eq.${fromE164},phone.eq.${fromDigits}`,
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lead) leadId = (lead as { id: string }).id;
    } catch {
      // no-op
    }
  }

  const dedupeKey = `inbound_sms:${workspaceId}:${
    normalized.messageId ?? `${normalized.fromNumber}:${normalized.receivedAt}`
  }`;

  try {
    await db.from("raw_webhook_events").insert({
      provider: `inbound_sms_${normalized.provider}`,
      dedupe_key: dedupeKey,
      payload: {
        workspace_id: workspaceId,
        lead_id: leadId,
        event_type: "sms_reply",
        event_data: toSmsReplyEventData(normalized),
        received_at: normalized.receivedAt,
      },
    });
  } catch {
    // dedupe collision or missing table — still ack
  }

  // CTIA opt-out/opt-in: mutate lead record immediately so no further outbound
  // SMS can go out while the job queue is draining.
  if (leadId && keyword.intent === "opt_out") {
    try {
      await db
        .from("leads")
        .update({
          opt_out: true,
          opted_out: true,
          last_touched_at: normalized.receivedAt,
        })
        .eq("id", leadId)
        .eq("workspace_id", workspaceId);
      const { recordOptOut } = await import("@/lib/lead-opt-out");
      await recordOptOut(workspaceId, `lead:${leadId}`, leadId);
    } catch (err) {
      log("warn", "inbound_sms.opt_out_persist_failed", {
        workspace_id: workspaceId,
        lead_id: leadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (leadId && keyword.intent === "opt_in") {
    try {
      await db
        .from("leads")
        .update({
          opt_out: false,
          opted_out: false,
          last_touched_at: normalized.receivedAt,
        })
        .eq("id", leadId)
        .eq("workspace_id", workspaceId);
      const { removeOptOut } = await import("@/lib/lead-opt-out");
      await removeOptOut(workspaceId, `lead:${leadId}`, leadId);
    } catch (err) {
      log("warn", "inbound_sms.opt_in_persist_failed", {
        workspace_id: workspaceId,
        lead_id: leadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (leadId && keyword.intent !== "opt_out" && keyword.intent !== "help") {
    try {
      await enqueue({
        type: "process_sms_reply",
        workspaceId,
        leadId,
        receivedAt: normalized.receivedAt,
        text: normalized.body,
        fromNumber: normalized.fromNumber,
        toNumber: normalized.toNumber,
        provider: normalized.provider,
        messageId: normalized.messageId,
        mediaUrls: normalized.mediaUrls,
      });
    } catch {
      // additive
    }
  }

  // For Twilio, return a TwiML reply. If a CTIA keyword was hit, include the
  // compliance-mandated text so the carrier sends the reply on our behalf.
  if (isTwilioForm) {
    const replyBody = keyword.requiredReply;
    if (replyBody) {
      const safe = replyBody
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } },
      );
    }
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }

  return NextResponse.json({
    received: true,
    scoped: true,
    lead_matched: Boolean(leadId),
    provider: normalized.provider,
    keyword_intent: keyword.intent,
  });
}
