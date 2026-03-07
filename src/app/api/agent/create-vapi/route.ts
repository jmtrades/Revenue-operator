export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { syncVapiAgent } from "@/lib/agents/sync-vapi-agent";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId || !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agent_id?: string };
  try {
    body = (await req.json()) as { agent_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const agentId = body.agent_id?.trim();
  if (!agentId) {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }

  const db = getDb();
  const { data: agent } = await db
    .from("agents")
    .select("id, workspace_id")
    .eq("id", agentId)
    .maybeSingle();

  const row = agent as { id: string; workspace_id: string } | null;
  if (!row) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (row.workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncVapiAgent(db, row.id);
    return NextResponse.json({
      ok: true,
      vapi_agent_id: result.assistantId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync voice agent" },
      { status: 500 },
    );
  }
}
