/**
 * Closing call data for a lead (from Zoom call analysis)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: leadId } = await params;
  const db = getDb();
  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const accessErr = await requireWorkspaceAccess(req, (lead as { workspace_id: string }).workspace_id);
  if (accessErr) return accessErr;

  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, consent_granted, consent_mode, call_started_at, call_ended_at, transcript_text, summary, provider, show_status, show_confidence, show_reason")
    .or(`lead_id.eq.${leadId},matched_lead_id.eq.${leadId}`)
    .order("call_ended_at", { ascending: false })
    .limit(5);

  if (!sessions?.length) {
    return NextResponse.json({ call: null });
  }

  const latest = sessions[0] as { id: string; consent_granted?: boolean; consent_mode?: string; call_started_at?: string; call_ended_at?: string; transcript_text?: string; summary?: string; provider?: string; show_status?: string; show_confidence?: number; show_reason?: string };
  const { data: analysis } = await db
    .from("call_analysis")
    .select("analysis_json, confidence, created_at, analysis_source")
    .eq("call_session_id", latest.id)
    .maybeSingle();

  const a = (analysis as { analysis_json?: Record<string, unknown>; confidence?: number; created_at?: string; analysis_source?: string })?.analysis_json ?? {};
  const anaSource = (analysis as { analysis_source?: string })?.analysis_source;
  return NextResponse.json({
    call: {
      call_session_id: latest.id,
      consent_granted: latest.consent_granted,
      consent_mode: latest.consent_mode,
      call_started_at: latest.call_started_at,
      call_ended_at: latest.call_ended_at,
      summary: latest.summary,
      transcript_stored: !!latest.transcript_text && (latest.consent_granted ?? latest.consent_mode !== "off"),
      provider: latest.provider,
      show_status: latest.show_status,
      show_confidence: latest.show_confidence,
      show_reason: latest.show_reason,
      analysis_source: anaSource,
      analysis: {
        outcome: a.outcome,
        buyer_signals: a.buyer_signals,
        objections: a.objections,
        commitments: a.commitments,
        risks: a.risks,
        next_best_action: a.next_best_action,
        followup_plan: a.followup_plan,
        summary: a.summary,
        confidence: (analysis as { confidence?: number })?.confidence,
      },
    },
  });
}
