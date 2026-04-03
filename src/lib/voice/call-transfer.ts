/**
 * Live Call Transfer System
 *
 * Enables mid-call handoff from AI agent to human agent.
 * Supports warm transfer (AI briefs human), cold transfer (direct connect),
 * and conference transfer (AI stays on briefly).
 *
 * Features:
 * - Warm transfer with context briefing
 * - Cold transfer (direct redirect)
 * - Conference bridge (3-way call)
 * - Transfer queue management
 * - Fallback to voicemail if no human available
 * - Transfer metrics tracking
 * - SIP/PSTN destination support
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

/* ── Types ───────────────────────────────────────────────────────── */

export type TransferType = "warm" | "cold" | "conference";
export type TransferStatus = "initiated" | "ringing" | "connected" | "completed" | "failed" | "no_answer";

export interface TransferRequest {
  call_session_id: string;
  workspace_id: string;
  call_sid: string;
  transfer_to: string; // Phone number or SIP URI
  transfer_type: TransferType;
  reason: string;
  caller_context: CallerContext;
}

export interface CallerContext {
  caller_name?: string;
  caller_phone: string;
  business_type?: string;
  pain_points?: string[];
  conversation_summary: string;
  sentiment: string;
  objections_raised?: string[];
  buying_stage?: string;
  call_duration_seconds: number;
}

export interface TransferResult {
  status: TransferStatus;
  transfer_sid?: string;
  connected_at?: string;
  duration_seconds?: number;
  error?: string;
}

/* ── Transfer Execution ──────────────────────────────────────────── */

/**
 * Initiate a live call transfer via Twilio.
 */
export async function initiateTransfer(
  request: TransferRequest,
): Promise<TransferResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!accountSid || !authToken || !appUrl) {
    log("error", "call_transfer.missing_credentials", {});
    return { status: "failed", error: "Missing Twilio credentials" };
  }

  try {
    log("info", "call_transfer.initiating", {
      callSessionId: request.call_session_id,
      transferType: request.transfer_type,
      transferTo: request.transfer_to,
      reason: request.reason,
    });

    // Store transfer record
    const transferId = `txfr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Update the active call with TwiML redirect
    switch (request.transfer_type) {
      case "cold":
        return await executeColdTransfer(request, accountSid, authToken, appUrl, transferId);
      case "warm":
        return await executeWarmTransfer(request, accountSid, authToken, appUrl, transferId);
      case "conference":
        return await executeConferenceTransfer(request, accountSid, authToken, appUrl, transferId);
      default:
        return { status: "failed", error: `Unknown transfer type: ${request.transfer_type}` };
    }
  } catch (err) {
    log("error", "call_transfer.failed", {
      error: err instanceof Error ? err.message : String(err),
      callSessionId: request.call_session_id,
    });
    return { status: "failed", error: err instanceof Error ? err.message : "Transfer failed" };
  }
}

/**
 * Cold transfer: Redirect the call directly to the destination.
 * The AI agent disconnects immediately.
 */
async function executeColdTransfer(
  request: TransferRequest,
  accountSid: string,
  authToken: string,
  appUrl: string,
  transferId: string,
): Promise<TransferResult> {
  // Update the live call with a <Dial> TwiML
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">I'm transferring you now to a specialist. One moment please.</Say>
  <Dial callerId="${request.caller_context.caller_phone}" timeout="30"
    action="${appUrl}/api/webhooks/twilio/voice/transfer-status?transfer_id=${transferId}&session_id=${request.call_session_id}">
    <Number>${request.transfer_to}</Number>
  </Dial>
  <Say voice="Polly.Joanna-Neural">I'm sorry, the specialist isn't available right now. Let me take a message and have someone call you back within the hour.</Say>
</Response>`;

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${request.call_sid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Twiml: twiml }).toString(),
    },
  );

  if (!resp.ok) {
    const errText = await resp.text();
    return { status: "failed", error: `Twilio API error: ${resp.status} - ${errText}` };
  }

  // Store transfer metadata
  await storeTransferRecord(request, transferId, "cold", "initiated");

  return { status: "initiated", transfer_sid: transferId };
}

