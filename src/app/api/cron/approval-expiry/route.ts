/**
 * Cron: mark message approvals pending > 48h as expired. No send_message emitted for expired.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";

const EXPIRY_HOURS = 48;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await db
      .from("message_approvals")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .select("id");

    if (error) {
      console.error("[approval-expiry] Database error:", error);
      return NextResponse.json({ ok: false, error: "Database error", expired: 0 }, { status: 200 });
    }

    const count = data?.length ?? 0;
    return NextResponse.json({ ok: true, expired: count }, { status: 200 });
  } catch (err) {
    console.error("[approval-expiry] Cron failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: "Cron failed", expired: 0 }, { status: 200 });
  }
}
