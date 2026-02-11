/**
 * Weekly pipeline diagnosis: stage drop-off, show rate, response delay, channel underperformance
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export interface DiagnosisItem {
  problem: string;
  evidence: string;
  recommended_fix: string;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const diagnosis: DiagnosisItem[] = [];

  const { data: leads } = await db
    .from("leads")
    .select("id, state, last_activity_at, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", weekStart.toISOString());

  const stateCounts: Record<string, number> = {};
  for (const l of leads ?? []) {
    const s = (l as { state: string }).state;
    stateCounts[s] = (stateCounts[s] ?? 0) + 1;
  }

  const booked = stateCounts.BOOKED ?? 0;
  const showed = stateCounts.SHOWED ?? 0;
  const qualified = stateCounts.QUALIFIED ?? 0;
  if (booked > 0 && showed < booked * 0.7) {
    diagnosis.push({
      problem: "Show rate decline",
      evidence: `Booked: ${booked}, Showed: ${showed} (${((showed / booked) * 100).toFixed(0)}%)`,
      recommended_fix: "Review reminder cadence and reduce no-shows with confirmation flows.",
    });
  }

  const newCount = stateCounts.NEW ?? 0;
  const contacted = stateCounts.CONTACTED ?? 0;
  if (newCount > 0 && contacted < newCount * 0.3) {
    diagnosis.push({
      problem: "Stage drop-off: NEW → CONTACTED",
      evidence: `NEW: ${newCount}, CONTACTED: ${contacted}`,
      recommended_fix: "Increase first-touch speed or improve opening message.",
    });
  }

  const { data: outbound } = await db
    .from("outbound_messages")
    .select("sent_at, lead_id, channel")
    .eq("workspace_id", workspaceId)
    .gte("sent_at", weekStart.toISOString());

  const { data: msgs } = await db
    .from("messages")
    .select("conversation_id, created_at")
    .eq("role", "user")
    .gte("created_at", weekStart.toISOString());

  const convIds = [...new Set((msgs ?? []).map((m: { conversation_id: string }) => m.conversation_id))];
  const { data: convs } = convIds.length
    ? await db.from("conversations").select("id").in("id", convIds)
    : { data: [] };
  const convIdsList = (convs ?? []).map((c: { id: string }) => c.id);

  const { data: replies } = convIdsList.length
    ? await db
        .from("messages")
        .select("conversation_id, created_at")
        .eq("role", "assistant")
        .in("conversation_id", convIdsList)
        .gte("created_at", weekStart.toISOString())
    : { data: [] };

  const userMsgs = (msgs ?? []) as { conversation_id: string; created_at: string }[];
  const replyMsgs = (replies ?? []) as { conversation_id: string; created_at: string }[];
  let delays: number[] = [];
  for (const u of userMsgs) {
    const r = replyMsgs.find((x) => x.conversation_id === u.conversation_id && x.created_at > u.created_at);
    if (r) {
      delays.push((new Date(r.created_at).getTime() - new Date(u.created_at).getTime()) / 1000);
    }
  }
  const avgDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
  if (delays.length >= 5 && avgDelay > 300) {
    diagnosis.push({
      problem: "Response delay",
      evidence: `Avg response time: ${Math.round(avgDelay)}s (${delays.length} replies)`,
      recommended_fix: "Reduce processing latency or increase burst drain capacity.",
    });
  }

  const channelCounts: Record<string, number> = {};
  for (const o of outbound ?? []) {
    const ch = (o as { channel?: string })?.channel ?? "unknown";
    channelCounts[ch] = (channelCounts[ch] ?? 0) + 1;
  }
  const totalOut = Object.values(channelCounts).reduce((a, b) => a + b, 0);
  for (const [ch, count] of Object.entries(channelCounts)) {
    if (totalOut >= 10 && count / totalOut < 0.1) {
      diagnosis.push({
        problem: "Channel underperformance",
        evidence: `Channel ${ch}: ${count} of ${totalOut} (${((count / totalOut) * 100).toFixed(0)}%)`,
        recommended_fix: `Review ${ch} setup or consider deprioritizing if low engagement.`,
      });
    }
  }

  return NextResponse.json({ diagnosis, period_start: weekStart.toISOString(), period_end: now.toISOString() });
}
