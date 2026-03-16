/**
 * Execute a single reactivation job: send angle-rotated message.
 */

import { getDb } from "@/lib/db/queries";
import { getReactivationMessage } from "./messages";
import { getAngleForStage } from "./engine";
import { sendOutbound } from "@/lib/delivery/provider";

export async function runReactivationJob(leadId: string): Promise<void> {
  const db = getDb();
  const { data: lead, error } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !lead) return;
  const l = lead as { workspace_id: string; opt_out: boolean; reactivation_stage: number; name?: string; company?: string };

  if (l.opt_out) return;

  const { data: conv } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).maybeSingle();
  if (!conv) return;

  const stage = l.reactivation_stage ?? 0;
  const angle = getAngleForStage(stage);
  const message = getReactivationMessage(angle, { name: l.name ?? undefined, company: l.company ?? undefined });

  await db.from("messages").insert({
    conversation_id: (conv as { id: string }).id,
    role: "assistant",
    content: message,
    metadata: { type: "reactivation", angle, stage },
  });

  const { data: om } = await db
    .from("outbound_messages")
    .insert({
      workspace_id: l.workspace_id,
      lead_id: leadId,
      conversation_id: (conv as { id: string }).id,
      content: message,
      channel: (conv as { channel?: string }).channel ?? "web",
      status: "queued",
      attempt_count: 1,
    })
    .select("id")
    .maybeSingle();

  if (om) {
    await sendOutbound(
      (om as { id: string }).id,
      l.workspace_id,
      leadId,
      (conv as { id: string }).id,
      (conv as { channel?: string }).channel ?? "web",
      message,
      { email: (lead as { email?: string }).email, phone: (lead as { phone?: string }).phone }
    );
  }
}
