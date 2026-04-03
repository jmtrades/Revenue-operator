/**
 * Billing status for dashboard. Plan name, interval, status, renewal.
 * No upsell. No comparison.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const PLAN_NAMES: Record<string, string> = {
  solo: "Starter",
  business: "Growth",
  scale: "Business",
  enterprise: "Agency",
};

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();
    const { data: row } = await db
      .from("workspaces")
      .select("billing_tier, billing_interval, billing_status, renews_at, stripe_customer_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ error: "workspace not found" }, { status: 404 });
    }

    const r = row as {
      billing_tier?: string;
      billing_interval?: string;
      billing_status?: string;
      renews_at?: string | null;
      stripe_customer_id?: string | null;
    };

    const planName = PLAN_NAMES[r.billing_tier ?? "solo"] ?? r.billing_tier ?? "Starter";
    const interval = r.billing_interval === "year" ? "year" : "month";
    const status = r.billing_status ?? "pending";

    return NextResponse.json({
      plan_name: planName,
      interval,
      status,
      renews_at: r.renews_at ?? null,
      can_manage: !!r.stripe_customer_id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
