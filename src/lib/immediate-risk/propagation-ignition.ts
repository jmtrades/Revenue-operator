/**
 * Propagation ignition: when economically_active + network_entries + ≥3 acknowledged counterparties.
 * Emit coordination_reliance_established and send one message per workspace. Only once per workspace.
 */

import { getDb } from "@/lib/db/queries";

const MESSAGE_TEXT = "Coordination now relies on shared records.";

export async function runPropagationIgnition(): Promise<void> {
  const db = getDb();

  const { data: economicActive } = await db
    .from("economic_participation")
    .select("workspace_id")
    .eq("economic_active", true);
  const activeWorkspaceIds = [...new Set((economicActive ?? []).map((r: { workspace_id: string }) => r.workspace_id))];
  if (!activeWorkspaceIds.length) return;

  const { data: alreadySent } = await db.from("coordination_reliance_message_sent").select("workspace_id").in("workspace_id", activeWorkspaceIds);
  const sentSet = new Set((alreadySent ?? []).map((r: { workspace_id: string }) => r.workspace_id));
  const candidates = activeWorkspaceIds.filter((id) => !sentSet.has(id));
  if (!candidates.length) return;

  for (const workspaceId of candidates) {
    const { count: networkCount } = await db
      .from("incoming_entries")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if ((networkCount ?? 0) === 0) continue;

    const { data: ackRows } = await db
      .from("shared_transactions")
      .select("counterparty_identifier")
      .eq("workspace_id", workspaceId)
      .eq("state", "acknowledged");
    const distinctCounterparties = new Set((ackRows ?? []).map((r: { counterparty_identifier: string }) => r.counterparty_identifier));
    if (distinctCounterparties.size < 3) continue;

    await db.from("protocol_events").insert({
      workspace_id: workspaceId,
      external_ref: `coordination_reliance:${workspaceId}:${Date.now()}`,
      event_type: "coordination_reliance_established",
      payload: {},
    });

    await db.from("coordination_reliance_message_sent").insert({
      workspace_id: workspaceId,
      sent_at: new Date().toISOString(),
    });

    const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
    const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
    if (ownerId) {
      const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
      const email = (user as { email?: string } | null)?.email;
      if (email && process.env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>",
            to: email,
            subject: "Coordination",
            text: MESSAGE_TEXT,
          }),
        }).catch(() => {});
      }
    }
  }
}
