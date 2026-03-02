/**
 * Daily Attention List
 * "Who requires attention today" — ranks leads by impact on revenue outcome.
 * Visible immediately on dashboard load. System prioritizes; user does not decide.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { computeReadiness, persistReadiness } from "@/lib/readiness/engine";
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Check cache first
  const { data: cached } = await db
    .from("daily_attention")
    .select("lead_id, deal_id, rank, readiness_score, consequence_if_ignored, best_action_timing, confidence_level")
    .eq("workspace_id", workspaceId)
    .eq("attention_date", todayStr)
    .order("rank", { ascending: true })
    .limit(20);

  if (cached && cached.length > 0) {
    const leadIds = cached.map((c: { lead_id: string }) => c.lead_id);
    const { data: leads } = leadIds.length
      ? await db
          .from("leads")
          .select("id, name, email, company, state")
          .in("id", leadIds)
      : { data: [] };
    const leadMap = ((leads ?? []) as { id: string; name?: string; email?: string; company?: string; state?: string }[]).reduce(
      (acc, l) => { acc[l.id] = l; return acc; },
      {} as Record<string, { name?: string; email?: string; company?: string; state?: string }>
    );
    return NextResponse.json({
      attention: cached.map((c: { lead_id: string; deal_id?: string; rank: number; readiness_score: number; consequence_if_ignored?: string; best_action_timing?: string; confidence_level?: string }) => ({
        ...c,
        lead: leadMap[c.lead_id],
      })),
      generated_at: todayStr,
    });
  }

  // Generate list: active leads + deals, ranked by readiness * value
  const { data: deals } = await db
    .from("deals")
    .select("id, lead_id, value_cents")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "booked"])
    .neq("status", "lost");

  const { data: activeLeads } = await db
    .from("leads")
    .select("id, name, email, company, state, last_activity_at")
    .eq("workspace_id", workspaceId)
    .in("state", ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "REACTIVATE"])
    .eq("opt_out", false)
    .order("last_activity_at", { ascending: false })
    .limit(50);

  const scored: Array<{
    lead_id: string;
    deal_id?: string;
    readiness: number;
    value_cents: number;
    consequence: string;
    best_timing: Date;
    confidence: string;
  }> = [];

  for (const lead of activeLeads ?? []) {
    const l = lead as { id: string; state: string; last_activity_at?: string };
    const deal = (deals ?? []).find((d: { lead_id: string }) => d.lead_id === l.id) as { id: string; value_cents?: number } | undefined;
    const valueCents = deal?.value_cents ?? 5000;

    const readiness = await computeReadiness(workspaceId, l.id, deal?.id);
    const score = readiness.conversation_readiness_score;

    const hoursSince = l.last_activity_at
      ? (Date.now() - new Date(l.last_activity_at).getTime()) / (1000 * 60 * 60)
      : 999;
    const consequence =
      score < 30
        ? "Conversation will go cold without touch"
        : score < 50
          ? "Momentum at risk — follow-up needed"
          : score < 70
            ? "Ready for next step — don't delay"
            : "High value — prioritize today";

    const bestTiming = new Date();
    if (hoursSince > 72) bestTiming.setMinutes(bestTiming.getMinutes() + 30);
    else if (hoursSince > 24) bestTiming.setHours(bestTiming.getHours() + 2);
    else bestTiming.setHours(bestTiming.getHours() + 4);

    const confidence = score >= 70 ? "high" : score >= 50 ? "medium" : "low";

    scored.push({
      lead_id: l.id,
      deal_id: deal?.id,
      readiness: score,
      value_cents: valueCents,
      consequence,
      best_timing: bestTiming,
      confidence,
    });

    await persistReadiness(workspaceId, readiness);
  }

  // Rank by impact (readiness * normalized value)
  const maxVal = Math.max(...scored.map((s) => s.value_cents), 1);
  scored.sort((a, b) => {
    const impactA = (a.readiness / 100) * (a.value_cents / maxVal);
    const impactB = (b.readiness / 100) * (b.value_cents / maxVal);
    return impactB - impactA;
  });

  // Cache
  for (let i = 0; i < scored.length; i++) {
    const s = scored[i];
    await db.from("daily_attention").upsert(
      {
        workspace_id: workspaceId,
        attention_date: todayStr,
        lead_id: s.lead_id,
        deal_id: s.deal_id ?? null,
        rank: i + 1,
        readiness_score: s.readiness,
        consequence_if_ignored: s.consequence,
        best_action_timing: s.best_timing.toISOString(),
        confidence_level: s.confidence,
      },
      { onConflict: "workspace_id,attention_date,lead_id" }
    );
  }

  const leadMap = ((activeLeads ?? []) as { id: string; name?: string; email?: string; company?: string; state?: string }[]).reduce(
    (acc, l) => { acc[l.id] = l; return acc; },
    {} as Record<string, { name?: string; email?: string; company?: string; state?: string }>
  );

  return NextResponse.json({
    attention: scored.slice(0, 20).map((s, i) => ({
      lead_id: s.lead_id,
      deal_id: s.deal_id,
      rank: i + 1,
      readiness_score: s.readiness,
      consequence_if_ignored: s.consequence,
      best_action_timing: s.best_timing.toISOString(),
      confidence_level: s.confidence,
      lead: leadMap[s.lead_id],
    })),
    generated_at: todayStr,
  });
}
