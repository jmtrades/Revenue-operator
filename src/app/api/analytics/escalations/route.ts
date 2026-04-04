/**
 * GET /api/analytics/escalations — Escalation events from conversation analytics
 *
 * Queries conversation_analytics table for rows with escalation_level metadata
 * and returns formatted escalation events for the EscalationLogCard dashboard.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();

  // Parse query parameters
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);
  const fromDate = req.nextUrl.searchParams.get("from_date");
  const statusFilter = req.nextUrl.searchParams.get("status");

  // Build query for conversation_analytics with escalation data
  let query = db
    .from("conversation_analytics")
    .select(
      `id,
       call_session_id,
       workspace_id,
       metadata,
       created_at,
       updated_at`
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fromDate) {
    query = query.gte("created_at", fromDate);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] | null = null;
  try {
    const result = await query;
    if (result.error) {
      log("warn", "escalations.query_error", { error: result.error.message });
      // Gracefully return empty when table missing or query fails
      return NextResponse.json({ escalations: [], count: 0, workspace_id: workspaceId });
    }
    rows = result.data;
  } catch (err) {
    log("warn", "escalations.unexpected_error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ escalations: [], count: 0, workspace_id: workspaceId });
  }

  // Filter and format escalation events from conversation_analytics
  const escalationRows = (rows ?? [])
    .map((row) => {
      const meta = (row as { metadata?: Record<string, unknown> }).metadata ?? {};
      const escalationLevel = meta.escalation_level as string | undefined;

      if (!escalationLevel) return null;

      return {
        id: (row as { id: string }).id,
        call_session_id: (row as { call_session_id?: string | null }).call_session_id,
        escalation_level: escalationLevel,
        risk_score: (meta.risk_score as number | undefined) ?? null,
        reason: (meta.escalation_reason as string | undefined) ?? "Escalation triggered",
        timestamp: (row as { created_at: string }).created_at,
        created_at: (row as { created_at: string }).created_at,
        agent_name: (meta.agent_name as string | undefined) ?? "System",
        sentiment: (meta.sentiment as string | undefined) ?? "neutral",
        metadata: meta,
      };
    })
    .filter(
      (e): e is NonNullable<typeof e> =>
        e !== null && (!statusFilter || (e.escalation_level ?? "").includes(statusFilter))
    );

  // Enrich with call session and lead info
  const callSessionIds = [
    ...new Set(
      escalationRows
        .map((e) => e.call_session_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let callSessionMap: Record<string, { lead_id?: string | null; transcript_text?: string | null }> = {};
  if (callSessionIds.length > 0) {
    const { data: sessions } = await db
      .from("call_sessions")
      .select("id, lead_id, transcript_text")
      .in("id", callSessionIds);

    callSessionMap = ((sessions ?? []) as Array<{ id: string; lead_id?: string | null; transcript_text?: string | null }>).reduce<Record<string, { lead_id?: string | null; transcript_text?: string | null }>>(
      (acc, s) => {
        acc[s.id] = { lead_id: s.lead_id, transcript_text: s.transcript_text };
        return acc;
      },
      {}
    );
  }

  // Get lead info for enrichment
  const leadIds = [
    ...new Set(
      Object.values(callSessionMap)
        .map((s) => s.lead_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let leadMap: Record<string, { name?: string | null; phone?: string | null; company?: string | null }> = {};
  if (leadIds.length > 0) {
    const { data: leads } = await db
      .from("leads")
      .select("id, name, phone, company")
      .in("id", leadIds);

    leadMap = ((leads ?? []) as Array<{ id: string; name?: string | null; phone?: string | null; company?: string | null }>).reduce<Record<string, { name?: string | null; phone?: string | null; company?: string | null }>>(
      (acc, l) => {
        acc[l.id] = { name: l.name, phone: l.phone, company: l.company };
        return acc;
      },
      {}
    );
  }

  // Format response — match EscalationLogCard interface
  const escalations = escalationRows.map((e) => {
    const session = e.call_session_id ? callSessionMap[e.call_session_id] : null;
    const lead = session?.lead_id ? leadMap[session.lead_id] : null;
    const level = e.escalation_level as string;
    const isTransferred = level === "escalate" || level === "critical";

    return {
      id: e.id,
      call_session_id: e.call_session_id,
      level: level as "watch" | "warning" | "critical" | "escalate",
      risk_score: e.risk_score ?? (level === "escalate" ? 95 : level === "critical" ? 80 : level === "warning" ? 60 : 30),
      reason: e.reason ?? "Sentiment deterioration detected",
      action_taken: isTransferred ? "Transferred to human agent" : level === "warning" ? "Adjusted AI tone and empathy" : "Monitoring — no action needed",
      transferred: isTransferred,
      created_at: e.timestamp ?? e.created_at,
      // Enrichment fields
      lead_name: lead?.name ?? "Unknown",
      lead_phone: lead?.phone ?? "",
      lead_company: lead?.company ?? "",
      transcript_excerpt: session?.transcript_text ? session.transcript_text.slice(0, 200) : null,
    };
  });

  return NextResponse.json({
    escalations,
    count: escalations.length,
    workspace_id: workspaceId,
  });
}
