/**
 * POST /api/connectors/events/ingest
 * Append-only connector_events ingest. Optional execution pipeline when normalized_inbound is provided.
 * Body: workspace_id, channel, external_id, payload (optional). Idempotent on (workspace_id, channel, external_id).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import {
  runGovernedExecution,
  type NormalizedInboundEvent,
  type ConversationContext,
  type DomainHints,
  type EmitRecipient,
} from "@/lib/execution-plan";
import { RateLimitExceededError } from "@/lib/execution-plan/rate-limits";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  const channel = body.channel?.trim();
  const external_id = body.external_id?.trim();
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  if (!workspaceId || !channel || !external_id) {
    return NextResponse.json({ ok: false, reason: "workspace_id_channel_external_id_required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("connector_events")
    .insert({
      workspace_id: workspaceId,
      channel,
      external_id,
      payload,
    })
    .select("id")
    .maybeSingle();

  if (error && (error as { code?: string }).code === "23505") {
    return NextResponse.json({ ok: true, id: null, duplicate: true }, { status: 200 });
  }
  if (error) {
    return NextResponse.json({ ok: false, reason: "insert_failed" }, { status: 500 });
  }

  let executionOk = false;
  let executionReason: string | null = null;

  try {
    const normalized = (payload as { normalized_inbound?: unknown }).normalized_inbound;
    if (normalized && typeof normalized === "object") {
      const n = normalized as Record<string, unknown>;
      const hasConversationId = typeof n.conversation_id === "string" && n.conversation_id.length > 0;
      const hasThreadId = n.thread_id !== undefined && n.thread_id !== null;
      const hasWorkUnitId = n.work_unit_id !== undefined && n.work_unit_id !== null;
      const hasIntentHint = n.intent_hint !== undefined;
      if (!hasConversationId || !hasThreadId || !hasWorkUnitId || !hasIntentHint) {
        executionOk = false;
        executionReason = "invalid_normalized_inbound";
        try {
          await db.from("connector_events_dead_letter").insert({
            workspace_id: workspaceId,
            channel,
            external_id,
            payload,
            reason: "invalid_normalized_inbound",
          });
        } catch {
          // ignore
        }
      } else {
        const inboundEvent: NormalizedInboundEvent = {
          workspace_id: (n.workspace_id as string) ?? workspaceId,
          conversation_id: n.conversation_id as string,
          thread_id: (n.thread_id as string | null) ?? null,
          work_unit_id: (n.work_unit_id as string | null) ?? null,
          lead_id: (n.lead_id as string) ?? null,
          channel: (n.channel as string) ?? channel,
          raw_content: (n.raw_content as string) ?? null,
          pre_classified_intent: (n.intent_hint as string) ?? (n.pre_classified_intent as string) ?? null,
          pre_classified_risk_flags: (n.pre_classified_risk_flags as string[]) ?? null,
          pre_classified_emotional_signals: (n.pre_classified_emotional_signals as NormalizedInboundEvent["pre_classified_emotional_signals"]) ?? null,
        };

      const conversationContext: ConversationContext = {
        conversation_id: inboundEvent.conversation_id,
        thread_id: inboundEvent.thread_id ?? null,
        work_unit_id: inboundEvent.work_unit_id ?? null,
        lead_id: inboundEvent.lead_id ?? null,
        existing_channel: inboundEvent.channel ?? null,
      };

      const domainHints: DomainHints | null =
        (body.domain_hints && typeof body.domain_hints === "object" ? body.domain_hints : null) ??
        (payload as { domain_hints?: DomainHints }).domain_hints ??
        null;

      const recipientPayload = (payload as { recipient?: EmitRecipient }).recipient ?? {};
      const recipient: EmitRecipient = {
        to: typeof recipientPayload.to === "string" ? recipientPayload.to : undefined,
        phone: typeof recipientPayload.phone === "string" ? recipientPayload.phone : undefined,
        email: typeof recipientPayload.email === "string" ? recipientPayload.email : undefined,
      };

      await runGovernedExecution({
        workspaceId,
        inboundEvent,
        conversationContext,
        recipient,
        domainHints,
      });
      executionOk = true;
      }
    }
  } catch (err: unknown) {
    executionOk = false;
    if (err instanceof RateLimitExceededError) {
      executionReason = "rate_limit_exceeded";
    } else {
      executionReason = "execution_pipeline_failed";
      try {
        await db.from("connector_events_dead_letter").insert({
          workspace_id: workspaceId,
          channel,
          external_id,
          payload,
          reason: "execution_pipeline_failed",
        });
      } catch {
        // ignore
      }
    }
  }

  return NextResponse.json({
    ok: true,
    id: (data as { id: string } | null)?.id ?? null,
    execution: { ok: executionOk, reason: executionReason },
  });
}
