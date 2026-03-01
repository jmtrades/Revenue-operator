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

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  let body: { lead_id: string; content: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { lead_id, content } = body;
  if (!lead_id || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "lead_id and content required" }, { status: 400 });
  }

  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("id, phone, workspace_id")
    .eq("id", lead_id)
    .eq("workspace_id", workspaceId)
    .single();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const phone = (lead as { phone?: string | null }).phone;
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 });
  }

  let conversationId: string;
  const { data: existingConv } = await db
    .from("conversations")
    .select("id")
    .eq("lead_id", lead_id)
    .eq("channel", "sms")
    .limit(1)
    .maybeSingle();
  if (existingConv) {
    conversationId = (existingConv as { id: string }).id;
  } else {
    const { data: newConv, error: convErr } = await db
      .from("conversations")
      .insert({
        lead_id,
        channel: "sms",
        external_thread_id: null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
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
      channel: "sms",
      status: "queued",
      metadata: { trigger: "manual" },
    })
    .select("id")
    .single();
  if (omErr || !om) {
    return NextResponse.json({ error: "Failed to queue message" }, { status: 500 });
  }
  const omId = (om as { id: string }).id;

  const result = await sendOutbound(
    omId,
    workspaceId,
    lead_id,
    conversationId,
    "sms",
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
