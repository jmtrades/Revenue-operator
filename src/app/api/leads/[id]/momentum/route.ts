/**
 * Lead momentum: warmth score, learned preferences, cooling state, days to warm.
 * Feels like accumulated relationship capital.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getLeadMemory } from "@/lib/lead-memory";
import { getWarmthScores } from "@/lib/momentum/warmth";

export async function GET(
  req: NextRequest,
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

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, wid);
  if (authErr) return authErr;

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

  const learned = await getLearnedPreferences(wid, leadId);

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

async function getLearnedPreferences(workspaceId: string, leadId: string): Promise<string[]> {
  const lines: string[] = [];
  const mem = await getLeadMemory(workspaceId, leadId);
  if (!mem) return lines;

  const reactionNotes = mem.lifecycle_notes_json.filter((n) => n.note_type === "webhook_reaction");
  const recent = reactionNotes.slice(-3);
  recent.forEach((r) => {
    const action = r.last_action ?? "action";
    const outcome = r.outcome ?? "";
    lines.push(`Responded to "${action}" → ${outcome}`);
  });

  if (mem.objections_history_json.length > 0) {
    mem.objections_history_json.slice(-5).forEach((o) => lines.push(`Raised objection: ${o.tag}`));
  }

  return lines;
}
