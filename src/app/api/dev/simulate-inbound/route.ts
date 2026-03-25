/**
 * Simulate inbound message for testing activation flow
 * Creates a lead, inserts message, runs webhook processing, triggers decision engine
 * In dev: stores outbound but doesn't actually send SMS
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { isDoctrineEnforced } from "@/lib/doctrine/enforce";
import { ingestInboundAsSignal } from "@/lib/signals/ingest-inbound";
import { processWebhookJob } from "@/lib/pipeline/process-webhook";
import { enqueue } from "@/lib/queue";
import { burstDrain } from "@/lib/queue/burst-drain";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Security: Block in production unless DEV_SIM_SECRET is provided
  const isProduction = process.env.NODE_ENV === "production";
  const devSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.DEV_SIM_SECRET;

  if (isProduction && (!expectedSecret || devSecret !== expectedSecret)) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const workspaceId = session.workspaceId;
  const db = getDb();

  try {
    // Get workspace phone number
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("proxy_number")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .maybeSingle();

    if (!phoneConfig?.proxy_number) {
      return NextResponse.json({ error: "Phone number not provisioned" }, { status: 400 });
    }

    const phoneNumber = (phoneConfig as { proxy_number: string }).proxy_number;

    // Create test lead
    const testPhone = `+1555${Math.floor(Math.random() * 10000000)}`;
    const testMessage = "Hi, I'm interested in learning more";
    const externalMessageId = `test_${Date.now()}`;

    let leadId: string;

    if (isDoctrineEnforced()) {
      const { signalId, inserted } = await ingestInboundAsSignal({
        workspace_id: workspaceId,
        channel: "sms",
        external_lead_id: testPhone,
        thread_id: testPhone,
        phone: testPhone,
        message: testMessage,
        external_message_id: externalMessageId,
      });
      if (!inserted || !signalId) {
        return NextResponse.json({ error: "Failed to ingest signal (duplicate?)" }, { status: 500 });
      }
      await enqueue({ type: "process_signal", signalId });
      await burstDrain();
      const { data: leadRow } = await db.from("leads").select("id").eq("workspace_id", workspaceId).eq("external_id", testPhone).maybeSingle();
      leadId = (leadRow as { id: string })?.id;
      if (!leadId) return NextResponse.json({ error: "Lead not found after ingest" }, { status: 500 });
    } else {
      const { data: webhookEvent } = await db
        .from("raw_webhook_events")
        .insert({
          workspace_id: workspaceId,
          payload: {
            workspace_id: workspaceId,
            channel: "sms",
            external_lead_id: testPhone,
            thread_id: testPhone,
            phone: testPhone,
            message: testMessage,
            external_message_id: externalMessageId,
          },
          source: "twilio_inbound",
          processed: false,
          dedupe_key: `test_${Date.now()}_${testPhone}`,
        })
        .select("id")
        .maybeSingle();

      if (!webhookEvent) {
        return NextResponse.json({ error: "Failed to create webhook event" }, { status: 500 });
      }

      const webhookId = (webhookEvent as { id: string }).id;
      const processResult = await processWebhookJob(webhookId);
      if (!processResult?.decisionLeadId) {
        return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
      }
      leadId = processResult.decisionLeadId;
      await burstDrain();
    }

    // Wait a moment for processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get the outbound message that was created
    const { data: conversation } = await db
      .from("conversations")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle();

    const conversationId = conversation ? (conversation as { id: string }).id : null;

    const { data: outboundMessage } = conversationId
      ? await db
          .from("messages")
          .select("id, content, created_at")
          .eq("conversation_id", conversationId)
          .eq("role", "assistant")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      conversation_id: conversationId,
      inbound_message: testMessage,
      outbound_message: outboundMessage ? (outboundMessage as { content: string }).content : null,
      phone_number: phoneNumber,
    });
  } catch (error) {
    console.error("[dev/simulate-inbound] Simulation error:", error);
    // Simulate failed; error response below
    return NextResponse.json(
      { error: "Simulation failed" },
      { status: 500 }
    );
  }
}
