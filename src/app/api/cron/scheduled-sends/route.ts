/**
 * Cron: enqueue SendMessage actions that are due (human presence delay elapsed).
 * Call every 1–2 min: GET /api/cron/scheduled-sends
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { enqueueExistingSendMessage } from "@/lib/action-queue/send-message";
import type { ActionCommand } from "@/lib/action-queue/types";

const BATCH = 20;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;
  const db = getDb();
  const now = new Date().toISOString();
  const { data: rows } = await db
    .from("action_commands")
    .select("id, workspace_id, lead_id, type, payload, dedup_key, attempt_count")
    .eq("type", "SendMessage")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH * 2);

  const due = (rows ?? []).filter((r: { attempt_count?: number; payload?: { send_at?: string } }) => {
    const at = (r.payload as { send_at?: string })?.send_at;
    return (r.attempt_count ?? 0) < 1 && at && at <= now;
  }).slice(0, BATCH);

  let enqueued = 0;
  for (const row of due) {
    const r = row as { id: string; workspace_id: string; lead_id: string; type: string; payload: unknown; dedup_key: string };
    const command: ActionCommand = {
      type: "SendMessage",
      workspace_id: r.workspace_id,
      lead_id: r.lead_id,
      payload: r.payload as ActionCommand["payload"],
      dedup_key: r.dedup_key,
    };
    await enqueueExistingSendMessage(r.id, command);
    enqueued++;
  }

  return NextResponse.json({ ok: true, enqueued, due: due.length });
}
