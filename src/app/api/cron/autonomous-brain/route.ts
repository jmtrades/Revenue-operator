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
      console.error(
        "[autonomous-brain] Reactivation sweep error:",
        err instanceof Error ? err.message : String(err)
      );
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
        } catch {
          // Non-blocking per workspace
        }
      }
    } catch (err) {
      console.error(
        "[autonomous-brain] Meeting check error:",
        err instanceof Error ? err.message : String(err)
      );
      failures++;
    }

    // 3. Refresh stale intelligence (leads not computed in last 6 hours)
    try {
      const { computeLeadIntelligence, persistLeadIntelligence } =
        await import("@/lib/intelligence/lead-brain");
      const { getDb } = await import("@/lib/db/queries");
      const db = getDb();

      const sixHoursAgo = new Date(
        Date.now() - 6 * 60 * 60 * 1000
      ).toISOString();

      // Find leads with recent activity but stale intelligence
      const { data: staleLeads } = await db
        .from("leads")
        .select("id, workspace_id")
        .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not("state", "in", '("CLOSED","OPTED_OUT","DO_NOT_CONTACT")')
        .limit(30);

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
          if (computedAt && computedAt > sixHoursAgo) continue;

          const intelligence = await computeLeadIntelligence(
            lead.workspace_id,
            lead.id
          );
          await persistLeadIntelligence(intelligence);
          intelligenceRefreshed++;
        } catch {
          // Non-blocking per lead
        }
      }
    } catch (err) {
      console.error(
        "[autonomous-brain] Intelligence refresh error:",
        err instanceof Error ? err.message : String(err)
      );
      failures++;
    }

    return {
      run: reactivated + meetingActions + intelligenceRefreshed,
      failures,
      reactivated,
      meetingActions,
      intelligenceRefreshed,
    };
  });

  return NextResponse.json(result);
}
