/**
 * POST /api/appointments/[id]/outcome — Record appointment outcome & trigger post-meeting intelligence.
 *
 * After a meeting happens, records what happened (showed/no-show/rescheduled),
 * updates lead status, triggers appropriate follow-up sequences, and logs the outcome
 * for analytics. This bridges the gap between "appointment booked" and "what happened next."
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const outcomeSchema = z.object({
  outcome: z.enum([
    "completed",     // Meeting happened, went well
    "no_show",       // Contact didn't show up
    "rescheduled",   // Rescheduled to different time
    "cancelled",     // Cancelled by contact
    "partial",       // Meeting started but didn't finish (dropped, technical issues)
  ]),
  notes: z.string().max(5000).optional(),
  next_steps: z.string().max(2000).optional(),
  follow_up_date: z.string().datetime().optional(),
  deal_value: z.number().min(0).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = outcomeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { outcome, notes, next_steps, follow_up_date, deal_value, sentiment, tags } = parsed.data;
  const db = getDb();

  // Fetch appointment and verify ownership
  const { data: appointment } = await db
    .from("appointments")
    .select("id, workspace_id, lead_id, title, start_time, status, metadata")
    .eq("id", id)
    .maybeSingle();

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const apt = appointment as {
    id: string;
    workspace_id: string;
    lead_id: string;
    title: string;
    start_time: string;
    status: string;
    metadata?: Record<string, unknown>;
  };

  if (apt.workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();

  try {
    // 1. Update appointment status and metadata with outcome
    const updatedMetadata = {
      ...(apt.metadata ?? {}),
      outcome,
      outcome_recorded_at: now,
      outcome_recorded_by: session.userId ?? "system",
      sentiment: sentiment ?? null,
      deal_value: deal_value ?? null,
      next_steps: next_steps ?? null,
      follow_up_date: follow_up_date ?? null,
      tags: tags ?? [],
    };

    // Map outcome to appointment status
    const statusMap: Record<string, string> = {
      completed: "completed",
      no_show: "no_show",
      rescheduled: "pending",
      cancelled: "cancelled",
      partial: "completed",
    };

    await db
      .from("appointments")
      .update({
        status: statusMap[outcome] ?? "completed",
        notes: notes ? `${apt.title ? "" : ""}${notes}` : undefined,
        metadata: updatedMetadata,
        updated_at: now,
      })
      .eq("id", id);

    // 2. Update lead status based on outcome
    const leadStatusMap: Record<string, string> = {
      completed: "QUALIFIED",
      no_show: "REACTIVATE",
      rescheduled: "FOLLOW_UP",
      cancelled: "FOLLOW_UP",
      partial: "FOLLOW_UP",
    };

    const newLeadStatus = leadStatusMap[outcome];
    if (newLeadStatus && apt.lead_id) {
      await db
        .from("leads")
        .update({
          status: newLeadStatus,
          updated_at: now,
        })
        .eq("id", apt.lead_id)
        .eq("workspace_id", session.workspaceId);
    }

    // 3. Log to operational ledger for analytics
    await db.from("operational_ledger").insert({
      workspace_id: session.workspaceId,
      event_type: `appointment.${outcome}`,
      severity: outcome === "no_show" ? "warning" : "info",
      subject_type: "appointment",
      subject_ref: id,
      details_json: {
        lead_id: apt.lead_id,
        appointment_title: apt.title,
        appointment_time: apt.start_time,
        outcome,
        sentiment,
        deal_value,
        next_steps,
        follow_up_date,
        notes: notes?.slice(0, 200),
      },
      occurred_at: now,
    });

    // 4. Create follow-up task for no-shows and rescheduled
    if (outcome === "no_show" && apt.lead_id) {
      // Schedule a re-engagement attempt
      const reEngageDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +1 day

      try {
        await db.from("action_intents").insert({
          workspace_id: session.workspaceId,
          lead_id: apt.lead_id,
          action_type: "follow_up_no_show",
          status: "pending",
          scheduled_for: reEngageDate,
          metadata: {
            original_appointment_id: id,
            original_appointment_time: apt.start_time,
            appointment_title: apt.title,
            attempt: 1,
          },
        });
        log("info", `Post-appointment: no-show follow-up scheduled for lead=${apt.lead_id} appointment=${id}`);
      } catch {
        // Non-fatal — action_intents table may not exist
      }
    }

    // 5. If deal value provided, record revenue signal
    if (deal_value && deal_value > 0 && apt.lead_id) {
      try {
        await db.from("operational_ledger").insert({
          workspace_id: session.workspaceId,
          event_type: "revenue.signal",
          severity: "info",
          subject_type: "lead",
          subject_ref: apt.lead_id,
          details_json: {
            source: "appointment_outcome",
            appointment_id: id,
            deal_value,
            sentiment,
          },
          occurred_at: now,
        });
      } catch {
        // Non-fatal
      }
    }

    // Autonomous Brain: recompute intelligence after appointment outcome
    if (apt.lead_id) {
      void (async () => {
        try {
          const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
          const intelligence = await computeLeadIntelligence(session.workspaceId!, apt.lead_id);
          await persistLeadIntelligence(intelligence);
        } catch { /* Non-blocking */ }
      })();
    }

    log("info", `Appointment outcome recorded: appointment=${id} outcome=${outcome} lead=${apt.lead_id}`);

    return NextResponse.json({
      ok: true,
      appointment_id: id,
      outcome,
      lead_status: newLeadStatus,
      follow_up_scheduled: outcome === "no_show",
    });
  } catch (error) {
    log("error", `Appointment outcome error: ${error instanceof Error ? error.message : "unknown"}`);
    return NextResponse.json(
      { error: "Failed to record outcome" },
      { status: 500 }
    );
  }
}
