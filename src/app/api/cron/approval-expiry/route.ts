/**
 * Cron: mark message approvals pending > 48h as expired. No send_message emitted for expired.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

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
      log("error", "approval_expiry.db_error", { error: error.message });
      return NextResponse.json({ ok: false, error: "Database error", expired: 0 }, { status: 500 });
    }

    const count = data?.length ?? 0;
    return NextResponse.json({ ok: true, expired: count }, { status: 200 });
  } catch (err) {
    log("error", "approval_expiry.cron_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: "Cron failed", expired: 0 }, { status: 500 });
  }
}
