/**
 * GET /api/leads/[id]/calls — Call sessions for this lead (contact timeline).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await ctx.params;
  const session = getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { data: lead } = await db.from("leads").select("id, workspace_id").eq("id", leadId).maybeSingle();
  if (!lead || (lead as { workspace_id: string }).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const err = await requireWorkspaceAccess(req, (lead as { workspace_id: string }).workspace_id);
  if (err) return err;

  const workspaceId = (lead as { workspace_id: string }).workspace_id;
  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, call_started_at, call_ended_at, outcome, transcript_text, summary")
    .eq("workspace_id", workspaceId)
    .or(`lead_id.eq.${leadId},matched_lead_id.eq.${leadId}`)
    .order("call_started_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ calls: sessions ?? [] });
}
