/**
 * Call coaching summary: what worked, missed signals, recommended next step
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callId } = await params;
    const db = getDb();

  const { data: session } = await db
    .from("call_sessions")
    .select("id, lead_id, transcript, outcome, current_node")
    .eq("id", callId)
    .single();

  if (!session) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const { data: existing } = await db
    .from("call_coaching")
    .select("what_worked, missed_signals, recommended_next_step")
    .eq("call_session_id", callId)
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  const s = session as { lead_id: string; transcript?: unknown[]; outcome?: string; current_node?: string };
  const transcriptText = Array.isArray(s.transcript)
    ? (s.transcript as Array<{ role?: string; content?: string }>)
        .map((t) => `${t.role ?? "unknown"}: ${t.content ?? ""}`)
        .join("\n")
    : "";

  const { data: lead } = await db.from("leads").select("state, company").eq("id", s.lead_id).single();
  const _state = (lead as { state?: string })?.state ?? "unknown";

  const whatWorked = s.outcome === "booked" || s.outcome === "qualified"
    ? "Clear qualification and next-step agreement."
    : s.current_node === "routing"
      ? "Reached routing; good progression through dialogue."
      : "Call progressed to discovery.";

  const missedSignals = transcriptText.length < 100
    ? "Limited transcript—ensure recording/capture is active."
    : "Review transcript for buying signals or objections.";

  const recommendedNextStep =
    s.outcome === "booked"
      ? "Send confirmation and prep materials."
      : s.outcome === "qualified"
        ? "Follow up with proposal or booking link."
        : "Schedule follow-up call or send value content.";

  await db.from("call_coaching").insert({
    call_session_id: callId,
    what_worked: whatWorked,
    missed_signals: missedSignals,
    recommended_next_step: recommendedNextStep,
  });

  return NextResponse.json({
    what_worked: whatWorked,
    missed_signals: missedSignals,
    recommended_next_step: recommendedNextStep,
  });
  } catch (error) {
    console.error("[API] calls/[id]/coaching error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
