/**
 * Automatic no-show detection cron.
 *
 * Runs every 15 minutes. Finds appointments that:
 *  - Have status "confirmed" (not yet marked with an outcome)
 *  - Were scheduled to start more than 2 hours ago
 *
 * For each, marks the appointment as no_show, updates the lead status
 * to REACTIVATE, logs to operational_ledger, and schedules a follow-up
 * action so the brain can trigger a re-engagement sequence.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

/** How long after start_time before we consider it a no-show (ms). */
const NO_SHOW_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Max appointments to process per run to keep latency bounded. */
const BATCH_SIZE = 100;

type ApptRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  metadata: Record<string, unknown> | null;
};

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() - NO_SHOW_THRESHOLD_MS).toISOString();

  // Find confirmed appointments whose start_time is before the cutoff
  // (meaning 2+ hours have passed since they were supposed to start)
  let appointments: ApptRow[] = [];
  try {
    const { data, error } = await db
      .from("appointments")
      .select("id, workspace_id, lead_id, title, start_time, end_time, metadata")
      .eq("status", "confirmed")
      .lt("start_time", cutoff)
      .order("start_time", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      log("error", "no_show_detection.query_failed", { error: error.message });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    appointments = (data ?? []) as ApptRow[];
  } catch (err) {
    log("error", "no_show_detection.query_exception", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({
      ok: true,
      detected: 0,
      message: "appointments table not available",
    });
  }

  if (appointments.length === 0) {
    return NextResponse.json({ ok: true, detected: 0 });
  }

  let detected = 0;
  let errors = 0;

  for (const appt of appointments) {
    try {
      const nowIso = new Date().toISOString();

      // 1. Mark appointment as no_show
      const updatedMetadata = {
        ...(appt.metadata ?? {}),
        outcome: "no_show",
        outcome_recorded_at: nowIso,
        outcome_recorded_by: "system:no_show_detection",
        auto_detected: true,
      };

      await db
        .from("appointments")
        .update({
          status: "no_show",
          metadata: updatedMetadata,
          updated_at: nowIso,
        })
        .eq("id", appt.id);

      // 2. Update lead status to REACTIVATE
      if (appt.lead_id) {
        await db
          .from("leads")
          .update({ status: "REACTIVATE", updated_at: nowIso })
          .eq("id", appt.lead_id)
          .eq("workspace_id", appt.workspace_id);
      }

      // 3. Log to operational ledger
      try {
        await db.from("operational_ledger").insert({
          workspace_id: appt.workspace_id,
          event_type: "appointment.no_show",
          severity: "warning",
          subject_type: "appointment",
          subject_ref: appt.id,
          details_json: {
            lead_id: appt.lead_id,
            appointment_title: appt.title,
            appointment_time: appt.start_time,
            outcome: "no_show",
            detection_method: "automatic",
            hours_since_start: Math.round(
              (now.getTime() - new Date(appt.start_time).getTime()) / (60 * 60 * 1000)
            ),
          },
          occurred_at: nowIso,
        });
      } catch {
        // Non-fatal — ledger may not exist in all environments
      }

      // 4. Schedule follow-up action for brain to process
      if (appt.lead_id) {
        try {
          const reEngageDate = new Date(
            Date.now() + 60 * 60 * 1000
          ).toISOString(); // +1 hour (faster than manual path which waits 24h)

          await db.from("action_intents").insert({
            workspace_id: appt.workspace_id,
            intent_type: "follow_up_no_show",
            payload_json: {
              lead_id: appt.lead_id,
              original_appointment_id: appt.id,
              original_appointment_time: appt.start_time,
              appointment_title: appt.title,
              detection_method: "automatic",
              scheduled_for: reEngageDate,
              attempt: 1,
            },
            dedupe_key: `noshow:${appt.workspace_id}:${appt.lead_id}:${appt.id}`,
          });
        } catch {
          // Non-fatal — action_intents table may not exist
        }
      }

      // 5. Recompute lead intelligence in background
      if (appt.lead_id) {
        void (async () => {
          try {
            const { computeLeadIntelligence, persistLeadIntelligence } = await import(
              "@/lib/intelligence/lead-brain"
            );
            const intelligence = await computeLeadIntelligence(
              appt.workspace_id,
              appt.lead_id
            );
            await persistLeadIntelligence(intelligence);
          } catch {
            /* Non-blocking */
          }
        })();
      }

      detected++;
      log("info", "no_show_detection.marked", {
        appointment_id: appt.id,
        lead_id: appt.lead_id,
        workspace_id: appt.workspace_id,
        hours_overdue: Math.round(
          (now.getTime() - new Date(appt.start_time).getTime()) / (60 * 60 * 1000)
        ),
      });
    } catch (err) {
      errors++;
      log("error", "no_show_detection.processing_error", {
        appointment_id: appt.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  log("info", "no_show_detection.run_complete", { detected, errors, checked: appointments.length });

  return NextResponse.json({ ok: true, detected, errors, checked: appointments.length });
}
