/**
 * No-reply timeout job (run via cron)
 * Finds leads that haven't replied and transitions to REACTIVATE
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { processEvent } from "@/lib/event-engine";

export const dynamic = "force-dynamic";

// Auth: use CRON_SECRET in production
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
    // Find leads inactive for 3+ days in CONTACTED/ENGAGED/QUALIFIED/BOOKED
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);
    const cutoffIso = cutoff.toISOString();

    const { data: stale } = await db
      .from("leads")
      .select("id, state, workspace_id")
      .in("state", ["CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED"])
      .lt("last_activity_at", cutoffIso);

    if (!stale?.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;
    for (const lead of stale) {
      const decision = processEvent({
        workspaceId: lead.workspace_id,
        leadId: lead.id,
        eventType: "no_reply_timeout",
        entityType: "lead",
        entityId: lead.id,
        payload: {},
        triggerSource: "cron",
        currentState: lead.state as "CONTACTED" | "ENGAGED" | "QUALIFIED" | "BOOKED",
      });

      if (decision.transitionOccurred) {
        await db.from("leads").update({
          state: decision.newState,
          updated_at: new Date().toISOString(),
        }).eq("id", lead.id);

        await db.from("automation_states").upsert({
          lead_id: lead.id,
          state: decision.newState,
          allowed_actions: decision.allowedActions,
          last_event_type: "no_reply_timeout",
          last_event_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "lead_id" });

        await db.from("events").insert({
          workspace_id: lead.workspace_id,
          event_type: "no_reply_timeout",
          entity_type: "lead",
          entity_id: lead.id,
          payload: { decision },
          trigger_source: "cron",
        });

        processed++;
      }
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("No-reply cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
