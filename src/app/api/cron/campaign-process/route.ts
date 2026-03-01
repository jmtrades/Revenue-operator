/**
 * Campaign execution: process active campaigns (stub — increment called or enqueue outbound).
 * Add to core cron to run periodically.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;
  const db = getDb();
  let processed = 0;
  try {
    const { data: active } = await db.from("campaigns").select("id, workspace_id, total_contacts, called").eq("status", "active").limit(20);
    for (const c of active ?? []) {
      const row = c as { id: string; total_contacts: number; called: number };
      if (row.called < row.total_contacts) {
        await db.from("campaigns").update({ called: row.called + 1, updated_at: new Date().toISOString() }).eq("id", row.id);
        processed++;
      }
    }
  } catch {
    // campaigns table may not exist
  }
  return NextResponse.json({ ok: true, processed });
}
