/**
 * GET /api/internal/founder/export
 * Founder-only export. Allowlisted fields only. No Stripe IDs, secrets, tokens, stack traces, internal IDs (except workspace id).
 * Includes last_cron_cycle_at from system_cron_heartbeats (bounded).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

const FOUNDER_KEY = process.env.FOUNDER_EXPORT_KEY ?? "";

function assertFounderAuth(request: NextRequest): NextResponse | null {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-founder-key");
  if (!token || token !== FOUNDER_KEY || !FOUNDER_KEY) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  return null;
}

const WORKSPACE_ALLOWLIST = ["id", "name", "created_at"] as const;

export async function GET(request: NextRequest) {
  const authErr = assertFounderAuth(request);
  if (authErr) return authErr;

  const db = getDb();

  const { data: heartbeats } = await db
    .from("system_cron_heartbeats")
    .select("job_name, last_ran_at")
    .eq("job_name", "core")
    .limit(1)
    .maybeSingle();

  const last_cron_cycle_at =
    (heartbeats as { last_ran_at?: string } | null)?.last_ran_at ?? null;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [rateCeilingRow, executorRow, anomalyRow] = await Promise.all([
    db
      .from("operational_ledger")
      .select("id")
      .eq("event_type", "rate_ceiling_triggered")
      .gte("occurred_at", twentyFourHoursAgo)
      .limit(1)
      .maybeSingle(),
    db
      .from("executor_heartbeats")
      .select("id")
      .gte("last_seen_at", twentyFourHoursAgo)
      .limit(1)
      .maybeSingle(),
    db
      .from("operational_ledger")
      .select("id")
      .eq("severity", "warning")
      .gte("occurred_at", twentyFourHoursAgo)
      .limit(1)
      .maybeSingle(),
  ]);

  const rate_ceiling = !!(rateCeilingRow as { id?: string } | null)?.id;
  const external_execution = !!(executorRow as { id?: string } | null)?.id;
  const anomaly = !!(anomalyRow as { id?: string } | null)?.id;

  const { data: workspaces } = await db
    .from("workspaces")
    .select(WORKSPACE_ALLOWLIST.join(", "))
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = Array.isArray(workspaces) ? workspaces : [];
  const safeWorkspaces = rows.map((w: unknown) => {
    const out: Record<string, unknown> = {};
    const rec = w && typeof w === "object" && !("error" in w) ? (w as Record<string, unknown>) : {};
    for (const key of WORKSPACE_ALLOWLIST) {
      if (Object.prototype.hasOwnProperty.call(rec, key)) out[key] = rec[key];
    }
    return out;
  });

  return NextResponse.json({
    ok: true,
    last_cron_cycle_at,
    anomaly,
    external_execution,
    rate_ceiling,
    workspaces: safeWorkspaces,
    exported_at: new Date().toISOString(),
  });
}
