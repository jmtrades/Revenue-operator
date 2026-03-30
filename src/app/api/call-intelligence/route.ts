/**
 * GET /api/call-intelligence — List call_examples and call_insights for workspace.
 *
 * Actual schema (revenue_operator):
 *   call_examples:  id, workspace_id, scenario, example_text, category, created_at
 *   call_insights:  id, workspace_id, call_session_id, insight_type, content, confidence, metadata, created_at
 *
 * The frontend expects a different shape, so we transform DB rows to match the
 * client-expected interface (title, call_type, call_example_id, insight, etc.)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

type DbExample = {
  id: string;
  workspace_id: string;
  scenario: string | null;
  example_text: string | null;
  category: string | null;
  created_at: string;
};

type DbInsight = {
  id: string;
  workspace_id: string;
  call_session_id: string | null;
  insight_type: string | null;
  content: string | null;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  const { data: rawExamples, error: exErr } = await db
    .from("call_examples")
    .select("id, workspace_id, scenario, example_text, category, created_at")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (exErr) {
    console.error("[call-intelligence] call_examples query failed:", exErr.message);
    return NextResponse.json({ error: "Failed to load call examples." }, { status: 500 });
  }

  const { data: rawInsights, error: insErr } = await db
    .from("call_insights")
    .select("id, workspace_id, call_session_id, insight_type, content, confidence, metadata, created_at")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (insErr) {
    console.error("[call-intelligence] call_insights query failed:", insErr.message);
  }

  // Transform call_examples to frontend shape
  const call_examples = ((rawExamples ?? []) as DbExample[]).map((ex) => ({
    id: ex.id,
    title: ex.scenario ?? "Untitled",
    source: "system",
    call_type: ex.category ?? null,
    status: "analyzed",
    created_at: ex.created_at,
    transcript: ex.example_text ?? "",
    agent_id: null,
    duration_seconds: null,
    audio_url: null,
  }));

  // Transform call_insights to frontend shape
  // Map call_session_id → call_example_id where possible by matching workspace examples
  const exampleIds = new Set(call_examples.map((e) => e.id));
  const call_insights = ((rawInsights ?? []) as DbInsight[]).map((ins) => {
    const meta = ins.metadata ?? {};
    return {
      id: ins.id,
      // If call_session_id points to an example, use it; otherwise null
      call_example_id: ins.call_session_id && exampleIds.has(ins.call_session_id)
        ? ins.call_session_id
        : ins.call_session_id ?? null,
      category: ins.insight_type ?? "general",
      insight: ins.content ?? "",
      example_from_transcript: (meta.example_from_transcript as string) ?? null,
      confidence: ins.confidence ?? 0,
      applied: (meta.applied as boolean) ?? false,
      dismissed: (meta.dismissed as boolean) ?? false,
      created_at: ins.created_at,
    };
  });

  return NextResponse.json({ call_examples, call_insights });
}
