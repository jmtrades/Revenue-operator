import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reportUsageOverage } from "@/lib/billing/overage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: true, skipped: "stripe_not_configured" });
  }
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, billing_status, billing_tier, stripe_subscription_id")
    .eq("billing_status", "active");

  for (const ws of workspaces || []) {
    if (!ws.stripe_subscription_id) continue;

    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data: calls } = await supabase
      .from("call_sessions")
      .select("duration_seconds, started_at")
      .eq("workspace_id", ws.id)
      .gte("started_at", periodStart.toISOString());

    const totalMinutes = Math.ceil(
      (calls || []).reduce(
        (sum, c) => sum + ((c as { duration_seconds?: number }).duration_seconds || 0),
        0
      ) / 60
    );

    const PLAN_MINUTES: Record<string, number> = {
      solo: 400,
      growth: 1500,
      team: 5000,
      enterprise: 50000,
    };
    const included = PLAN_MINUTES[ws.billing_tier] || 400;

    if (totalMinutes > included) {
      await reportUsageOverage(ws.id, ws.stripe_subscription_id, ws.billing_tier, totalMinutes, included);
    }
  }

  return NextResponse.json({ ok: true });
}

