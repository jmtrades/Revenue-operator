/**
 * Creates a demo workspace with lead, conversation, shared transaction, commitment, economic event.
 * Used to verify install end-to-end locally. Idempotent: re-run with same DEMO_WORKSPACE_ID skips or upserts.
 *
 * Usage: npx tsx scripts/create-demo-workspace.ts
 * Optional: DEMO_WORKSPACE_ID=uuid (default: new UUID)
 */

import { createServerClient } from "@/lib/db/client";
import { randomUUID } from "crypto";

const DEMO_OWNER_ID = process.env.DEMO_OWNER_ID ?? "00000000-0000-0000-0000-000000000001";
const WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID ?? randomUUID();

async function main() {
  const client = createServerClient();
  const db = client.schema("revenue_operator");

  const { data: existingWorkspace } = await db
    .from("workspaces")
    .select("id")
    .eq("id", WORKSPACE_ID)
    .maybeSingle();

  if (!existingWorkspace) {
    await db.from("workspaces").insert({
      id: WORKSPACE_ID,
      name: "Demo Workspace",
      owner_id: DEMO_OWNER_ID,
      status: "active",
    });
    console.log("Created workspace", WORKSPACE_ID);
  }

  const { data: leadRows } = await db.from("leads").select("id").eq("workspace_id", WORKSPACE_ID).limit(1);
  let leadId: string;
  if (leadRows?.length) {
    leadId = (leadRows[0] as { id: string }).id;
  } else {
    const { data: lead } = await db
      .from("leads")
      .insert({
        workspace_id: WORKSPACE_ID,
        external_id: "demo-lead-1",
        channel: "email",
        email: "demo@example.com",
        name: "Demo Lead",
      })
      .select("id")
      .single();
    leadId = (lead as { id: string }).id;
    console.log("Created lead", leadId);
  }

  const { data: convRows } = await db.from("conversations").select("id").eq("lead_id", leadId).limit(1);
  let conversationId: string;
  if (convRows?.length) {
    conversationId = (convRows[0] as { id: string }).id;
  } else {
    const { data: conv } = await db
      .from("conversations")
      .insert({
        lead_id: leadId,
        channel: "email",
        external_thread_id: "demo-thread-1",
      })
      .select("id")
      .single();
    conversationId = (conv as { id: string }).id;
    console.log("Created conversation", conversationId);
  }

  const subjectId = randomUUID();
  const { data: txRows } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", WORKSPACE_ID)
    .eq("subject_id", subjectId)
    .limit(1);
  if (!txRows?.length) {
    await db.from("shared_transactions").insert({
      workspace_id: WORKSPACE_ID,
      counterparty_identifier: "demo@example.com",
      subject_type: "agreement",
      subject_id: subjectId,
      initiated_by: "business",
      state: "pending_acknowledgement",
      acknowledgement_required: true,
      acknowledgement_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lead_id: leadId,
      conversation_id: conversationId,
    });
    console.log("Created shared_transaction for subject", subjectId);
  }

  const { data: commitRows } = await db
    .from("commitments")
    .select("id")
    .eq("workspace_id", WORKSPACE_ID)
    .eq("subject_type", "conversation")
    .eq("subject_id", conversationId)
    .limit(1);
  if (!commitRows?.length) {
    await db.from("commitments").insert({
      workspace_id: WORKSPACE_ID,
      subject_type: "conversation",
      subject_id: conversationId,
      expected_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      state: "pending",
    });
    console.log("Created commitment for conversation", conversationId);
  }

  await db.from("economic_events").insert({
    workspace_id: WORKSPACE_ID,
    event_type: "opportunity_recovered",
    subject_type: "conversation",
    subject_id: conversationId,
    value_amount: 0,
    value_currency: "usd",
  });
  console.log("Created economic_event");

  console.log("Demo workspace ready:", WORKSPACE_ID);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
