/**
 * POST /api/messages/send — Send SMS to a lead (two-way messaging).
 * Creates conversation if needed, inserts outbound_messages, sends via delivery provider, records in messages.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { sendOutbound } from "@/lib/delivery/provider";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  // Rate limit: max 60 messages per minute per workspace
  const rl = await checkRateLimit(`msg-send:${workspaceId}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Message rate limit reached. Please try again shortly." }, { status: 429 });
  }

  let body: { lead_id: string; content: string; channel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { lead_id, content, channel: channelParam } = body;

  // Validate lead_id
  if (!lead_id || typeof lead_id !== "string") {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  // Validate content
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (!content.trim()) {
    return NextResponse.json({ error: "content cannot be empty" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "content must not exceed 5000 characters" }, { status: 400 });
  }

  // Validate channel - strict validation, no silent defaults
  const supportedChannels = ["sms", "whatsapp", "email"] as const;
  if (!supportedChannels.includes(channelParam as any)) {
    return NextResponse.json(
      { error: `Invalid channel. Supported channels: ${supportedChannels.join(", ")}` },
      { status: 400 }
    );
  }
  const channel = channelParam as "sms" | "email" | "whatsapp";

  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("id, phone, workspace_id")
    .eq("id", lead_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const phone = (lead as { phone?: string | null }).phone;
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 });
  }

  // SAFETY: Check opt-out before sending any outbound message
  try {
    const { isOptedOut } = await import("@/lib/lead-opt-out");
    if (await isOptedOut(workspaceId, `lead:${lead_id}`)) {
      return NextResponse.json({ error: "Lead has opted out of communications" }, { status: 403 });
    }
  } catch {
    // opt-out table may not exist
  }

  // Validate phone number has at least 10 digits
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return NextResponse.json({ error: "Phone number must contain at least 10 digits" }, { status: 400 });
  }

  let conversationId: string;
  const { data: existingConv } = await db
    .from("conversations")
    .select("id")
    .eq("lead_id", lead_id)
    .eq("channel", channel)
    .limit(1)
    .maybeSingle();
  if (existingConv) {
    conversationId = (existingConv as { id: string }).id;
  } else {
    const { data: newConv, error: convErr } = await db
      .from("conversations")
      .insert({
        lead_id,
        channel,
        external_thread_id: null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (convErr || !newConv) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }
    conversationId = (newConv as { id: string }).id;
  }

  const { data: om, error: omErr } = await db
    .from("outbound_messages")
    .insert({
      workspace_id: workspaceId,
      lead_id,
      conversation_id: conversationId,
      content: content.trim(),
      channel,
      status: "queued",
    })
    .select("id")
    .maybeSingle();
  if (omErr || !om) {
    return NextResponse.json({ error: "Failed to queue message" }, { status: 500 });
  }
  const omId = (om as { id: string }).id;

  const result = await sendOutbound(
    omId,
    workspaceId,
    lead_id,
    conversationId,
    channel,
    content.trim(),
    { phone }
  );

  if (result.status === "failed") {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 500 });
  }

  await db.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: content.trim(),
  });

  return NextResponse.json({ ok: true, external_id: result.externalId });
}
