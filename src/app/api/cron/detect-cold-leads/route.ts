/**
 * Cron: Detect and auto-reactivate cold leads
 * Identifies leads with no activity for 30+ days and initiates smart reactivation.
 * Runs every 6 hours to continuously monitor and engage cold leads.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { decideSmartReactivation, executeSmartReactivation } from "@/lib/intelligence/smart-reactivation";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const start = Date.now();
  let processed = 0;
  let reactivated = 0;
  let errors = 0;

  try {
    const db = getDb();

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Query cold leads: last_activity_at > 30 days ago, not in final states, not opted out
    const { data: coldLeads, error: queryError } = await db
      .from("leads")
      .select("id, workspace_id, company_name, last_activity_at, state, engagement_score")
      .lt("last_activity_at", thirtyDaysAgo)
      .notIn("state", ["WON", "LOST", "DISQUALIFIED", "OPTED_OUT"])
      .eq("opt_out", false)
      .order("last_activity_at", { ascending: true })
      .limit(50);

    if (queryError) {
      log("error", "[detect-cold-leads] Query failed", { error: queryError.message });
      return NextResponse.json(
        { error: "Failed to query cold leads", duration_ms: Date.now() - start },
        { status: 500 }
      );
    }

    if (!coldLeads || coldLeads.length === 0) {
      log("info", "[detect-cold-leads] No cold leads found");
      return NextResponse.json({
        ok: true,
        message: "No cold leads detected",
        processed: 0,
        reactivated: 0,
        duration_ms: Date.now() - start,
      });
    }

    // Check for leads already in reactivation sequence
    const leadIds = coldLeads.map((l) => (l as { id: string }).id);
    const { data: activeReactivations, error: reactivationError } = await db
      .from("autonomous_actions")
      .select("lead_id")
      .in("lead_id", leadIds)
      .eq("action_type", "reactivation")
      .in("status", ["pending", "executed", "in_progress"])
      .order("created_at", { ascending: false });

    if (reactivationError) {
      log("warn", "[detect-cold-leads] Failed to check active reactivations", { error: reactivationError.message });
    }

    const activeReactivationLeadIds = new Set(
      (activeReactivations ?? []).map((r) => (r as { lead_id: string }).lead_id)
    );

    // Process each cold lead
    for (const lead of coldLeads) {
      const l = lead as { id: string; workspace_id: string; company_name?: string; last_activity_at: string; state: string };
      processed++;

      try {
        // Skip if already in reactivation sequence
        if (activeReactivationLeadIds.has(l.id)) {
          log("info", "[detect-cold-leads] Lead already in reactivation sequence", { lead_id: l.id });
          continue;
        }

        // Decide whether to reactivate using smart reactivation engine
        const decision = await decideSmartReactivation(l.workspace_id, l.id);

        if (decision.should_reactivate) {
          // Execute smart reactivation
          const result = await executeSmartReactivation(l.workspace_id, l.id, decision);

          if (result.success) {
            reactivated++;
            log("info", "[detect-cold-leads] Cold lead reactivated", {
              lead_id: l.id,
              workspace_id: l.workspace_id,
              company_name: l.company_name,
              state: l.state,
              angle: decision.angle,
              channel: decision.channel,
              confidence: decision.confidence,
            });
          } else {
            log("warn", "[detect-cold-leads] Reactivation execution failed", {
              lead_id: l.id,
              workspace_id: l.workspace_id,
              details: result.details,
            });
          }
        } else {
          log("info", "[detect-cold-leads] Lead decision: no reactivation needed", {
            lead_id: l.id,
            workspace_id: l.workspace_id,
            reason: decision.reason,
          });
        }
      } catch (err) {
        errors++;
        const msg = err instanceof Error ? err.message : String(err);
        log("error", "[detect-cold-leads] Error processing lead", {
          lead_id: l.id,
          workspace_id: l.workspace_id,
          error: msg,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Cold lead detection completed: ${processed} leads processed, ${reactivated} reactivated, ${errors} errors`,
      processed,
      reactivated,
      errors,
      duration_ms: Date.now() - start,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("error", "[detect-cold-leads] Unexpected error", { error: msg });
    return NextResponse.json(
      {
        error: "Cold lead detection failed",
        details: "Error details omitted to protect PII",
        duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
