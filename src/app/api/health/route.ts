/**
 * System health probe for hosting and self-monitoring. API only, no UI.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getCronHeartbeats } from "@/lib/runtime/cron-heartbeat";

export async function GET() {
  let database: "ok" | "fail" = "fail";
  try {
    const db = getDb();
    const { error } = await db.from("system_cron_heartbeats").select("job_name").limit(1);
    database = error ? "fail" : "ok";
  } catch {
    database = "fail";
  }

  const hasStripePrice =
    !!(
      process.env.STRIPE_DEFAULT_PRICE_ID ||
      process.env.STRIPE_PRICE_ID ||
      process.env.STRIPE_PRICE_SOLO_MONTH ||
      process.env.STRIPE_PRICE_SOLO_YEAR ||
      process.env.STRIPE_PRICE_GROWTH_MONTH ||
      process.env.STRIPE_PRICE_GROWTH_YEAR ||
      process.env.STRIPE_PRICE_TEAM_MONTH ||
      process.env.STRIPE_PRICE_TEAM_YEAR ||
      process.env.STRIPE_GROWTH_MONTHLY ||
      process.env.STRIPE_GROWTH_YEARLY ||
      process.env.STRIPE_TEAM_MONTHLY ||
      process.env.STRIPE_TEAM_YEARLY ||
      process.env.STRIPE_SOLO_MONTHLY ||
      process.env.STRIPE_SOLO_YEARLY
    );
  const stripe: "ok" | "missing" =
    !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && hasStripePrice)
      ? "ok"
      : "missing";

  let last_cron_execution: { commitment_recovery: string | null; settlement_export: string | null } = {
    commitment_recovery: null,
    settlement_export: null,
  };
  try {
    const heartbeats = await getCronHeartbeats();
    last_cron_execution = {
      commitment_recovery: heartbeats["commitment-recovery"] ?? null,
      settlement_export: heartbeats["settlement-export"] ?? null,
    };
  } catch {
    // leave nulls
  }

  const system_ready = database === "ok";
  const status = system_ready ? "ok" : "degraded";

  return NextResponse.json({
    ok: system_ready,
    status,
    database,
    stripe,
    last_cron_execution,
    system_ready,
  });
}
