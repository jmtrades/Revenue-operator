/**
 * Calendar Risk Forecast
 * 48h attendance probability across all booked calls.
 * Shows: likely no-shows, confirmation needed, high-confidence attendees.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const now = new Date();
  const fortyEightHoursEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, lead_id, deal_id, call_started_at, show_status")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", now.toISOString())
    .lt("call_started_at", fortyEightHoursEnd.toISOString())
    .order("call_started_at", { ascending: true });

  const { data: leads } =
    (sessions ?? []).length > 0
      ? await db
          .from("leads")
          .select("id, name, email, company")
          .in("id", [...new Set((sessions ?? []).map((s: { lead_id: string }) => s.lead_id))])
      : { data: [] };

  const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string }[]).reduce(
    (acc, l) => { acc[l.id] = l; return acc; },
    {} as Record<string, { name?: string; email?: string; company?: string }>
  );

  const likely_no_shows: Array<{ session_id: string; lead_id: string; deal_id?: string; probability: number; call_started_at: string; lead: { name?: string; company?: string } }> = [];
  const confirmation_needed: Array<{ session_id: string; lead_id: string; deal_id?: string; probability: number; call_started_at: string; lead: { name?: string; company?: string } }> = [];
  const high_confidence: Array<{ session_id: string; lead_id: string; deal_id?: string; probability: number; call_started_at: string; lead: { name?: string; company?: string } }> = [];

  for (const s of sessions ?? []) {
    const sess = s as { id: string; lead_id: string; deal_id?: string; call_started_at: string };
    let probability = 0.5;
    if (sess.deal_id) {
      try {
        const pred = await predictDealOutcome(sess.deal_id);
        probability = pred.probability;
      } catch {
        // skip
      }
    }

    const item = {
      session_id: sess.id,
      lead_id: sess.lead_id,
      deal_id: sess.deal_id,
      probability,
      call_started_at: sess.call_started_at,
      lead: leadMap[sess.lead_id] ?? {},
    };

    if (probability < 0.4) likely_no_shows.push(item);
    else if (probability < 0.7) confirmation_needed.push(item);
    else high_confidence.push(item);
  }

  return NextResponse.json({
    next_48h: {
      likely_no_shows,
      confirmation_needed,
      high_confidence,
    },
    total_calls: (sessions ?? []).length,
  });
}
