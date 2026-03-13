/**
 * Pause coverage: stops billing at period end, does not cancel immediately
 * Copy: "Pause protection" not "Cancel subscription"
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(req: NextRequest) {
  let body: { workspace_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

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
    } catch {
      // Stripe update failed; continue with pause
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

  // Absence moment: return factual statements only (no persuasion)
  let absence_statements: {
    what_would_fail: string[];
    recent_operation: string[];
    current_dependency: string[];
    if_disabled: string[];
  } = {
    what_would_fail: [],
    recent_operation: [],
    current_dependency: [],
    if_disabled: [],
  };
  try {
    const [getDisableImpactStatements, getRetentionInterceptPayload] = await Promise.all([
      import("@/lib/operational-perception/disable-impact").then((m) => m.getDisableImpactStatements),
      import("@/lib/operational-perception/retention-intercept").then((m) => m.getRetentionInterceptPayload),
    ]);
    const [disableImpact, retention] = await Promise.all([
      getDisableImpactStatements(workspaceId),
      getRetentionInterceptPayload(workspaceId),
    ]);
    const trim = (s: string) => (s.length > 90 ? s.slice(0, 90).trim() : s.trim());
    absence_statements = {
      what_would_fail: disableImpact.slice(0, 6).map(trim).filter(Boolean),
      recent_operation: retention.recent_operation.slice(0, 4).map(trim).filter(Boolean),
      current_dependency: retention.current_dependency.slice(0, 4).map(trim).filter(Boolean),
      if_disabled: retention.if_disabled.slice(0, 4).map(trim).filter(Boolean),
    };
  } catch {
    // Non-blocking
  }

  return NextResponse.json({
    success: true,
    message: "Protection paused. Coverage runs until period end. Resume anytime.",
    absence_statements,
  });
}
