/**
 * Lead momentum: warmth score, learned preferences, cooling state, days to warm.
 * Feels like accumulated relationship capital.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getLeadMemory } from "@/lib/lead-memory";
import { getWarmthScores } from "@/lib/momentum/warmth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const db = getDb();

  const { data: lead, error } = await db
    .from("leads")
    .select("id, workspace_id, created_at, last_activity_at, state")
    .eq("id", leadId)
    .single();

  if (error || !lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wid = (lead as { workspace_id: string }).workspace_id;

  const { data: ws } = await db.from("workspaces").select("status, pause_reason").eq("id", wid).single();
  const isPaused = (ws as { status?: string; pause_reason?: string })?.pause_reason != null;

  const lastActivityRaw = (lead as { last_activity_at?: string }).last_activity_at;
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const isDelayed = !lastActivityRaw || new Date(lastActivityRaw).getTime() < threeDaysAgo;

  const warmthMap = await getWarmthScores(wid, [leadId]);
  const warmthScore = warmthMap[leadId] ?? 0;

  const createdAt = new Date((lead as { created_at: string }).created_at).getTime();
  const lastActivityAt = lastActivityRaw ? new Date(lastActivityRaw).getTime() : createdAt;
  const daysToWarm = Math.max(0, Math.ceil((lastActivityAt - createdAt) / (24 * 60 * 60 * 1000)));

  const learned = await getLearnedPreferences(leadId);

  return NextResponse.json({
    warmth_score: warmthScore,
    cooling_state: isPaused || isDelayed ? "Cooling — familiarity fading" : null,
    learned_preferences: learned,
    days_to_warm: daysToWarm,
    momentum_loss_warning: isPaused && daysToWarm > 0
      ? `This conversation took ${daysToWarm} day${daysToWarm !== 1 ? "s" : ""} to warm. Momentum resets if follow-ups stop.`
      : null,
  });
}

async function getLearnedPreferences(leadId: string): Promise<string[]> {
  const types = ["past_reactions", "follow_up_patterns", "objections_raised", "interests_expressed"] as const;
  const lines: string[] = [];

  for (const t of types) {
    const mem = await getLeadMemory(leadId, t);
    if (!mem) continue;
    if (t === "past_reactions" && Array.isArray(mem.reactions) && mem.reactions.length > 0) {
      const recent = mem.reactions.slice(-3);
      recent.forEach((r) => lines.push(`Responded to "${r.trigger}" → ${r.outcome}`));
    }
    if (t === "follow_up_patterns" && Array.isArray(mem.patterns) && mem.patterns.length > 0) {
      mem.patterns.forEach((p) => lines.push(`Follow-up pattern: ${p}`));
    }
    if (t === "objections_raised" && Array.isArray(mem.objections) && mem.objections.length > 0) {
      mem.objections.forEach((o) => lines.push(`Raised objection: ${o}`));
    }
    if (t === "interests_expressed" && Array.isArray(mem.interests) && mem.interests.length > 0) {
      mem.interests.forEach((i) => lines.push(`Expressed interest: ${i}`));
    }
  }

  return lines;
}
