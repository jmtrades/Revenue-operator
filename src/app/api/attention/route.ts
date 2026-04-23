/**
 * Daily Attention List
 * "Who requires attention today" — ranks leads by impact on revenue outcome.
 * Visible immediately on dashboard load. System prioritizes; user does not decide.
 *
 * Scoring is delegated to the revenue-core `planActions` composer so we get:
 *   - Monetized (value × readiness) impact in Money minor units
 *   - Deterministic, stable ActionIds (same lead on same day → same id)
 *   - Cross-category dedup on (category, accountId, dealId)
 *   - Severity-aware capacity enforcement (critical items bypass owner cap 2x)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { DEFAULT_DEAL_VALUE_CENTS } from "@/lib/constants";
import { computeReadiness, persistReadiness } from "@/lib/readiness/engine";
import { authorizeOrg } from "@/lib/auth/authorize-org";
import { log } from "@/lib/logger";
import { planActions, type RawAction } from "@/lib/revenue-core/action-planner";
import { moneyMajor } from "@/lib/revenue-core/primitives";

type LeadRow = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  state?: string;
  last_activity_at?: string;
};

type DealRow = { id: string; lead_id: string; value_cents?: number };

/**
 * Map a readiness score (0..100) to a revenue-core severity. High readiness
 * means the lead is hot → dropping them today costs real money → critical.
 * Cold leads still need a touch, but are better classified as warning/info.
 */
function readinessToSeverity(score: number): RawAction["severity"] {
  if (score >= 70) return "critical";
  if (score >= 50) return "warning";
  return "info";
}

function consequenceFor(score: number): string {
  if (score >= 70) return "High value — prioritize today";
  if (score >= 50) return "Ready for next step — don't delay";
  if (score >= 30) return "Momentum at risk — follow-up needed";
  return "Conversation will go cold without touch";
}