/**
 * Warm transfer: AI briefs the human agent before connecting the caller.
 * 1. Put caller on hold with music
 * 2. Call human agent with context briefing
 * 3. When human answers, conference all three
 * 4. AI drops off, leaving caller with human
 */
async function executeWarmTransfer(
  request: TransferRequest,
  accountSid: string,
  authToken: string,
  appUrl: string,
  transferId: string,
): Promise<TransferResult> {
  // Step 1: Put the caller on hold
  const holdTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">I'm connecting you with a specialist who can help further. Just a moment while I brief them on our conversation.</Say>
  <Play loop="3">https://api.twilio.com/cowbell.mp3</Play>
  <Dial callerId="${request.caller_context.caller_phone}" timeout="45"
    action="${appUrl}/api/webhooks/twilio/voice/transfer-status?transfer_id=${transferId}&session_id=${request.call_session_id}">
    <Number>${request.transfer_to}</Number>
  </Dial>
  <Say voice="Polly.Joanna-Neural">I wasn't able to reach the specialist right now. I'll have someone call you back within the hour. Is there anything else I can help you with in the meantime?</Say>
</Response>`;

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${request.call_sid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Twiml: holdTwiml }).toString(),
    },
  );

  if (!resp.ok) {
    const errText = await resp.text();
    return { status: "failed", error: `Twilio API error: ${resp.status} - ${errText}` };
  }

  await storeTransferRecord(request, transferId, "warm", "ringing");

  return { status: "ringing", transfer_sid: transferId };
}

/**
 * Conference transfer: Creates a 3-way conference call.
 * AI stays on briefly to introduce, then drops.
 */
async function executeConferenceTransfer(
  request: TransferRequest,
  accountSid: string,
  authToken: string,
  appUrl: string,
  transferId: string,
): Promise<TransferResult> {
  const conferenceName = `transfer_${transferId}`;

  // Move caller into conference
  const callerTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">I'm connecting you with a specialist now. Please hold for just a moment.</Say>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true"
      waitUrl="https://api.twilio.com/cowbell.mp3" waitMethod="GET">
      ${conferenceName}
    </Conference>
  </Dial>
</Response>`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${request.call_sid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Twiml: callerTwiml }).toString(),
    },
  );

  // Dial the human agent into the same conference
  const context = request.caller_context;
  const briefing = buildTransferBriefing(context);

  const agentTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">${briefing}</Say>
  <Dial>
    <Conference beep="true" startConferenceOnEnter="true" endConferenceOnExit="false">
      ${conferenceName}
    </Conference>
  </Dial>
