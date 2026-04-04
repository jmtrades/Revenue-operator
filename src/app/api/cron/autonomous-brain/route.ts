/**
 * Cron: Autonomous Revenue Brain
 * Runs the continuous autonomous loop:
 * 1. Smart reactivation sweep (intelligence-driven)
 * 2. Meeting-aware checks (pre/post meeting actions)
 * 3. Bulk intelligence recomputation for stale leads
 *
 * Schedule: every 2 minutes via core orchestrator
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { log } from "@/lib/logger";
import { runSafeCron } from "@/lib/cron/run-safe";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("autonomous-brain", async () => {
    let reactivated = 0;
    let meetingActions = 0;
    let intelligenceRefreshed = 0;
    let failures = 0;

    // 1. Smart reactivation sweep
    try {
      const { runSmartReactivationSweep } = await import(
        "@/lib/intelligence/smart-reactivation"
      );
      const sweep = await runSmartReactivationSweep();
      reactivated = sweep.reactivated;
    } catch (err) {
      // Error (details omitted to protect PII)
      failures++;
    }

    // 2. Meeting-aware checks (all workspaces)
    try {
      const { runMeetingAwareCheck } = await import(
        "@/lib/intelligence/meeting-aware"
      );
      const { getDb } = await import("@/lib/db/queries");
      const db = getDb();
      const { data: workspaces } = await db
        .from("workspaces")
        .select("id")
        .neq("status", "paused")
        .limit(50);

      for (const ws of (workspaces ?? []) as Array<{ id: string }>) {
        try {
          const check = await runMeetingAwareCheck(ws.id);
          meetingActions += check.actions;
        } catch (e) {
          log("warn", "[autonomous-brain] meeting-aware check failed", { workspaceId: ws.id, error: e instanceof Error ? e.message : String(e) });
        }
      }
    } catch (err) {
      // Error (details omitted to protect PII)
      failures++;
    }

    // 3. Refresh stale intelligence AND execute pending actions
    let actionsExecuted = 0;
    try {
      const { computeLeadIntelligence, persistLeadIntelligence, getLeadIntelligence } =
        await import("@/lib/intelligence/lead-brain");
      const { executeAutonomousAction } = await import(
        "@/lib/intelligence/autonomous-executor"
      );
      const { getDb } = await import("@/lib/db/queries");
      const db = getDb();

      const sixHoursAgo = new Date(
        Date.now() - 6 * 60 * 60 * 1000
      ).toISOString();

      // Find leads with recent activity but stale intelligence (30-day window, 100 batch)
      const { data: activeLeads } = await db
        .from("leads")
        .select("id, workspace_id")
        .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .not("status", "in", '("CLOSED","WON","LOST")')
        .order("updated_at", { ascending: false })
        .limit(100);

      // Also find leads with NO intelligence at all (never computed) — prevent permanent neglect
      const { data: unintelligentLeads } = await db
        .from("leads")
        .select("id, workspace_id")
        .not("status", "in", '("CLOSED","WON","LOST")')
        .not("id", "in", `(${(activeLeads ?? []).map((l: { id: string }) => `"${l.id}"`).join(",") || '"__none__"'})`)
        .is("last_activity_at", null)
        .limit(20);

      // Merge both sets, deduped
      const seenIds = new Set<string>();
      const staleLeads: Array<{ id: string; workspace_id: string }> = [];
      for (const lead of [...(activeLeads ?? []), ...(unintelligentLeads ?? [])] as Array<{ id: string; workspace_id: string }>) {
        if (!seenIds.has(lead.id)) {
          seenIds.add(lead.id);
          staleLeads.push(lead);
        }
      }

      for (const lead of (staleLeads ?? []) as Array<{
        id: string;
        workspace_id: string;
      }>) {
        try {
          // Check if intelligence exists and is fresh
          const { data: existing } = await db
            .from("lead_intelligence")
            .select("computed_at")
            .eq("lead_id", lead.id)
            .eq("workspace_id", lead.workspace_id)
            .maybeSingle();

          const computedAt = (existing as { computed_at?: string } | null)
            ?.computed_at;

          let intelligence;
          if (computedAt && computedAt > sixHoursAgo) {
            // Intelligence is fresh — use it directly
            intelligence = await getLeadIntelligence(lead.workspace_id, lead.id);
          } else {
            // Recompute stale intelligence
            intelligence = await computeLeadIntelligence(
              lead.workspace_id,
              lead.id
            );
            await persistLeadIntelligence(intelligence);
            intelligenceRefreshed++;
          }

          // Execute action if brain has a confident recommendation
          // This is the continuous execution loop — the brain doesn't just think, it acts
          if (
            intelligence &&
            intelligence.action_confidence >= 0.3 &&
            intelligence.next_best_action !== "no_action" &&
            !intelligence.risk_flags.includes("opt_out_signal")
          ) {
            try {
              const result = await executeAutonomousAction(intelligence);
              if (result.success && result.action_type !== "no_action") {
                actionsExecuted++;
              }
            } catch (e) {
              log("warn", "[autonomous-brain] action execution failed", { leadId: lead.id, error: e instanceof Error ? e.message : String(e) });
            }
          }
        } catch (e) {
          log("warn", "[autonomous-brain] intelligence cycle failed", { leadId: lead.id, error: e instanceof Error ? e.message : String(e) });
        }
      }
    } catch (err) {
      // Error (details omitted to protect PII)
      failures++;
    }

    // 4. Detect no_action churn — leads stuck getting repeated no_action decisions
    let noActionChurnDetected = 0;
    try {
      const { getDb: getDb2 } = await import("@/lib/db/queries");
      const db2 = getDb2();
      // Find leads whose last 5+ intelligence computations all returned no_action
      const { data: churnCandidates } = await db2
        .from("lead_intelligence")
        .select("lead_id, workspace_id")
        .eq("next_best_action", "no_action")
        .gte("computed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(50);

      for (const candidate of (churnCandidates ?? []) as Array<{ lead_id: string; workspace_id: string }>) {
        // Count consecutive no_action — if stuck, force a reactivation touch
        const { count } = await db2
          .from("lead_intelligence")
          .select("id", { count: "exact", head: true })
          .eq("lead_id", candidate.lead_id)
          .eq("workspace_id", candidate.workspace_id)
          .eq("next_best_action", "no_action");

        if ((count ?? 0) >= 3) {
          // Force update to schedule_followup to break the loop
          await db2.from("lead_intelligence").update({
            next_best_action: "schedule_followup",
            action_reason: "Breaking no_action churn — lead stuck with no decisions",
            action_confidence: 0.4,
            updated_at: new Date().toISOString(),
          }).eq("lead_id", candidate.lead_id).eq("workspace_id", candidate.workspace_id);
          noActionChurnDetected++;
        }
      }
    } catch (e) {
      log("warn", "[autonomous-brain] no_action churn detection failed", { error: e instanceof Error ? e.message : String(e) });
    }

    return {
      run: reactivated + meetingActions + intelligenceRefreshed + actionsExecuted,
      failures,
      reactivated,
      meetingActions,
      intelligenceRefreshed,
      actionsExecuted,
      noActionChurnDetected,
    };
  });

  return NextResponse.json(result);
}