function confidenceFor(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function bestTimingFor(lastActivityAt: string | undefined): Date {
  const hoursSince = lastActivityAt
    ? (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60)
    : 999;
  const ts = new Date();
  if (hoursSince > 72) ts.setMinutes(ts.getMinutes() + 30);
  else if (hoursSince > 24) ts.setHours(ts.getHours() + 2);
  else ts.setHours(ts.getHours() + 4);
  return ts;
}

function displayName(l: LeadRow): string {
  return l.company?.trim() || l.name?.trim() || l.email?.trim() || l.id;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const auth = await authorizeOrg(req, workspaceId, "viewer");
  if (!auth.ok) return auth.response;

  try {
  const db = getDb();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Check cache first
  const { data: cached } = await db
    .from("daily_attention")
    .select("lead_id, deal_id, rank, readiness_score, consequence_if_ignored, best_action_timing, confidence_level")
    .eq("workspace_id", workspaceId)
    .eq("attention_date", todayStr)
    .order("rank", { ascending: true })
    .limit(20);

  if (cached && cached.length > 0) {
    const leadIds = cached.map((c: { lead_id: string }) => c.lead_id);
    const { data: leads } = leadIds.length
      ? await db
          .from("leads")
          .select("id, name, email, company, state")
          .in("id", leadIds)
      : { data: [] };
    const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string; state?: string }[]).reduce(
      (acc, l) => { acc[l.id] = l; return acc; },
      {} as Record<string, { name?: string; email?: string; company?: string; state?: string }>
    );
    return NextResponse.json({
      attention: cached.map((c: { lead_id: string; deal_id?: string; rank: number; readiness_score: number; consequence_if_ignored?: string; best_action_timing?: string; confidence_level?: string }) => ({
        ...c,
        lead: leadMap[c.lead_id],
      })),
      generated_at: todayStr,
    });
  }

  // Generate list: active leads + deals, ranked by readiness * value
  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id, value_cents")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const { data: activeLeads } = await db
    .from("leads")
    .select("id, name, email, company, state, last_activity_at")
    .eq("workspace_id", workspaceId)
    .in("state", ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "REACTIVATE"])
    .eq("opt_out", false)
    .order("last_activity_at", { ascending: false })
    .limit(50);

  // Per-lead side-context we need AFTER planActions has ranked/dropped items.
  // Keyed by accountId so we can stitch it back to PlannedAction.accountId.
  const sideCtx = new Map<
    string,
    {
      dealId?: string;
      readiness: number;
      consequence: string;
      bestTiming: Date;
      confidence: "high" | "medium" | "low";
    }
  >();

  const raw: RawAction[] = [];

  for (const lead of (activeLeads ?? []) as LeadRow[]) {
    const deal = ((deals ?? []) as DealRow[]).find((d) => d.lead_id === lead.id);
    const valueCents = deal?.value_cents ?? DEFAULT_DEAL_VALUE_CENTS;

    const readiness = await computeReadiness(workspaceId, lead.id, deal?.id);
    const score = readiness.conversation_readiness_score;
    const consequence = consequenceFor(score);
    const bestTiming = bestTimingFor(lead.last_activity_at);
    const confidence = confidenceFor(score);

    sideCtx.set(lead.id, {
      dealId: deal?.id,
      readiness: score,
      consequence,
      bestTiming,
      confidence,
    });

    // Expected impact = deal value × readiness (how much revenue we protect
    // by touching them today). This gives a dollar-denominated priority that
    // is directly comparable across leads with different deal sizes.
    const expectedImpactMajor = (valueCents / 100) * (score / 100);

    raw.push({
      category: "attention",
      role: "sdr",
      accountId: lead.id,
      dealId: deal?.id,
      title: `Attend to ${displayName(lead)}`,
      why: consequence,
      severity: readinessToSeverity(score),
      expectedImpactMajor,
      expectedImpactCurrency: "USD",
      estimatedMinutes: 15,
      source: "daily_attention",
    });

    await persistReadiness(workspaceId, readiness);
  }

  // 20 items @ 15min = 300min. Set perOwnerMinutes to 480 so the unassigned
  // bucket can absorb the full window; maxTotalActions caps the list at 20.
  const plan = planActions(raw, {
    orgId: workspaceId,
    asOfIso: new Date().toISOString(),
    perOwnerMinutes: 480,
    maxTotalActions: 20,
    reportingCurrency: "USD",
  });

  // Persist + shape the cache rows from the planned (capped, sorted) list.
  for (let i = 0; i < plan.actions.length; i++) {
    const a = plan.actions[i];
    if (!a) continue;
    const accountId = a.accountId;
    if (!accountId) continue;
    const ctx = sideCtx.get(accountId);
    if (!ctx) continue;

    // Persist only columns known to exist in daily_attention. The richer
    // revenue-core fields (action_id, expected_impact_usd) are surfaced in
    // the API response but not cached — cache is stale-tolerant and adding
    // columns would require a migration we haven't shipped here.
    await db.from("daily_attention").upsert(
      {
        workspace_id: workspaceId,
        attention_date: todayStr,
        lead_id: accountId,
        deal_id: ctx.dealId ?? null,
        rank: i + 1,
        readiness_score: ctx.readiness,
        consequence_if_ignored: ctx.consequence,
        best_action_timing: ctx.bestTiming.toISOString(),
        confidence_level: ctx.confidence,
      },
      { onConflict: "workspace_id,attention_date,lead_id" }
    );
  }

  const leadMap = ((activeLeads ?? []) as LeadRow[]).reduce(
    (acc, l) => {
      acc[l.id] = l;
      return acc;
    },
    {} as Record<string, LeadRow>,
  );

  return NextResponse.json({
    attention: plan.actions.map((a, i) => {
      const accountId = a.accountId ?? "";
      const ctx = sideCtx.get(accountId);
      return {
        action_id: a.actionId,
        lead_id: accountId,
        deal_id: ctx?.dealId,
        rank: i + 1,
        readiness_score: ctx?.readiness ?? 0,
        consequence_if_ignored: ctx?.consequence ?? a.why,
        best_action_timing: (ctx?.bestTiming ?? new Date()).toISOString(),
        confidence_level: ctx?.confidence ?? "low",
        severity: a.severity,
        expected_impact_usd: moneyMajor(a.expectedImpact),
        lead: leadMap[accountId],
      };
    }),
    plan_summary: {
      total_expected_impact_usd: moneyMajor(plan.totalExpectedImpact),
      dropped_due_to_capacity: plan.droppedDueToCapacity.length,
      deduplicated_count: plan.deduplicatedCount,
    },
    generated_at: todayStr,
  });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("error", "attention.generation_failed", { error: errMsg });
    return NextResponse.json({ error: "Failed to generate attention list" }, { status: 500 });
  }
}
