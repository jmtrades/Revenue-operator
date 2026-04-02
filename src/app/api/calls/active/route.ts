/**
 * GET /api/calls/active — Currently active calls (call_ended_at IS NULL) for workspace (Task 28).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const err = await requireWorkspaceAccess(req, workspaceId);
    if (err) return err;

    const db = getDb();
  const { data: sessions } = await db
    .from("call_sessions")
    .select(`
      id, lead_id, matched_lead_id, workspace_id,
      call_started_at, call_ended_at, transcript_text, summary,
      external_meeting_id, provider, metadata
    `)
    .eq("workspace_id", workspaceId)
    .not("call_started_at", "is", null)
    .is("call_ended_at", null)
    .order("call_started_at", { ascending: false });

  const list = (sessions ?? []) as Array<{
    id: string;
    lead_id?: string | null;
    matched_lead_id?: string | null;
    call_started_at?: string | null;
    transcript_text?: string | null;
    summary?: string | null;
    external_meeting_id?: string | null;
    provider?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
  const leadIds = [...new Set(list.map((s) => s.lead_id ?? s.matched_lead_id).filter(Boolean))] as string[];
  const { data: leads } = leadIds.length
    ? await db.from("leads").select("id, name, phone, email").in("id", leadIds)
    : { data: [] };
  const leadMap = ((leads ?? []) as { id: string; name?: string | null; phone?: string | null; email?: string | null }[]).reduce(
    (acc, l) => {
      acc[l.id] = l;
      return acc;
    },
    {} as Record<string, { name?: string | null; phone?: string | null; email?: string | null }>
  );

  const { data: agents } = await db
    .from("agents")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .limit(5);
  const primaryAgent = (agents ?? [])[0] as { name?: string } | undefined;

  const active = list.map((s) => {
    const lid = s.lead_id ?? s.matched_lead_id ?? null;
    const lead = lid ? leadMap[lid] : null;
    const meta = s.metadata ?? {};
    return {
      id: s.id,
      call_started_at: s.call_started_at,
      transcript_text: s.transcript_text ?? null,
      summary: s.summary ?? null,
      caller_number: lead?.phone ?? null,
      caller_name: lead?.name ?? null,
      agent_name: primaryAgent?.name ?? "AI Agent",
      call_control_id: (meta.call_control_id as string | undefined) ?? null,
    };
  });

  return NextResponse.json({
    active,
    in_progress: active.length,
    waiting: 0,
  });
  } catch (error) {
    log("error", "calls.active_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
