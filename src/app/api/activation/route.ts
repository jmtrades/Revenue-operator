/**
 * Guided Activation: scan leads, identify opportunities, simulate 3 actions, prompt activation
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { DEFAULT_DEAL_VALUE_CENTS } from "@/lib/constants";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: state } = await db
    .from("activation_states")
    .select("step, opportunities_found, simulated_actions_count, activated_at, zoom_connected, zoom_webhook_verified")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const { data: settingsRow } = await db.from("settings").select("weekly_call_target").eq("workspace_id", workspaceId).maybeSingle();
  const weeklyCallTarget = (settingsRow as { weekly_call_target?: number })?.weekly_call_target ?? null;

  const { data: zoomAccount } = await db.from("zoom_accounts").select("id").eq("workspace_id", workspaceId).maybeSingle();

  const current = (state as { step?: string; opportunities_found?: number; simulated_actions_count?: number; activated_at?: string; zoom_connected?: boolean; zoom_webhook_verified?: boolean }) ?? {};

  let topRecoverable: unknown[] = [];
  let recoverableRevenueCents = 0;
  const step = current.step ?? "scan";
  if (step === "opportunities" || step === "simulate" || step === "ready") {
    const { data: leads } = await db
      .from("leads")
      .select("id, name, company, state")
      .eq("workspace_id", workspaceId)
      .in("state", ["REACTIVATE", "LOST", "CONTACTED", "ENGAGED", "QUALIFIED"])
      .order("last_activity_at", { ascending: false })
      .limit(5);
    const ids = (leads ?? []).map((l: { id: string }) => l.id);
    const { data: deals } = ids.length ? await db.from("deals").select("lead_id, value_cents").in("lead_id", ids) : { data: [] };
    const valueByLead = ((deals ?? []) as { lead_id: string; value_cents: number }[]).reduce((acc, d) => {
      acc[d.lead_id] = (acc[d.lead_id] ?? 0) + (d.value_cents ?? 0);
      return acc;
    }, {} as Record<string, number>);
    topRecoverable = (leads ?? []).map((l: { id: string; name?: string; company?: string; state: string }) => ({
      ...l,
      estimated_value_cents: valueByLead[l.id] ?? DEFAULT_DEAL_VALUE_CENTS,
    })).sort((a: { estimated_value_cents: number }, b: { estimated_value_cents: number }) => b.estimated_value_cents - a.estimated_value_cents).slice(0, 3);
    recoverableRevenueCents = (topRecoverable as { estimated_value_cents: number }[]).reduce((s, l) => s + l.estimated_value_cents, 0);
  }

  const zoomConfigured = !!(process.env.ZOOM_CLIENT_ID && process.env.ENCRYPTION_KEY);

  return NextResponse.json({
    step,
    opportunities_found: current.opportunities_found ?? 0,
    simulated_actions_count: current.simulated_actions_count ?? 0,
    weekly_call_target: weeklyCallTarget,
    zoom_configured: zoomConfigured,
    zoom_connected: !!zoomAccount || (current.zoom_connected ?? false),
    zoom_webhook_verified: current.zoom_webhook_verified ?? false,
    activated_at: current.activated_at ?? null,
    ready_to_activate:
      (current.opportunities_found ?? 0) > 0 &&
      (current.simulated_actions_count ?? 0) >= 3 &&
      weeklyCallTarget != null &&
      weeklyCallTarget >= 1,
    top_recoverable_leads: topRecoverable,
    recoverable_revenue_cents: recoverableRevenueCents,
  });
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErrPost = await requireWorkspaceAccess(req, workspaceId);
  if (authErrPost) return authErrPost;

  let body: { action?: string; lead_id?: string; weekly_call_target?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const db = getDb();
  const action = body.action ?? "scan";

  if (action === "scan") {
    const { data: recoverableLeads } = await db
      .from("leads")
      .select("id, name, company, state")
      .eq("workspace_id", workspaceId)
      .in("state", ["REACTIVATE", "LOST", "CONTACTED", "ENGAGED", "QUALIFIED"])
      .order("last_activity_at", { ascending: false })
      .limit(10);

    const leadIds = (recoverableLeads ?? []).map((l: { id: string }) => l.id);
    const { data: deals } = leadIds.length
      ? await db.from("deals").select("lead_id, value_cents").in("lead_id", leadIds).neq("status", "lost")
      : { data: [] };

    const valueByLead = ((deals ?? []) as { lead_id: string; value_cents: number }[]).reduce(
      (acc, d) => {
        acc[d.lead_id] = (acc[d.lead_id] ?? 0) + (d.value_cents ?? 0);
        return acc;
      },
      {} as Record<string, number>
    );

    const scored = (recoverableLeads ?? [])
      .map((l: { id: string; name?: string; company?: string; state: string }) => ({
        ...l,
        estimated_value_cents: valueByLead[l.id] ?? DEFAULT_DEAL_VALUE_CENTS,
      }))
      .sort((a: { estimated_value_cents: number }, b: { estimated_value_cents: number }) => b.estimated_value_cents - a.estimated_value_cents);

    const top3 = scored.slice(0, 3);
    const recoverableRevenueCents = top3.reduce((s: number, l: { estimated_value_cents: number }) => s + l.estimated_value_cents, 0);

    await db.from("activation_states").upsert(
      {
        workspace_id: workspaceId,
        step: "opportunities",
        opportunities_found: scored.length,
        simulated_actions_count: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    return NextResponse.json({
      step: "opportunities",
      opportunities_found: scored.length,
      recoverable_revenue_cents: recoverableRevenueCents,
      top_recoverable_leads: top3,
      message: `Found ${scored.length} leads. Est. recoverable: $${(recoverableRevenueCents / 100).toLocaleString()}.`,
    });
  }

  if (action === "recover_now") {
    const leadId = body.lead_id as string | undefined;
    if (!leadId) return NextResponse.json({ error: "lead_id required" }, { status: 400 });
    const { data: lead } = await db.from("leads").select("id, workspace_id").eq("id", leadId).eq("workspace_id", workspaceId).maybeSingle();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    const { enqueue } = await import("@/lib/queue");
    await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
    return NextResponse.json({
      message: "Recovery triggered. Your team will process the lead.",
      lead_id: leadId,
    });
  }

  if (action === "simulate") {
    const { data: current } = await db
      .from("activation_states")
      .select("simulated_actions_count")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const count = ((current as { simulated_actions_count?: number })?.simulated_actions_count ?? 0) + 1;
    await db.from("activation_states").upsert(
      {
        workspace_id: workspaceId,
        step: count >= 3 ? "ready" : "simulate",
        simulated_actions_count: count,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    return NextResponse.json({
      step: count >= 3 ? "ready" : "simulate",
      simulated_actions_count: count,
      message: count >= 3 ? "3 actions simulated. Ready to activate." : `Simulated ${count} of 3 actions.`,
    });
  }

  if (action === "set_target") {
    const target = body.weekly_call_target as number | undefined;
    if (target == null || typeof target !== "number" || target < 1 || target > 100) {
      return NextResponse.json({ error: "weekly_call_target required (1-100)" }, { status: 400 });
    }
    await db.from("settings").upsert(
      { workspace_id: workspaceId, weekly_call_target: target, updated_at: new Date().toISOString() },
      { onConflict: "workspace_id" }
    );
    return NextResponse.json({
      weekly_call_target: target,
      message: `Target set: ${target} calls per week.`,
    });
  }

  if (action === "activate") {
    await db.from("activation_states").upsert(
      {
        workspace_id: workspaceId,
        step: "activated",
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    // Synthetic protection bootstrap removed - only show real activity

    const { sendActivationConfirmationEmail } = await import("@/lib/email/activation");
    sendActivationConfirmationEmail(workspaceId).catch((err) => { log("error", "[activation] error:", { error: err instanceof Error ? err.message : err }); });

    return NextResponse.json({
      step: "activated",
      activated_at: new Date().toISOString(),
      message: "Workspace activated. Protection is live.",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
