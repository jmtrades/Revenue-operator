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

  const { data, error } = await db
    .from("message_approvals")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .select("id");

  const count = data?.length ?? 0;
  return NextResponse.json({ ok: !error, expired: count }, { status: 200 });
}
