/**
 * GET /api/integrations/zapier/triggers/new_appointment — Zapier polling trigger: new appointments (Task 22).
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
    .from("appointments")
    .select("id, lead_id, title, start_time, end_time, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    const { data: cursorRow } = await db.from("appointments").select("created_at").eq("id", since).eq("workspace_id", workspaceId).maybeSingle();
    if (cursorRow) query = query.lt("created_at", (cursorRow as { created_at: string }).created_at);
  }

  const { data: rows } = await query;
  const results = (rows ?? []).map((r: { id: string; lead_id: string; title: string; start_time: string; end_time?: string | null; status: string; created_at: string }) => ({
    id: r.id,
    lead_id: r.lead_id,
    title: r.title,
    start_time: r.start_time,
    end_time: r.end_time ?? null,
    status: r.status,
    created_at: r.created_at,
  }));
  return NextResponse.json({ results });
}
