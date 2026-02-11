/**
 * Post-call unknown check-in: send a single non-assumptive message when show status is unknown.
 */

import { getDb } from "@/lib/db/queries";
import { sendOutbound } from "@/lib/delivery/provider";

const CHECKIN_MESSAGE =
  "Quick check — were we able to connect earlier? If not, I can reschedule you.";

export async function runPostCallUnknownCheckin(
  leadId: string,
  workspaceId: string,
  callSessionId: string
): Promise<void> {
  const db = getDb();
  const { data: settings } = await db.from("settings").select("hired_roles").eq("workspace_id", workspaceId).single();
  const hired = (settings as { hired_roles?: string[] })?.hired_roles ?? ["full_autopilot"];
  if (!hired.includes("show_manager") && !hired.includes("full_autopilot")) return;

  const { data: lead } = await db.from("leads").select("id, email, phone").eq("id", leadId).eq("workspace_id", workspaceId).single();
  if (!lead) return;

  const { data: convRow } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).single();
  if (!convRow) return;

  const convId = (convRow as { id: string }).id;
  const channel = (convRow as { channel?: string }).channel ?? "web";

  const { data: om } = await db
    .from("outbound_messages")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      conversation_id: convId,
      content: CHECKIN_MESSAGE,
      channel,
      status: "queued",
      attempt_count: 1,
    })
    .select("id")
    .single();

  if (om) {
    const to = { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone };
    await sendOutbound((om as { id: string }).id, workspaceId, leadId, convId, channel, CHECKIN_MESSAGE, to);
  }

  await db.from("action_logs").insert({
    workspace_id: workspaceId,
    entity_type: "lead",
    entity_id: leadId,
    action: "post_call_unknown_checkin",
    actor: "Show Manager",
    role: "show_manager",
    payload: { call_session_id: callSessionId, message: CHECKIN_MESSAGE },
  });
}
