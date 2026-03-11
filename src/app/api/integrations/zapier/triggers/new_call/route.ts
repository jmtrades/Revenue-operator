/**
 * GET /api/integrations/zapier/triggers/new_call — Zapier polling trigger: new calls (Task 22).
 * Auth: Bearer <access_token>. Query: limit (default 25), since (optional id cursor).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceIdFromZapierToken } from "@/lib/integrations/zapier-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceIdFromZapierToken(req.headers.get("authorization"));
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "25", 10) || 25, 100);
  const since = req.nextUrl.searchParams.get("since")?.trim() || undefined;

  const db = getDb();
  let query = db
    .from("call_sessions")
    .select("id, lead_id, matched_lead_id, outcome, started_at, ended_at, call_started_at, call_ended_at, summary")
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (since) {
    const { data: cursorRow } = await db.from("call_sessions").select("started_at").eq("id", since).eq("workspace_id", workspaceId).single();
    if (cursorRow) {
      const ts = (cursorRow as { started_at: string }).started_at;
      query = query.lt("started_at", ts);
    }
  }

  const { data: rows } = await query;
  const results = (rows ?? []).map((r: { id: string; lead_id?: string | null; matched_lead_id?: string | null; outcome?: string | null; started_at: string; ended_at?: string | null; call_started_at?: string | null; call_ended_at?: string | null; summary?: string | null }) => ({
    id: r.id,
    lead_id: r.lead_id ?? r.matched_lead_id,
    outcome: r.outcome ?? null,
    started_at: r.started_at,
    ended_at: r.ended_at ?? null,
    call_started_at: r.call_started_at ?? null,
    call_ended_at: r.call_ended_at ?? null,
    summary: r.summary ?? null,
  }));
  return NextResponse.json({ results });
}
