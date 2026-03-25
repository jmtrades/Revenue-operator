/**
 * POST /api/case-studies/generate
 * Auto-generates a case study draft from revenue recovered signals.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getRevenueRecovered } from "@/lib/analytics/revenue-recovered";

const BODY = z.object({
  // Optional override; default uses the active session workspace.
  workspace_id: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  // "month" is the default for dashboard-style reporting.
  range: z.enum(["month", "last_30_days"]).optional(),
});

function fmtMoney(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function startOfRange(now: Date, range: "month" | "last_30_days"): Date {
  if (range === "last_30_days") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const x = new Date(now);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const workspaceId = (parsed.data.workspace_id ?? session.workspaceId).trim();
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const now = new Date();
    const range: "month" | "last_30_days" = parsed.data.range ?? "month";
    const startDate = startOfRange(now, range);

    const db = getDb();
    const { data: wsRow } = await db
      .from("workspaces")
      .select("name, industry")
      .eq("id", workspaceId)
      .maybeSingle();

    const businessName = (wsRow as { name?: string | null } | null)?.name?.trim() || "Your business";
    const resolvedIndustry = (parsed.data.industry ?? (wsRow as { industry?: string | null } | null)?.industry ?? "").trim() || "your industry";

    const endDateIso = now.toISOString().slice(0, 10);
    const startDateIso = startDate.toISOString().slice(0, 10);

    const recovered = await getRevenueRecovered(workspaceId, startDateIso, endDateIso);
    const totalCents = recovered.total_revenue_recovered;

    // The analytics estimate uses a fixed recovery value per recovered interaction.
    const estimatedValuePerRecoveryCents = 75000; // $750 (see getRevenueRecovered)
    const recoveredInteractions = Math.max(0, Math.round(totalCents / estimatedValuePerRecoveryCents));

    const avoidedLeakageCents = totalCents > 0 ? totalCents * 2 : 0; // ~assumes recovery represents ~50% of average deal

    const callsRecoveredCount = Math.max(0, Math.round(recovered.calls_recovered_revenue / estimatedValuePerRecoveryCents));
    const noShowRecoveredCount = Math.max(0, Math.round(recovered.noshow_recovered_revenue / estimatedValuePerRecoveryCents));
    const reactivationCount = Math.max(0, Math.round(recovered.reactivation_revenue / estimatedValuePerRecoveryCents));

    const before = {
      missedCallsEstimate: avoidedLeakageCents > 0 ? Math.round(recoveredInteractions * 1.2) : 0,
      estimatedLeakage: fmtMoney(avoidedLeakageCents),
    };

    const after = {
      callsRecovered: callsRecoveredCount,
      noShowsRecovered: noShowRecoveredCount,
      reactivations: reactivationCount,
      revenueRecovered: fmtMoney(totalCents),
    };

    const timeline = `Setup → Live calls → Follow-up execution → Dashboard rollups (${startDateIso} to ${endDateIso})`;

    // Keep this as plain text for easy reuse in a card or export.
    const quote = `In ${resolvedIndustry}, we recovered ${after.revenueRecovered} by turning unanswered calls and no-shows into booked outcomes. ${after.callsRecovered} call recoveries, ${after.noShowsRecovered} no-show recoveries, and ${after.reactivations} reactivations moved the pipeline forward.`;

    return NextResponse.json({
      business_name: businessName,
      industry: resolvedIndustry,
      range: range === "month" ? "This month" : "Last 30 days",
      before,
      after,
      timeline,
      quote,
      raw: {
        calls_recovered_revenue_cents: recovered.calls_recovered_revenue,
        noshow_recovered_revenue_cents: recovered.noshow_recovered_revenue,
        reactivation_revenue_cents: recovered.reactivation_revenue,
        total_revenue_recovered_cents: recovered.total_revenue_recovered,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[case-studies/generate]", msg);
    return NextResponse.json({ error: "Failed to generate case study", details: msg }, { status: 500 });
  }
}

