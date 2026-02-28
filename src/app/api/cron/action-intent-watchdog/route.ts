/**
 * Cron: action intent watchdog. Claimed but not completed within threshold → emit escalate_to_human.
 * Never leave intents hanging.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { createActionIntent } from "@/lib/action-intents";

const STALLED_THRESHOLD_MINUTES = 15;
const BATCH_SIZE = 20;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const threshold = new Date(Date.now() - STALLED_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  const { data: stalled } = await db
    .from("action_intents")
    .select("id, workspace_id, thread_id, work_unit_id, intent_type, created_at, claimed_at")
    .not("claimed_at", "is", null)
    .is("completed_at", null)
    .lt("claimed_at", threshold)
    .order("claimed_at", { ascending: true })
    .limit(BATCH_SIZE);

  let emitted = 0;
  for (const row of stalled ?? []) {
    const r = row as { id: string; workspace_id: string; thread_id: string | null; work_unit_id: string | null };
    try {
      await createActionIntent(r.workspace_id, {
        threadId: r.thread_id ?? null,
        workUnitId: r.work_unit_id ?? null,
        intentType: "escalate_to_human",
        payload: {
          reason: "intent_stalled",
          stalled_intent_id: r.id,
          workspace_id: r.workspace_id,
          orientation_line: "An action intent did not complete within the allowed window.",
        },
        dedupeKey: `watchdog:stalled:${r.id}`,
      });
      emitted++;
    } catch {
      // dedupe or DB error; skip
    }
  }

  return NextResponse.json({ ok: true, stalled: (stalled ?? []).length, emitted }, { status: 200 });
}
