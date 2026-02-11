/**
 * Evidence chain / proof for a lead (receipts mode)
 * Tabs: events, messages, policy_reasoning, counterfactual, billing_impact
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getCommitmentScore } from "@/lib/commitment";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const db = getDb();

  const { data: actions } = await db
    .from("action_logs")
    .select("action, payload, created_at")
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: convs } = await db.from("conversations").select("id").eq("lead_id", leadId);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  const { data: messagesData } = convIds.length
    ? await db.from("messages").select("role, content, metadata, created_at").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(20)
    : { data: [] };
  const messages = (messagesData ?? []).map((m: { role: string; content: string; metadata?: unknown; created_at: string }) => ({
    ...m,
    reasoning: (m.metadata as { reasoning?: unknown })?.reasoning,
    policy_reasoning: (m.metadata as { policy_reason?: string })?.policy_reason,
  }));

  const { data: events } = await db
    .from("events")
    .select("event_type, payload, created_at")
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .order("created_at", { ascending: false })
    .limit(30);

  const policyReasoning = actions?.flatMap((a: { payload?: { policy_reason?: string } }) => (a.payload?.policy_reason ? [a.payload.policy_reason] : [])) ?? [];

  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).single();
  const workspaceId = (lead as { workspace_id?: string })?.workspace_id;

  let call_analysis: Array<{ call_session_id: string; analysis_json?: Record<string, unknown>; confidence?: number; created_at?: string; consent?: unknown; analysis_source?: string | null }> = [];
  let call_inference: Array<{ call_session_id: string; show_status?: string | null; show_confidence?: number | null; show_reason?: string | null; wrapup_used?: boolean; transcript_available?: boolean }> = [];
  if (workspaceId) {
    const { data: sessions } = await db
      .from("call_sessions")
      .select("id, consent_granted, consent_mode, call_started_at, call_ended_at, show_status, show_confidence, show_reason, transcript_text")
      .or(`lead_id.eq.${leadId},matched_lead_id.eq.${leadId}`);
    const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
    const sessionMap = (sessions ?? []).reduce(
      (acc: Record<string, unknown>, s: { id: string; consent_granted?: boolean; consent_mode?: string; show_status?: string; show_confidence?: number; show_reason?: string; transcript_text?: string | null }) => {
        acc[s.id] = s;
        return acc;
      },
      {}
    );
    if (sessionIds.length > 0) {
      const { data: analyses } = await db
        .from("call_analysis")
        .select("call_session_id, analysis_json, confidence, created_at, analysis_source")
        .in("call_session_id", sessionIds);
      call_analysis = ((analyses ?? []) as { call_session_id: string; analysis_json?: Record<string, unknown>; confidence?: number; created_at?: string; analysis_source?: string | null }[]).map(
        (a) => ({ ...a, consent: sessionMap[a.call_session_id] })
      );
      const { data: wrapups } = await db.from("call_wrapups").select("call_session_id").in("call_session_id", sessionIds);
      const wrapupSessionIds = new Set((wrapups ?? []).map((w: { call_session_id: string }) => w.call_session_id));
      call_inference = sessionIds.map((sid: string) => {
        const s = sessionMap[sid] as { show_status?: string; show_confidence?: number; show_reason?: string; transcript_text?: string | null };
        return {
          call_session_id: sid,
          show_status: s?.show_status ?? null,
          show_confidence: s?.show_confidence ?? null,
          show_reason: s?.show_reason ?? null,
          wrapup_used: wrapupSessionIds.has(sid),
          transcript_available: !!(s?.transcript_text && String(s.transcript_text).trim().length >= 50),
        };
      });
    }
  }

  const commitmentScore = await getCommitmentScore(leadId);
  let counterfactual: { baseline_conversion: number; impact: string } | null = null;
  let billingImpact: { amount_cents: number; status: string } | null = null;

  if (workspaceId) {
    const { data: metrics } = await db
      .from("metrics")
      .select("metric_key, metric_value")
      .eq("workspace_id", workspaceId)
      .in("metric_key", ["replies_sent", "replies_sent"])
      .limit(10);
    const sums = (metrics ?? []).reduce((acc: Record<string, number>, r: { metric_key: string; metric_value: number }) => {
      acc[r.metric_key] = (acc[r.metric_key] ?? 0) + Number(r.metric_value);
      return acc;
    }, {});
    const baselineConversion = 0.02;
    counterfactual = {
      baseline_conversion: baselineConversion,
      impact: `Baseline conversion ~${(baselineConversion * 100).toFixed(1)}%. Engagement increases likelihood.`,
    };

    const { data: inv } = await db.from("invoice_items").select("amount_cents, status").eq("lead_id", leadId).limit(1).single();
    if (inv) {
      billingImpact = { amount_cents: (inv as { amount_cents: number }).amount_cents, status: (inv as { status: string }).status };
    }
  }

  return NextResponse.json({
    actions: actions ?? [],
    messages,
    events: events ?? [],
    policy_reasoning: policyReasoning,
    counterfactual,
    billing_impact: billingImpact,
    call_analysis,
    call_inference,
    commitment_score: commitmentScore,
    commitment_influence: commitmentScore >= 0.7
      ? "High commitment: shorter reminders, direct booking suggested"
      : commitmentScore <= 0.3
        ? "Low commitment: confirmation prompts, softer tone"
        : "Medium commitment: standard follow-ups",
  });
}
