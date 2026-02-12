/**
 * Pause coverage: stops billing at period end, does not cancel immediately
 * Copy: "Pause protection" not "Cancel subscription"
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  let body: { workspace_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("stripe_subscription_id, status")
    .eq("id", workspaceId)
    .single();

  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const subId = (ws as { stripe_subscription_id?: string | null }).stripe_subscription_id;

  if (subId && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    } catch (e) {
      console.error("[pause-coverage]", e);
    }
  }

  await db
    .from("workspaces")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
      pause_reason: "User paused protection",
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  return NextResponse.json({
    success: true,
    message: "Protection paused. Coverage runs until period end. Resume anytime.",
  });
}
