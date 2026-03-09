import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { hasVapiServerKey } from "@/lib/vapi/env";
import { syncVapiAgent } from "@/lib/agents/sync-vapi-agent";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const envAssistant = process.env.VAPI_DEMO_ASSISTANT_ID?.trim() || null;
  if (envAssistant) {
    return NextResponse.json({ assistantId: envAssistant });
  }

  if (!hasVapiServerKey()) {
    return NextResponse.json({ assistantId: null }, { status: 404 });
  }

  const session = await getSession(req).catch(() => null);
  if (!session?.workspaceId) {
    return NextResponse.json({ assistantId: null }, { status: 404 });
  }

  const db = getDb();

  // Prefer workspace-level assistant if already provisioned
  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("vapi_assistant_id")
      .eq("id", session.workspaceId)
      .maybeSingle();
    const existing =
      (ws as { vapi_assistant_id?: string | null } | null)?.vapi_assistant_id?.trim() ||
      null;
    if (existing) {
      return NextResponse.json({ assistantId: existing });
    }
  } catch {
    // continue to agent-level fallback
  }

  // Look for an agent with an existing assistant
  try {
    const { data: agents } = await db
      .from("agents")
      .select("id, vapi_agent_id, is_active")
      .eq("workspace_id", session.workspaceId)
      .order("created_at", { ascending: true });

    const list =
      (agents as Array<{
        id: string;
        vapi_agent_id?: string | null;
        is_active?: boolean | null;
      }>) ?? [];

    const withAssistant = list.find(
      (a) => (a.vapi_agent_id ?? "").toString().trim().length > 0,
    );
    if (withAssistant) {
      const id = withAssistant.vapi_agent_id!.toString().trim();
      await db
        .from("workspaces")
        .update({
          vapi_assistant_id: id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.workspaceId);
      return NextResponse.json({ assistantId: id });
    }

    if (list[0]) {
      // No assistant yet — provision one from the first agent
      try {
        const result = await syncVapiAgent(db, list[0].id);
        return NextResponse.json({ assistantId: result.assistantId });
      } catch {
        // fall through to 404
      }
    }
  } catch {
    // ignore and return 404 below
  }

  return NextResponse.json({ assistantId: null }, { status: 404 });
}

