/**
 * Billing status for workspace
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("billing_status, protection_renewal_at, stripe_customer_id, stripe_subscription_id, created_at, status, pause_reason")
    .eq("id", workspaceId)
    .single();

  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const row = ws as {
    billing_status?: string | null;
    protection_renewal_at?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    created_at?: string;
    status?: string | null;
    pause_reason?: string | null;
  };

  const trialEnd = row.protection_renewal_at
    ? new Date(row.protection_renewal_at)
    : row.created_at
      ? new Date(new Date(row.created_at).getTime() + 14 * 24 * 60 * 60 * 1000)
      : null;

  const isPaused = row.billing_status === "trial_ended" || row.pause_reason || (row.billing_status === "trial" && trialEnd && new Date(trialEnd) < new Date());
  let has_upcoming_booking_24h = false;
  if (isPaused) {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { count } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", now.toISOString())
      .lt("call_started_at", in24h.toISOString());
    has_upcoming_booking_24h = (count ?? 0) > 0;
  }

  return NextResponse.json({
    billing_status: row.billing_status ?? "trial",
    renewal_at: row.protection_renewal_at ?? trialEnd?.toISOString() ?? null,
    stripe_customer_id: row.stripe_customer_id,
    has_subscription: Boolean(row.stripe_subscription_id),
    has_upcoming_booking_24h: has_upcoming_booking_24h,
  });
}
