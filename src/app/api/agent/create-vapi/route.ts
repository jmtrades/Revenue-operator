export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { syncVapiAgent } from "@/lib/agents/sync-vapi-agent";

async function attachExistingWorkspaceAssistant(
  workspaceId: string,
  agentId: string,
) {
  const db = getDb();
  const { data } = await db
    .from("workspaces")
    .select("vapi_assistant_id")
    .eq("id", workspaceId)
    .maybeSingle();

  const assistantId =
    (data as { vapi_assistant_id?: string | null } | null)?.vapi_assistant_id?.trim() || null;
  if (!assistantId) {
    return null;
  }

  await db
    .from("agents")
    .update({
      vapi_agent_id: assistantId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  return assistantId;
}

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

  const existingAssistantId = await attachExistingWorkspaceAssistant(session.workspaceId, row.id);
  if (existingAssistantId) {
    return NextResponse.json({
      ok: true,
      vapi_agent_id: existingAssistantId,
      source: "workspace",
    });
  }

  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: "Vapi is not configured" }, { status: 503 });
  }

  try {
    const result = await syncVapiAgent(db, row.id);
    return NextResponse.json({
      ok: true,
      vapi_agent_id: result.assistantId,
      source: "agent",
    });
  } catch (error) {
    try {
      const fallback = await fetch(new URL("/api/vapi/create-agent", req.url), {
        method: "POST",
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
      });
      const payload = (await fallback.json().catch(() => null)) as
        | { assistantId?: string; error?: string }
        | null;

      if (fallback.ok && payload?.assistantId) {
        await db
          .from("agents")
          .update({
            vapi_agent_id: payload.assistantId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        return NextResponse.json({
          ok: true,
          vapi_agent_id: payload.assistantId,
          source: "workspace-fallback",
        });
      }

      const primaryError =
        error instanceof Error ? error.message : "Could not sync voice agent";
      const fallbackError = payload?.error || `Fallback failed with ${fallback.status}`;
      return NextResponse.json(
        { error: `${primaryError}. ${fallbackError}` },
        { status: fallback.status >= 400 ? fallback.status : 500 },
      );
    } catch (fallbackError) {
      const primaryError =
        error instanceof Error ? error.message : "Could not sync voice agent";
      return NextResponse.json(
        {
          error: `${primaryError}. Fallback request failed: ${
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }`,
        },
        { status: 500 },
      );
    }
  }
}
