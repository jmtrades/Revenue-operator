/**
 * Ops: Send customer check-in email (template)
 * Requires staff write access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { sendOutbound } from "@/lib/delivery/provider";
import { requireStaffWriteAccess, logStaffAction } from "@/lib/ops/auth";

const CHECK_IN_TEMPLATE = `Hi there,

We wanted to check in and see how things are going. Is there anything we can help with?

Best,
Your team`;

export async function POST(req: NextRequest) {
  const session = await requireStaffWriteAccess().catch((r) => r as Response);
  if (session instanceof Response) return session;

  let body: { workspace_id: string; to_email: string; subject?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { workspace_id: workspaceId, to_email: toEmail, subject = "Quick check-in" } = body;
  if (!workspaceId || !toEmail) return NextResponse.json({ error: "workspace_id and to_email required" }, { status: 400 });

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspaceId).single();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const { data: lead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).ilike("email", toEmail).limit(1).maybeSingle();
  const leadId = (lead as { id?: string })?.id;
  if (!leadId) return NextResponse.json({ error: "Lead not found for email in workspace" }, { status: 404 });

  const { data: conv } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).maybeSingle();
  const convId = (conv as { id?: string })?.id;
  if (!convId) return NextResponse.json({ error: "No conversation for lead" }, { status: 404 });
  const channel = (conv as { channel?: string })?.channel ?? "web";

  const { data: om } = await db
    .from("outbound_messages")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      conversation_id: convId,
      content: CHECK_IN_TEMPLATE,
      channel,
      status: "queued",
      attempt_count: 1,
    })
    .select("id")
    .single();

  if (om) {
    await sendOutbound(
      (om as { id: string }).id,
      workspaceId,
      leadId,
      convId,
      channel,
      CHECK_IN_TEMPLATE,
      { email: toEmail }
    );
  }

  await logStaffAction(session.id, "send_check_in_email", { workspace_id: workspaceId, to_email: toEmail }, workspaceId);

  return NextResponse.json({ ok: true });
}
