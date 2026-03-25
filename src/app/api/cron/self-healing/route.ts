/**
 * Cron: self-healing execution layer.
 * - Retry failed outbound via new intents.
 * - Escalate to human after repeated voice failures.
 * All operations are deterministic and append-only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { createActionIntent } from "@/lib/action-intents";

const BATCH_SIZE = 50;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();

  // 1. Retry failed outbound (send_message and place_outbound_call).
  const { data: failed } = await db
    .from("action_intents")
    .select("id, workspace_id, thread_id, work_unit_id, intent_type, created_at, result_status")
    .in("intent_type", ["send_message", "place_outbound_call"])
    .eq("result_status", "failed")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  let retriesEmitted = 0;
  const voiceFailureCount = new Map<string, number>();

  for (const row of failed ?? []) {
    const r = row as {
      id: string;
      workspace_id: string;
      thread_id: string | null;
      work_unit_id: string | null;
      intent_type: string;
    };

    if (r.intent_type === "place_outbound_call") {
      const key = `${r.workspace_id}:${r.thread_id ?? r.work_unit_id ?? ""}`;
      voiceFailureCount.set(key, (voiceFailureCount.get(key) ?? 0) + 1);
    }

    try {
      await createActionIntent(r.workspace_id, {
        threadId: r.thread_id ?? null,
        workUnitId: r.work_unit_id ?? null,
        intentType: "pause_execution",
        payload: {
          reason: "retry_after_failure",
          original_intent_id: r.id,
          orientation_line: "Execution is retrying after a failed attempt.",
        },
        dedupeKey: `selfheal:retry:${r.id}`,
      });
      retriesEmitted++;
    } catch {
      // de-duplication or DB error; safe to ignore
    }
  }

  // 2. Escalate to human when voice has failed repeatedly for a given context.
  let escalationsEmitted = 0;
  for (const [key, count] of voiceFailureCount.entries()) {
    if (count < 2) continue;
    const [workspace_id] = key.split(":");
    try {
      await createActionIntent(workspace_id, {
        threadId: null,
        workUnitId: null,
        intentType: "escalate_to_human",
        payload: {
          reason: "voice_failed_twice",
          orientation_line: "Voice execution has failed more than once; human review requested.",
        },
        dedupeKey: `selfheal:escalate:${key}`,
      });
      escalationsEmitted++;
    } catch {
      // de-duplication or DB error; safe to ignore
    }
  }

  return NextResponse.json(
    {
      ok: true,
      retries_emitted: retriesEmitted,
      escalations_emitted: escalationsEmitted,
    },
    { status: 200 }
  );
}

