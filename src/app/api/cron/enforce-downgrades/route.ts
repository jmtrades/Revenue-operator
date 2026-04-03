/**
 * GET /api/cron/enforce-downgrades — Apply pending plan downgrades.
 *
 * Runs daily. Checks for workspaces where pending_billing_effective_at has passed
 * and applies the pending_billing_tier. This is a safety net — the primary mechanism
 * is the Stripe webhook (invoice.payment_succeeded), but this cron catches edge cases
 * like free-tier downgrades where no Stripe event fires.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { tierToDbValue } from "@/lib/billing-plans";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  // Find workspaces with pending downgrades that should take effect
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, pending_billing_tier, pending_billing_effective_at, billing_tier")
    .not("pending_billing_tier", "is", null)
    .not("pending_billing_effective_at", "is", null)
    .lte("pending_billing_effective_at", now);

  if (!workspaces || workspaces.length === 0) {
    return NextResponse.json({ ok: true, applied: 0 });
  }

  let applied = 0;
  const errors: string[] = [];

  for (const ws of workspaces) {
    const row = ws as {
      id: string;
      pending_billing_tier: string;
      pending_billing_effective_at: string;
      billing_tier?: string;
    };

    try {
      const newTier = row.pending_billing_tier;

      // Apply the downgrade
      const { error: updateErr } = await db
        .from("workspaces")
        .update({
          billing_tier: newTier,
          pending_billing_tier: null,
          pending_billing_effective_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updateErr) {
        errors.push(`${row.id}: ${updateErr.message}`);
        continue;
      }

      // Update workspace_billing table to stay in sync
      try {
        await db.from("workspace_billing").update({
          plan: newTier,
          updated_at: new Date().toISOString(),
        }).eq("workspace_id", row.id);
      } catch { /* non-fatal */ }

      log("info", "cron.enforce_downgrades.applied", {
        workspace_id: row.id,
        from_tier: row.billing_tier,
        to_tier: newTier,
        effective_at: row.pending_billing_effective_at,
      });

      applied++;
    } catch (err) {
      errors.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    applied,
    total: workspaces.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
