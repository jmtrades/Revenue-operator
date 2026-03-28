/**
 * GET /api/integrations/zapier/triggers/new_lead — Zapier polling trigger: new leads (Task 22).
 * Auth: Bearer. Query: limit, since (id cursor).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceIdFromZapierToken } from "@/lib/integrations/zapier-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceIdFromZapierToken(req.headers.get("authorization"));
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 60 polling requests per minute per workspace (Zapier polls every ~5min, but allow burst)
  const rl = await checkRateLimit(`zapier:new_lead:${workspaceId}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "25", 10) || 25, 100);
  const since = req.nextUrl.searchParams.get("since")?.trim() || undefined;

  const db = getDb();
  let query = db
    .from("leads")
    .select("id, name, email, phone, company, state, last_activity_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    const { data: cursorRow } = await db.from("leads").select("created_at").eq("id", since).eq("workspace_id", workspaceId).maybeSingle();
    if (cursorRow) query = query.lt("created_at", (cursorRow as { created_at: string }).created_at);
  }

  const { data: rows } = await query;
  const results = (rows ?? []).map((r: { id: string; name?: string | null; email?: string | null; phone?: string | null; company?: string | null; state?: string | null; last_activity_at?: string | null; created_at: string }) => ({
    id: r.id,
    name: r.name ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    company: r.company ?? null,
    state: r.state ?? null,
    last_activity_at: r.last_activity_at ?? null,
    created_at: r.created_at,
  }));
  return NextResponse.json({ results });
}
