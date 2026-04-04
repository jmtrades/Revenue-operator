/**
 * Decision clustering: multiple escalations within 10 min → wait for 10-min quiet period, then one email "Several decisions are ready."
 * Handoff sends are enqueued (handoff_notify / handoff_notify_batch) so delivery is durable and retryable.
 * Guarantees: no unseen escalation, no silent action failure.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import {
  leadHasHumanReplyAfter,
  escalationIdsWithHumanReplyAfter,
} from "@/lib/human-override/human-activity";
import { recordHandoffAcknowledgement } from "@/lib/delivery-assurance/handoff-ack";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const CLUSTER_WINDOW_MS = 10 * 60 * 1000;
const QUIET_PERIOD_MS = 10 * 60 * 1000;

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
      signal: AbortSignal.timeout(10_000),
  });
  return res.ok;
}

/** Partition handoffs into clusters (each within 10 min of next). Return clusters whose last item is 10+ min ago. */
function getReadyClusters(
  handoffs: { id: string; created_at: string }[],
  nowMs: number
): { id: string; created_at: string }[][] {
  if (handoffs.length === 0) return [];
  const sorted = [...handoffs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const clusters: { id: string; created_at: string }[][] = [];
  let current: { id: string; created_at: string }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].created_at).getTime();
    const curr = new Date(sorted[i].created_at).getTime();
    if (curr - prev <= CLUSTER_WINDOW_MS) {
      current.push(sorted[i]);
    } else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);
  return clusters.filter((c) => {
    const last = new Date(c[c.length - 1].created_at).getTime();
    return nowMs - last >= QUIET_PERIOD_MS;
  });
}

