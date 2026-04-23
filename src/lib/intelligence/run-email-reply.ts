/**
 * Phase 13b — Worker entrypoint for inbound email replies.
 *
 * Called from /api/cron/process-queue when a "process_email_reply" job is
 * dequeued. Assembles a LeadContext from live DB state, invokes
 * processEvent(), persists the resulting stage update / score delta /
 * notifications, and enqueues any follow-up emails.
 *
 * Kept deliberately additive — if anything here throws, we log and move on.
 * The actual business rules live in reactive-event-processor (pure function
 * with structured output).
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { log } from "@/lib/logger";
import {
  processEvent,
  type LeadContext,
  type LeadEvent,
} from "@/lib/intelligence/reactive-event-processor";

export interface RunEmailReplyInput {
  workspaceId: string;
  leadId: string;
  text: string;
  subject: string;
  fromEmail: string;
  messageId: string | null;
  receivedAt: string;
}

/** Days between two ISO timestamps, floored to 0. */
function daysBetween(fromIso: string | null, toIso: string): number {
  if (!fromIso) return 0;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

/** Build a LeadContext from the current DB row. Filled conservatively. */
export async function buildLeadContextForEmail(
  workspaceId: string,
  leadId: string,
  now: string,
): Promise<LeadContext | null> {
  const db = getDb();
  const { data } = await db
    .from("leads")
    .select(
      "id, workspace_id, name, email, phone, company, stage, lead_score, created_at, last_touched_at, total_touchpoints, opted_out",
    )
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    stage?: string | null;
    lead_score?: number | null;
    created_at?: string | null;
    last_touched_at?: string | null;
    total_touchpoints?: number | null;
    opted_out?: boolean | null;
  };

  const daysSinceFirst = daysBetween(row.created_at ?? null, now);
  const daysSinceDark = daysBetween(row.last_touched_at ?? null, now);
  const score = typeof row.lead_score === "number" ? row.lead_score : 0;

  return {
    leadId: row.id,
    name: row.name ?? "there",
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    companyName: row.company ?? undefined,
    lifecyclePhase: (row.stage ?? "NEW").toUpperCase(),
    daysSinceFirstContact: daysSinceFirst,
    daysSinceDark,
    leadScore: score,
    conversionProbability: Math.max(0, Math.min(1, score / 100)),
    lastActivityAt: row.last_touched_at ?? row.created_at ?? now,
    lastTouchChannel: "email",
    totalTouchpoints: typeof row.total_touchpoints === "number" ? row.total_touchpoints : 0,
    recentEvents: [],
    sentiment: "unknown",
    hasOptedOut: Boolean(row.opted_out),
    isHighValue: false,
  };
}

export async function runProcessEmailReply(input: RunEmailReplyInput): Promise<void> {
  const db = getDb();
  try {
    const ctx = await buildLeadContextForEmail(input.workspaceId, input.leadId, input.receivedAt);
    if (!ctx) {
      log("warn", "email_reply.lead_missing", {
        workspace_id: input.workspaceId,
        lead_id: input.leadId,
      });
      return;
    }

    const event: LeadEvent = {
      id: input.messageId ?? `email-${Date.now()}`,
      type: "email_reply",
      timestamp: input.receivedAt,
      leadId: input.leadId,
      channel: "email",
      data: {
        text: input.text,
        subject: input.subject,
        from_email: input.fromEmail,
        message_id: input.messageId,
      },
      metadata: { source: "inbound_email_webhook" },
    };

    const reaction = processEvent(event, ctx);

    // Persist stage update if recommended.
    if (reaction.stageUpdate?.newStage) {
      try {
        await db
          .from("leads")
          .update({
            stage: reaction.stageUpdate.newStage,
            last_touched_at: input.receivedAt,
            opted_out:
              reaction.stageUpdate.newStage === "LOST" &&
              /unsubscribe|opt-out|do not contact/i.test(reaction.reasoning)
                ? true
                : undefined,
          })
          .eq("id", input.leadId)
          .eq("workspace_id", input.workspaceId);
      } catch {
        // additive
      }
    }

    // Persist score delta.
    if (reaction.scoreDelta?.delta && Number.isFinite(reaction.scoreDelta.delta)) {
      try {
        const newScore = Math.max(0, Math.min(100, ctx.leadScore + reaction.scoreDelta.delta));
        await db
          .from("leads")
          .update({ lead_score: newScore })
          .eq("id", input.leadId)
          .eq("workspace_id", input.workspaceId);
      } catch {
        // additive
      }
    }

    // Internal notes.
    for (const note of reaction.internalNotes ?? []) {
      try {
        await db.from("lead_notes").insert({
          workspace_id: input.workspaceId,
          lead_id: input.leadId,
          content: note.content,
          visibility: note.visibility ?? "team",
          created_by: "system:email_reply",
        });
      } catch {
        // table may not exist in every workspace — additive
      }
    }

    // Enqueue decision follow-up so downstream engines (sequencing, no-show,
    // reactivation) react to the new lead stage.
    try {
      await enqueue({
        type: "decision",
        leadId: input.leadId,
        workspaceId: input.workspaceId,
        eventId: event.id,
      });
    } catch {
      // additive
    }
  } catch (err) {
    log("error", "email_reply.run_failed", {
      workspace_id: input.workspaceId,
      lead_id: input.leadId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
