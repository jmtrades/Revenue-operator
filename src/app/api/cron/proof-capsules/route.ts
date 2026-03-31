/**
 * GET /api/cron/proof-capsules
 * Daily: build yesterday's proof capsule for each active workspace and store.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { buildProofCapsuleForPeriod, saveProofCapsule } from "@/lib/proof-capsule-period";
import { recordCronHeartbeat, assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const { data: workspaces } = await db.from("workspaces").select("id");
  const ids = (workspaces ?? []).map((r: { id: string }) => r.id);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const periodStart = new Date(yesterday);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(yesterday);
  periodEnd.setHours(23, 59, 59, 999);

  const { recomputeInstitutionalState } = await import("@/lib/institutional-state");
  for (const workspaceId of ids) {
    try {
      const lines = await buildProofCapsuleForPeriod(workspaceId, periodStart, periodEnd);
      if (lines.length > 0) {
        await saveProofCapsule(workspaceId, periodStart, periodEnd, lines);
      }
      await recomputeInstitutionalState(workspaceId).catch(() => {
        // Error in institutional state computation (details omitted to protect PII)
      });
    } catch {
      // skip
    }
  }

  await recordCronHeartbeat("proof-capsules").catch(() => {
    // Error recording cron heartbeat (details omitted to protect PII)
  });
  return NextResponse.json({ ok: true });
}
