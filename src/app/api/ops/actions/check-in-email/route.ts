/**
 * Ops: Enqueue check-in email via action intent. Executor sends; route never calls delivery.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createActionIntent } from "@/lib/action-intents";
import { requireStaffWriteAccess, logStaffAction } from "@/lib/ops/auth";
import { assertSameOrigin } from "@/lib/http/csrf";

const CHECK_IN_TEMPLATE = `Hi there,

We wanted to check in and see how things are going. Is there anything we can help with?

Best,
Your team`;

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await requireStaffWriteAccess().catch((r) => r as Response);
  if (session instanceof Response) return session;

  let body: { workspace_id: string; to_email: string; subject?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const { workspace_id: workspaceId, to_email: toEmail } = body;
  if (!workspaceId || !toEmail) {
    return NextResponse.json({ ok: false, reason: "workspace_id_and_to_email_required" }, { status: 400 });
  }

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
  if (!ws) return NextResponse.json({ ok: false, reason: "workspace_not_found" }, { status: 404 });

  const { data: lead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).ilike("email", toEmail).limit(1).maybeSingle();
  const leadId = (lead as { id?: string })?.id;
  if (!leadId) return NextResponse.json({ ok: false, reason: "lead_not_found" }, { status: 404 });

  const { data: conv } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).maybeSingle();
  const convId = (conv as { id?: string })?.id;
  if (!convId) return NextResponse.json({ ok: false, reason: "no_conversation" }, { status: 404 });
  const channel = (conv as { channel?: string })?.channel ?? "email";

  await createActionIntent(workspaceId, {
    intentType: "send_message",
    payload: {
      channel,
      text: CHECK_IN_TEMPLATE,
      email: toEmail,
      workspace_id: workspaceId,
      conversation_id: convId,
      lead_id: leadId,
    },
    dedupeKey: `check-in-email:${workspaceId}:${leadId}`,
  });

  await logStaffAction(session.id, "send_check_in_email", { workspace_id: workspaceId, to_email: toEmail }, workspaceId);

  return NextResponse.json({ ok: true }, { status: 200 });
}
