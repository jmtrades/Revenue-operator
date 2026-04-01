export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";
import { computeLeadIntelligence, getLeadIntelligence, persistLeadIntelligence } from "@/lib/intelligence/lead-brain";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace access
    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    // Verify lead exists in this workspace
    const { data: lead, error: leadError } = await db
      .from("leads")
      .select("id, workspace_id")
      .eq("id", id)
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();

    if (leadError) {
      log("error", "leads.intelligence.lead_lookup_error", { error: leadError.message });
      return NextResponse.json({ error: "Could not process lead data" }, { status: 500 });
    }

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Try to get persisted intelligence
    let intelligence = await getLeadIntelligence(session.workspaceId, id);
    let computedFresh = false;

    // If not found or stale (>6 hours), compute fresh
    if (!intelligence) {
      intelligence = await computeLeadIntelligence(session.workspaceId, id);
      computedFresh = true;
      // Persist non-blocking
      persistLeadIntelligence(intelligence).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
    } else {
      // Check if stale
      const computedAt = new Date(intelligence.computed_at).getTime();
      const hoursSinceComputed = (Date.now() - computedAt) / (1000 * 60 * 60);
      if (hoursSinceComputed > 6) {
        intelligence = await computeLeadIntelligence(session.workspaceId, id);
        computedFresh = true;
        persistLeadIntelligence(intelligence).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
      }
    }

    // Fetch last 10 autonomous actions for this lead
    const { data: actions, error: actionsError } = await db
      .from("autonomous_actions")
      .select("*")
      .eq("workspace_id", session.workspaceId)
      .eq("lead_id", id)
      .order("executed_at", { ascending: false })
      .limit(10);

    if (actionsError) {
      log("error", "leads.intelligence.actions_lookup_error", { error: actionsError.message });
      // Don't fail — just return without actions
    }

    return NextResponse.json({
      intelligence,
      recent_actions: actions ?? [],
      computed_fresh: computedFresh,
    });
  } catch (err) {
    log("error", "leads.intelligence.get_route_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
