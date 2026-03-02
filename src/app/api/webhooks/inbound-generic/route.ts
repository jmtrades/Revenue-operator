/**
 * Generic inbound webhook — Doctrine: only normalize to canonical signal, then enqueue process_signal.
 * No state mutation, no enqueueDecision.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { enqueue } from "@/lib/queue";
import { ingestInboundAsSignal } from "@/lib/signals/ingest-inbound";

const WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    lead?: { name?: string; email?: string; phone?: string; company?: string };
    message?: { content: string; channel?: "sms" | "email" | "whatsapp" | "instagram" };
    workspace_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const lead = body.lead;
  const message = body.message;
  if (!lead || !message?.content) {
    return NextResponse.json({ error: "lead and message.content required" }, { status: 400 });
  }

  const phone = lead.phone;
  if (!phone) {
    return NextResponse.json({ error: "lead.phone required" }, { status: 400 });
  }

  const normalizedPhone = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;
  const externalLeadId = normalizedPhone;
  const channel = message.channel ?? "sms";

  try {
    const { signalId, inserted } = await ingestInboundAsSignal({
      workspace_id: workspaceId,
      channel,
      external_lead_id: externalLeadId,
      thread_id: externalLeadId,
      email: lead.email ?? null,
      phone: normalizedPhone,
      name: lead.name ?? null,
      company: lead.company ?? null,
      message: message.content,
      external_message_id: `generic_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    });
    if (inserted && signalId) {
      await enqueue({ type: "process_signal", signalId });
    }
  } catch (err) {
    console.error("[inbound-generic]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