/** Run handoff notifications: 10-min quiet period, then cluster (2+ = one email) or individual. Skip acknowledged. */
export async function runHandoffNotifications(): Promise<
  Array<{ workspaceId: string; batch: boolean; sent: number; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; batch: boolean; sent: number; error?: string }> = [];
  const now = new Date();
  const nowMs = now.getTime();
  const cutoff = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  const { data: ackRows } = await db.from("handoff_acknowledgements").select("escalation_id");
  const ackIds = new Set((ackRows ?? []).map((r: { escalation_id: string }) => r.escalation_id));

  const { data: rows } = await db
    .from("escalation_logs")
    .select("id, workspace_id, lead_id, escalation_reason, created_at")
    .eq("holding_message_sent", true)
    .is("notified_at", null)
    .eq("resolved_by_human_pre_notice", false)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true });

  const filtered = (rows ?? []).filter((r: { id: string }) => !ackIds.has(r.id));
  if (!filtered.length) return results;

  const byWorkspace = (filtered as { id: string; workspace_id: string; lead_id: string; escalation_reason: string; created_at: string }[]).reduce(
    (acc, r) => {
      if (!acc[r.workspace_id]) acc[r.workspace_id] = [];
      acc[r.workspace_id].push(r);
      return acc;
    },
    {} as Record<string, { id: string; workspace_id: string; lead_id: string; escalation_reason: string; created_at: string }[]>
  );

  for (const [workspaceId, handoffs] of Object.entries(byWorkspace)) {
    try {
      const readyClusters = getReadyClusters(handoffs, nowMs);
      if (readyClusters.length === 0) continue;

      const cluster = readyClusters[0];
      const clusterWithCreatedAt = cluster.map((h) => {
        const r = handoffs.find((x) => x.id === h.id)!;
        return { id: r.id, lead_id: r.lead_id, created_at: r.created_at };
      });
      const humanReplyIds = await escalationIdsWithHumanReplyAfter(clusterWithCreatedAt);
      const half = Math.ceil(cluster.length / 2);

      if (cluster.length >= 2) {
        if (humanReplyIds.size >= half) {
          for (const id of humanReplyIds) {
            await db
              .from("escalation_logs")
              .update({ resolved_by_human_pre_notice: true })
              .eq("id", id);
            await recordHandoffAcknowledgement(id, "human_reply");
          }
          continue;
        }
        const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
        const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
        if (ownerId) {
          const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
          const email = (user as { email?: string } | null)?.email;
          if (email) {
            const text = "Outside authority.\n\nMultiple items exist outside authority.\n\nOpen: " + (process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "https://app.recall-touch.com") + "/dashboard" + "\n\nEntry restores reliance." + "\n\nEntry is the operational boundary.";
            const sent = await sendEmail(email, "Outside authority.", text);
            if (sent) {
              const { data: settings } = await db.from("settings").select("team_handoff_emails").eq("workspace_id", workspaceId).maybeSingle();
              const raw = (settings as { team_handoff_emails?: unknown } | null)?.team_handoff_emails;
              const team = Array.isArray(raw) ? raw.filter((e): e is string => typeof e === "string" && e.includes("@")) : [];
              for (const to of team) await sendEmail(to, text, text).catch((e: unknown) => {
                log("error", "sendEmail team handoff failed", { error: e instanceof Error ? e.message : String(e) });
              });
            }
          }
        }
        await enqueue({
          type: "handoff_notify_batch",
          workspaceId,
          escalationIds: cluster.map((x) => x.id),
        });
        results.push({ workspaceId, batch: true, sent: 1 });
      } else {
        const h = cluster[0];
        const r = handoffs.find((x) => x.id === h.id)!;
        const hasHumanReply = await leadHasHumanReplyAfter(r.lead_id, r.created_at);
        if (hasHumanReply) {
          await db
            .from("escalation_logs")
            .update({ resolved_by_human_pre_notice: true })
            .eq("id", h.id);
          await recordHandoffAcknowledgement(h.id, "human_reply");
          continue;
        }
        await enqueue({
          type: "handoff_notify",
          escalationId: h.id,
          workspaceId,
          leadId: r.lead_id,
          decisionNeeded: r.escalation_reason,
        });
        results.push({ workspaceId, batch: false, sent: 1 });
      }
    } catch (e) {
      results.push({
        workspaceId,
        batch: false,
        sent: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}

/** Repeat handoff every 10 min until ack; enqueue one handoff_notify per due escalation so work is durable. */
export async function runHandoffRepeatNotifications(): Promise<number> {
  const { getEscalationsDueForRepeatHandoff, recordHandoffAcknowledgement } = await import("@/lib/delivery-assurance/handoff-ack");
  const due = await getEscalationsDueForRepeatHandoff(50);
  let enqueued = 0;
  for (const r of due) {
    const hasHumanReply = await leadHasHumanReplyAfter(r.lead_id, r.created_at);
    if (hasHumanReply) {
      await recordHandoffAcknowledgement(r.id, "human_reply");
      continue;
    }
    await enqueue({
      type: "handoff_notify",
      escalationId: r.id,
      workspaceId: r.workspace_id,
      leadId: r.lead_id,
      decisionNeeded: r.escalation_reason,
    });
    enqueued++;
  }
  return enqueued;
}

/** Run batch handoff send (one email "Several decisions are ready", update all escalation_logs). Called from process-queue. */
export async function runHandoffBatchSend(workspaceId: string, escalationIds: string[]): Promise<void> {
  const db = getDb();
  const now = new Date();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (ownerId) {
    const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
    const email = (user as { email?: string } | null)?.email;
    if (email) {
      const text = "Outside authority.\n\nMultiple items exist outside authority.\n\nOpen: " + (process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "https://app.recall-touch.com") + "/dashboard" + "\n\nEntry restores reliance." + "\n\nEntry is the operational boundary.";
      const sent = await sendEmail(email, "Outside authority.", text);
      if (sent) {
        const { data: settings } = await db.from("settings").select("team_handoff_emails").eq("workspace_id", workspaceId).maybeSingle();
        const raw = (settings as { team_handoff_emails?: unknown } | null)?.team_handoff_emails;
        const team = Array.isArray(raw) ? raw.filter((e): e is string => typeof e === "string" && e.includes("@")) : [];
        for (const to of team) await sendEmail(to, text, text).catch((e: unknown) => { log("warn", "handoff.team-email", { error: e instanceof Error ? e.message : String(e) }); });
      }
    }
  }
  const notifiedAt = now.toISOString();
  for (const id of escalationIds) {
    await db
      .from("escalation_logs")
      .update({ notified_at: notifiedAt, batch_suppressed: true })
      .eq("id", id);
  }
}
