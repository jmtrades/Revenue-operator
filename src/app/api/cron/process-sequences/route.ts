/**
 * Cron: Process follow-up sequences for all workspaces.
 * Finds due enrollments and advances them to the next step.
 * Executes actions (SMS/email/call) as needed.
 * Also processes scheduled callbacks, retry calls, and auto-scores leads.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { processWorkspaceDueEnrollments } from "@/lib/sequences/follow-up-engine";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const start = Date.now();
  const results: Record<string, unknown> = { processed: 0, errors: 0, workspaces: 0 };

  try {
    // Get all active workspaces (status column, not is_active boolean)
    const { data: workspaces, error: wsError } = await db
      .from("workspaces")
      .select("id")
      .not("status", "eq", "deleted");

    if (wsError) {
      // Error (details omitted to protect PII)
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 }
      );
    }

    results.workspaces = (workspaces ?? []).length;
    let totalProcessed = 0;

    // Process each workspace's due enrollments
    for (const ws of workspaces ?? []) {
      const workspaceId = ws.id;

      try {
        const processed = await processWorkspaceDueEnrollments(
          workspaceId,
          50 // Process up to 50 enrollments per workspace
        );

        totalProcessed += processed;

        if (processed > 0 && process.env.NODE_ENV === "development") {
          // Development logging removed
        }
      } catch (error) {
        const _msg = error instanceof Error ? error.message : String(error);
        // Error (details omitted to protect PII)
        results.errors = (results.errors as number) + 1;
      }
    }

    results.processed = totalProcessed;

    // Process scheduled callbacks and retry calls (from lead_plans)
    try {
      const now = new Date().toISOString();
      const { data: duePlans } = await db
        .from("lead_plans")
        .select("workspace_id, lead_id, next_action_type")
        .in("next_action_type", ["retry_call", "scheduled_callback", "schedule_call"])
        .lt("next_action_at", now)
        .eq("status", "pending")
        .limit(50);

      let callbacksProcessed = 0;
      for (const plan of (duePlans ?? []) as Array<{ workspace_id: string; lead_id: string; next_action_type: string }>) {
        try {
          if (plan.next_action_type === "retry_call" || plan.next_action_type === "scheduled_callback") {
            const { executeLeadOutboundCall } = await import("@/lib/outbound/execute-lead-call");
            const result = await executeLeadOutboundCall(plan.workspace_id, plan.lead_id);
            if (result.ok) {
              await db.from("lead_plans")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("workspace_id", plan.workspace_id)
                .eq("lead_id", plan.lead_id)
                .eq("status", "pending");
              callbacksProcessed++;
            }
          }
        } catch (err) {
          // Error (details omitted to protect PII)
        }
      }
      results.callbacks_processed = callbacksProcessed;
    } catch {
      // lead_plans table may not exist yet — non-blocking
    }

    // Auto-score leads that have been called but not yet scored
    try {
      const { autoScoreRecentLeads } = await import("@/lib/intelligence/lead-scoring");
      const scored = await autoScoreRecentLeads();
      results.leads_scored = scored;
    } catch {
      // Non-blocking — scoring module may not be ready
    }

    results.duration_ms = Date.now() - start;
    return NextResponse.json({
      ok: true,
      message: `Sequence processing completed. Processed ${totalProcessed} enrollments.`,
      ...results,
    });
  } catch (error) {
    // Error (details omitted to protect PII)
    return NextResponse.json(
      { error: "Unexpected error processing sequences", duration_ms: Date.now() - start },
      { status: 500 }
    );
  }
}
