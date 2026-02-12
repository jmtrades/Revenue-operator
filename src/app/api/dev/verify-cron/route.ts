/**
 * Cron health verification endpoint
 * Tests queue processor, no-reply job, and trial reminders
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { burstDrain } from "@/lib/queue/burst-drain";
import { getDb } from "@/lib/db/queries";

const DEV_SIM_SECRET = process.env.DEV_SIM_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${DEV_SIM_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, "ok" | "error"> = {};

  // Test queue processor
  try {
    await burstDrain();
    results.queue = "ok";
  } catch (error) {
    console.error("[verify-cron] Queue failed", error);
    results.queue = "error";
  }

  // Test no-reply job (simulate)
  try {
    const db = getDb();
    const { error } = await db
      .from("leads")
      .select("id")
      .limit(1);
    if (error) throw error;
    results.noReply = "ok";
  } catch (error) {
    console.error("[verify-cron] No-reply check failed", error);
    results.noReply = "error";
  }

  // Test trial reminder logic (simulate)
  try {
    const db = getDb();
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const { error } = await db
      .from("workspaces")
      .select("id, renews_at")
      .eq("billing_status", "trial")
      .not("renews_at", "is", null)
      .gte("renews_at", threeDaysFromNow.toISOString())
      .limit(1);
    if (error && error.code !== "PGRST116") throw error;
    results.reminders = "ok";
  } catch (error) {
    console.error("[verify-cron] Reminders check failed", error);
    results.reminders = "error";
  }

  const allOk = Object.values(results).every((v) => v === "ok");

  return NextResponse.json({
    ...results,
    status: allOk ? "ok" : "partial",
  });
}
