/**
 * GET /api/customers/health?workspace_id=...
 * Returns churn risk score + drivers (heuristic).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { BILLING_PLANS, type PlanSlug, normalizeTier } from "@/lib/billing-plans";
import { log } from "@/lib/logger";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function daysBetween(earlierIso: string | null | undefined): number | null {
  if (!earlierIso) return null;
  const t = new Date(earlierIso).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = Date.now() - t;
  return diff / (24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceIdRaw = req.nextUrl.searchParams.get("workspace_id") ?? session.workspaceId;
  const workspaceId = z.string().min(1).safeParse(workspaceIdRaw).success ? (workspaceIdRaw as string) : null;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [{ data: ws }, { data: calls }, { data: appts }, { data: leads }, { data: lastLead }] = await Promise.all([
      db
        .from("workspaces")
        .select("billing_status, billing_tier, status, pause_reason, trial_ends_at")
        .eq("id", workspaceId)
        .maybeSingle(),
      db
        .from("call_sessions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("call_started_at", start.toISOString())
        .not("call_ended_at", "is", null),
      db
        .from("appointments")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("created_at", start.toISOString())
        .in("status", ["confirmed", "completed", "no_show"]),
      db
        .from("leads")
        .select("id, last_activity_at, created_at, state")
        .eq("workspace_id", workspaceId)
        .gte("created_at", start.toISOString()),
      db
        .from("leads")
        .select("last_activity_at")
        .eq("workspace_id", workspaceId)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const wsRow = ws as
      | {
          billing_status?: string | null;
          billing_tier?: string | null;
          status?: string | null;
          pause_reason?: string | null;
          trial_ends_at?: string | null;
        }
      | null;

    const callsCount = Array.isArray(calls) ? calls.length : 0;
    const apptsCount = Array.isArray(appts) ? appts.length : 0;
    const conversion = callsCount > 0 ? apptsCount / callsCount : 0;

    const inactivityDays =
      daysBetween((lastLead as { last_activity_at?: string | null } | null)?.last_activity_at ?? null) ?? 999;

    const leadsRecent = Array.isArray(leads) ? leads.length : 0;

    const tier = normalizeTier(wsRow?.billing_tier);
    const includedMinutes = BILLING_PLANS[tier]?.includedMinutes ?? 1000;

    // Minutes pressure as a "usage vs expectation" signal.
    const { data: sessions } = await db
      .from("call_sessions")
      .select("call_started_at, call_ended_at")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", start.toISOString());

    const minutesUsed = Math.ceil(
      (sessions ?? []).reduce((sum: number, s: { call_started_at: string; call_ended_at?: string | null }) => {
        const st = new Date(s.call_started_at).getTime();
        const en = s.call_ended_at ? new Date(s.call_ended_at).getTime() : st;
        return sum + Math.max(0, (en - st) / 60000);
      }, 0)
    );

    const billingPaused =
      wsRow?.pause_reason ||
      wsRow?.status === "paused" ||
      wsRow?.billing_status === "trial_ended" ||
      wsRow?.billing_status === "cancelled" ||
      wsRow?.billing_status === "payment_failed" ||
      wsRow?.billing_status === "expired";

    // Heuristic risk model (0..100).
    //  - Conversion penalty: low appointment rate increases churn risk.
    //  - Inactivity penalty: long recency gap increases churn risk.
    //  - Billing penalty: paused/expired adds risk.
    //  - Usage pressure: sustained under-usage relative to expectations adds risk.
    const conversionPenalty = callsCount > 0 ? (1 - conversion) : 0.85;
    const activityPenalty = clamp(inactivityDays / 30, 0, 1);
    const billingPenalty = billingPaused ? 1 : 0;
    const usagePenalty = includedMinutes > 0 ? clamp((includedMinutes - minutesUsed) / includedMinutes, 0, 1) : 0;

    const riskScore = clamp(Math.round((conversionPenalty * 0.45 + activityPenalty * 0.30 + billingPenalty * 0.20 + usagePenalty * 0.05) * 100), 0, 100);

    const label = riskScore >= 70 ? "high" : riskScore >= 35 ? "medium" : "low";

    return NextResponse.json({
      workspace_id: workspaceId,
      risk_score: riskScore,
      risk_label: label,
      drivers: {
        conversion_rate_estimate: conversion,
        inactivity_days: inactivityDays,
        recent_leads_last_30_days: leadsRecent,
        minutes_used_last_30_days: minutesUsed,
        billing_status: wsRow?.billing_status ?? null,
        billing_tier: wsRow?.billing_tier ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "[customers/health]", { error: msg });
    return NextResponse.json({ error: "Failed to compute customer health", details: msg }, { status: 500 });
  }
}

