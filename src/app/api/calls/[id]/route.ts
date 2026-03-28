export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const authSession = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || authSession?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: callRow, error: sessionErr } = await db
    .from("call_sessions")
    .select(`
      id, lead_id, matched_lead_id, outcome, started_at, ended_at,
      workspace_id, provider, call_started_at, call_ended_at,
      transcript_text, summary, recording_url, consent_granted, consent_mode
    `)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (sessionErr) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  if (!callRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const leadId = (callRow as { lead_id?: string | null; matched_lead_id?: string | null }).lead_id
    ?? (callRow as { matched_lead_id?: string | null }).matched_lead_id;
  let matched_lead = null;
  if (leadId) {
    const { data: lead } = await db.from("leads").select("id, name, email, company").eq("id", leadId).maybeSingle();
    matched_lead = lead;
  }

  const { data: analysis } = await db
    .from("call_analysis")
    .select("analysis_json, confidence, analysis_source")
    .eq("call_session_id", id)
    .maybeSingle();

  const call = {
    ...callRow,
    matched_lead,
    analysis: (analysis?.analysis_json as Record<string, unknown> | null) ?? null,
    analysis_outcome: (analysis?.analysis_json as Record<string, unknown>)?.outcome ?? null,
    confidence: analysis?.confidence ?? null,
    analysis_source: analysis?.analysis_source ?? null,
  };

  return NextResponse.json({ call });
  } catch (error) {
    log("error", "calls.id_route_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
