/**
 * Generic inbound webhook: Accepts POST from CRMs or other sources
 * Payload schema:
 * {
 *   "lead": {
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "phone": "+1234567890",
 *     "company": "Acme Corp"
 *   },
 *   "message": {
 *     "content": "Hi, I'm interested",
 *     "channel": "sms" | "email" | "whatsapp" | "instagram"
 *   },
 *   "workspace_id": "uuid" (optional, can be inferred from webhook secret)
 * }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { processWebhookJob } from "@/lib/pipeline/process-webhook";

const WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Verify webhook secret if provided
  const authHeader = req.headers.get("authorization");
  if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    lead?: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
    };
    message?: {
      content: string;
      channel?: "sms" | "email" | "whatsapp" | "instagram";
    };
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

  if (!lead || !message || !message.content) {
    return NextResponse.json({ error: "lead and message.content required" }, { status: 400 });
  }

  const phone = lead.phone;
  if (!phone) {
    return NextResponse.json({ error: "lead.phone required" }, { status: 400 });
  }

  const db = getDb();

  // Normalize phone number (basic)
  const normalizedPhone = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;

  // Find or create lead
  let leadId: string;
  const { data: existingLead } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("phone", normalizedPhone)
    .limit(1)
    .single();

  if (existingLead) {
    leadId = (existingLead as { id: string }).id;
  } else {
    const newLeadId = crypto.randomUUID();
    await db.from("leads").insert({
      id: newLeadId,
      workspace_id: workspaceId,
      name: lead.name ?? null,
      email: lead.email ?? null,
      phone: normalizedPhone,
      company: lead.company ?? null,
      state: "NEW",
    });
    leadId = newLeadId;
  }

  // Create raw webhook event
  const webhookId = crypto.randomUUID();
  await db.from("raw_webhook_events").insert({
    id: webhookId,
    workspace_id: workspaceId,
    source: "generic_inbound",
    payload: {
      lead,
      message,
      workspace_id: workspaceId,
    },
    processed: false,
  });

  // Process webhook
  const result = await processWebhookJob(webhookId);

  return NextResponse.json({
    success: true,
    lead_id: leadId,
    decision_lead_id: result?.decisionLeadId,
  });
}
