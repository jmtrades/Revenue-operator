/**
 * Brain Bootstrap — computes intelligence for all existing leads that
 * don't yet have intelligence rows. Safe to call multiple times.
 *
 * This is a one-time backfill endpoint for leads that existed before
 * the brain was deployed. After this, the brain-trigger handles all
 * new signal-driven computation.
 *
 * Auth: requires workspace session (same as other lead APIs).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { computeLeadIntelligence, persistLeadIntelligence } from "@/lib/intelligence/lead-brain";
import { ensureBrainTables } from "@/lib/intelligence/brain-migration";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;

    // Ensure tables exist
    await ensureBrainTables();

    const db = getDb();

    // Find leads in this workspace that don't have intelligence rows
    const { data: leadsWithoutIntelligence } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", session.workspaceId)
      .not("state", "in", '("CLOSED","OPTED_OUT","DO_NOT_CONTACT")');

    const allLeadIds = (leadsWithoutIntelligence ?? []).map(
      (l: { id: string }) => l.id
    );

    if (allLeadIds.length === 0) {
      return NextResponse.json({
        bootstrapped: 0,
        message: "No leads found to bootstrap",
      });
    }

    // Check which already have intelligence
    const { data: existingIntelligence } = await db
      .from("lead_intelligence")
      .select("lead_id")
      .eq("workspace_id", session.workspaceId)
      .in("lead_id", allLeadIds);

    const existingIds = new Set(
      (existingIntelligence ?? []).map((r: { lead_id: string }) => r.lead_id)
    );

    const needsBootstrap = allLeadIds.filter((id: string) => !existingIds.has(id));

    if (needsBootstrap.length === 0) {
      return NextResponse.json({
        bootstrapped: 0,
        already_computed: existingIds.size,
        message: "All leads already have intelligence",
      });
    }

    // Compute and persist intelligence for each lead
    let bootstrapped = 0;
    let failed = 0;
    const results: Array<{
      lead_id: string;
      urgency: number;
      intent: number;
      engagement: number;
      conversion: number;
      action: string;
      timing: string;
    }> = [];

    for (const leadId of needsBootstrap) {
      try {
        const intelligence = await computeLeadIntelligence(
          session.workspaceId,
          leadId
        );
        const persistResult = await persistLeadIntelligence(intelligence);

        if (persistResult.ok) {
          bootstrapped++;
          results.push({
            lead_id: leadId,
            urgency: intelligence.urgency_score,
            intent: intelligence.intent_score,
            engagement: intelligence.engagement_score,
            conversion: intelligence.conversion_probability,
            action: intelligence.next_best_action,
            timing: intelligence.action_timing,
          });
        } else {
          failed++;
        }
      } catch (err) {
        log("error", "brain.bootstrap.lead_error", {
          leadId,
          error: err instanceof Error ? err.message : String(err),
        });
        failed++;
      }
    }

    // Log bootstrap as autonomous action
    try {
      await db.from("autonomous_actions").insert({
        lead_id: needsBootstrap[0], // Reference first lead
        workspace_id: session.workspaceId,
        action_type: "brain_bootstrap",
        success: true,
        details: `Bootstrapped intelligence for ${bootstrapped} leads (${failed} failed)`,
        confidence: 1.0,
        reason: "initial_backfill",
        executed_at: new Date().toISOString(),
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      bootstrapped,
      failed,
      already_computed: existingIds.size,
      total_leads: allLeadIds.length,
      results,
    });
  } catch (err) {
    log("error", "brain.bootstrap.route_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
