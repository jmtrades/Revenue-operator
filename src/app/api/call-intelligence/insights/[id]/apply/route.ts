/**
 * POST /api/call-intelligence/insights/[id]/apply — Add insight to an agent's learned behaviors.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id: insightId } = await params;
  if (!insightId) return NextResponse.json({ error: "Missing insight id" }, { status: 400 });

  let body: { agent_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const agentId = typeof body?.agent_id === "string" ? body.agent_id.trim() : null;
  if (!agentId) return NextResponse.json({ error: "Provide agent_id" }, { status: 400 });

  const db = getDb();

  const { data: insight, error: insightErr } = await db
    .from("call_insights")
    .select("id, insight, applied")
    .eq("id", insightId)
    .eq("workspace_id", session.workspaceId)
    .single();

  if (insightErr || !insight) {
    return NextResponse.json({ error: "Insight not found." }, { status: 404 });
  }

  const { data: agent, error: agentErr } = await db
    .from("agents")
    .select("id, rules")
    .eq("id", agentId)
    .eq("workspace_id", session.workspaceId)
    .single();

  if (agentErr || !agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const insightText = (insight as { insight: string }).insight;
  const rules = (agent as { rules?: { learnedBehaviors?: string[] } }).rules ?? {};
  const learnedBehaviors = Array.isArray(rules.learnedBehaviors) ? [...rules.learnedBehaviors] : [];
  if (!learnedBehaviors.includes(insightText)) {
    learnedBehaviors.push(insightText);
  }

  const { error: updateAgentErr } = await db
    .from("agents")
    .update({
      rules: { ...rules, learnedBehaviors },
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  if (updateAgentErr) {
    // Update agent failed; error response below
    return NextResponse.json({ error: "Failed to apply to agent." }, { status: 500 });
  }

  await db
    .from("call_insights")
    .update({ applied: true })
    .eq("id", insightId)
    .eq("workspace_id", session.workspaceId);

  return NextResponse.json({ ok: true, agent_id: agentId });
}
