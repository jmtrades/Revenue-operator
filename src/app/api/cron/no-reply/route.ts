/**
 * No-reply timeout job (run via cron)
 * Finds leads that haven't replied and transitions to REACTIVATE
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { processEvent } from "@/lib/event-engine";
import { scheduleReactivationAttempts } from "@/lib/reactivation/engine";
import { enqueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getDb();

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);
    const cutoffIso = cutoff.toISOString();

    const { data: stale } = await db
      .from("leads")
      .select("id, state, workspace_id")
      .in("state", ["CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED"])
      .lt("last_activity_at", cutoffIso);

    let transitioned = 0;
    for (const lead of stale ?? []) {
      const l = lead as { id: string; workspace_id: string; state: string };
      const decision = processEvent({
        workspaceId: l.workspace_id,
        leadId: l.id,
        eventType: "no_reply_timeout",
        entityType: "lead",
        entityId: l.id,
        payload: {},
        triggerSource: "cron",
        currentState: l.state as "CONTACTED" | "ENGAGED" | "QUALIFIED" | "BOOKED",
      });

      if (decision.transitionOccurred) {
        await db.from("leads").update({
          state: decision.newState,
          updated_at: new Date().toISOString(),
        }).eq("id", l.id);

        await db.from("automation_states").upsert({
          lead_id: l.id,
          state: decision.newState,
          allowed_actions: decision.allowedActions,
          last_event_type: "no_reply_timeout",
          last_event_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "lead_id" });

        await db.from("events").insert({
          workspace_id: l.workspace_id,
          event_type: "no_reply_timeout",
          entity_type: "lead",
          entity_id: l.id,
          payload: { decision },
          trigger_source: "cron",
        });

        if (decision.newState === "REACTIVATE") {
          await enqueue({ type: "reactivation", leadId: l.id });
        }
        transitioned++;
      }
    }

    const scheduled = await scheduleReactivationAttempts();
    return NextResponse.json({ ok: true, transitioned, scheduled });
  } catch (err) {
    console.error("No-reply cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
