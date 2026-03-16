/**
 * POST /api/install/demo-seed
 * Creates minimal seed data: 1 stalled conversation, 1 unresolved commitment, 1 unconfirmed transaction.
 * Triggers engines once (core cron). Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { createCommitment } from "@/lib/commitment-recovery";

const DEMO_LEAD_EXTERNAL_ID = "demo-seed-lead";
const DEMO_THREAD_ID = "demo-seed-thread";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date().toISOString();

  const { data: lead, error: leadErr } = await db
    .from("leads")
    .upsert(
      {
        workspace_id: workspaceId,
        external_id: DEMO_LEAD_EXTERNAL_ID,
        channel: "webhook",
        email: "demo@example.com",
        name: "Demo Lead",
        last_activity_at: now,
        updated_at: now,
      },
      { onConflict: "workspace_id,external_id" }
    )
    .select("id")
    .maybeSingle();
  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead create failed" }, { status: 500 });
  }
  const leadId = (lead as { id: string }).id;

  const { data: conv, error: convErr } = await db
    .from("conversations")
    .upsert(
      { lead_id: leadId, channel: "webhook", external_thread_id: DEMO_THREAD_ID, updated_at: now },
      { onConflict: "lead_id,channel,external_thread_id" }
    )
    .select("id")
    .maybeSingle();
  if (convErr || !conv) {
    return NextResponse.json({ error: "Conversation create failed" }, { status: 500 });
  }
  const conversationId = (conv as { id: string }).id;

  await db.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: "Demo message for proof.",
  });

  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await createCommitment(workspaceId, "conversation", conversationId, pastDate);

  const { data: existingTx } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("state", "pending_acknowledgement")
    .limit(1)
    .maybeSingle();
  if (!existingTx) {
    const extRef = `demo-${workspaceId.slice(0, 8)}-${Date.now()}`;
    await db.from("shared_transactions").insert({
      workspace_id: workspaceId,
      counterparty_identifier: "demo@example.com",
      subject_type: "agreement",
      subject_id: leadId,
      initiated_by: "business",
      state: "pending_acknowledgement",
      acknowledgement_required: true,
      external_ref: extRef,
    });
  }

  const base = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!base) {
    console.error("[demo-seed] Cannot determine base URL");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }
  const token = process.env.CRON_SECRET ?? "";
  try {
    await fetch(`${base.replace(/\/$/, "")}/api/cron/core`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true });
}