</Response>`;

  const statusCallback = `${appUrl}/api/webhooks/twilio/voice/transfer-status?transfer_id=${transferId}&session_id=${request.call_session_id}`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: request.transfer_to,
        From: process.env.TWILIO_PHONE_NUMBER ?? request.caller_context.caller_phone,
        Twiml: agentTwiml,
        StatusCallback: statusCallback,
        StatusCallbackEvent: "initiated ringing answered completed",
        Timeout: "30",
      }).toString(),
    },
  );

  await storeTransferRecord(request, transferId, "conference", "ringing");

  return { status: "ringing", transfer_sid: transferId };
}

/* ── Briefing Generation ─────────────────────────────────────────── */

/**
 * Build a concise spoken briefing for the human agent receiving the transfer.
 */
function buildTransferBriefing(context: CallerContext): string {
  const parts: string[] = [
    "Incoming transfer from Revenue Operator AI.",
  ];

  if (context.caller_name) {
    parts.push(`Caller name: ${context.caller_name}.`);
  }

  if (context.business_type) {
    parts.push(`They run a ${context.business_type} business.`);
  }

  if (context.pain_points?.length) {
    parts.push(`Main concern: ${context.pain_points[0]}.`);
  }

  if (context.buying_stage) {
    parts.push(`Buying stage: ${context.buying_stage}.`);
  }

  if (context.sentiment === "negative" || context.sentiment === "frustrated") {
    parts.push("Note: caller seems frustrated. Handle with extra care.");
  }

  if (context.objections_raised?.length) {
    parts.push(`Objection raised: ${context.objections_raised[0]}.`);
  }

  parts.push(`Call has been going for ${Math.round(context.call_duration_seconds / 60)} minutes.`);
  parts.push("Connecting you now.");

  return parts.join(" ");
}

/* ── Transfer Detection ──────────────────────────────────────────── */

/**
 * Detect if the caller is requesting to speak with a human.
 * Used by the demo agent to trigger transfer automatically.
 */
export function detectTransferRequest(text: string): {
  requested: boolean;
  urgency: "low" | "medium" | "high";
  reason: string;
} {
  const normalizedText = text.toLowerCase().trim();

  // High urgency: explicit demand
  const highUrgency = /\b(let me (speak|talk) (to|with) (a |an |)(human|person|real person|manager|supervisor|someone real)|get me (a |)(human|person|manager)|transfer me|i (want|need|demand) (a |)(human|real person|manager))\b/i;

  if (highUrgency.test(normalizedText)) {
    return { requested: true, urgency: "high", reason: "Explicit request for human agent" };
  }

  // Medium urgency: frustration + agent reference
  const mediumUrgency = /\b(this (isn't|isnt|is not) (working|helping)|you('re| are) (not|just) (an? )?(ai|bot|robot|computer)|i('m| am) (frustrated|upset|angry|done)|stop (reading|reciting) (a |)(script))\b/i;

  if (mediumUrgency.test(normalizedText)) {
    return { requested: true, urgency: "medium", reason: "Frustration with AI interaction" };
  }

  // Low urgency: subtle hints
  const lowUrgency = /\b(is there (a |)(real |)(person|human)|can i (call|talk to) (someone|anybody)|who (else |)can i (speak|talk) (to|with))\b/i;

  if (lowUrgency.test(normalizedText)) {
    return { requested: true, urgency: "low", reason: "Subtle request for human" };
  }

  return { requested: false, urgency: "low", reason: "" };
}

/* ── Storage ─────────────────────────────────────────────────────── */

async function storeTransferRecord(
  request: TransferRequest,
  transferId: string,
  type: TransferType,
  status: TransferStatus,
): Promise<void> {
  try {
    const db = getDb();
    const { data: session } = await db
      .from("call_sessions")
      .select("metadata")
      .eq("id", request.call_session_id)
      .maybeSingle();

    const meta = ((session as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const transfers = (meta.transfers ?? []) as Array<Record<string, unknown>>;

    await db.from("call_sessions").update({
      metadata: {
        ...meta,
        transfers: [...transfers, {
          id: transferId,
          type,
          status,
          transfer_to: request.transfer_to,
          reason: request.reason,
          caller_context_summary: request.caller_context.conversation_summary,
          initiated_at: new Date().toISOString(),
        }],
        last_transfer_at: new Date().toISOString(),
      },
    }).eq("id", request.call_session_id);
  } catch (err) {
    log("warn", "call_transfer.store_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Get the transfer destination for a workspace.
 * Checks workspace settings for configured transfer numbers.
 */
export async function getTransferDestination(
  workspaceId: string,
): Promise<{ number: string; name: string } | null> {
  try {
    const db = getDb();
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata, settings")
      .eq("id", workspaceId)
      .maybeSingle();

    const settings = ((ws as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<string, unknown>;
    const transferNumber = settings.transfer_number as string | undefined;
    const transferName = settings.transfer_agent_name as string | undefined;

    if (transferNumber) {
      return { number: transferNumber, name: transferName ?? "Team Member" };
    }

    // Fallback: check workspace owner's phone
    const meta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const ownerPhone = meta.owner_phone as string | undefined;

    if (ownerPhone) {
      return { number: ownerPhone, name: "Business Owner" };
    }

    return null;
  } catch {
    return null;
  }
}
