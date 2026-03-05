/**
 * POST /api/vapi/create-agent — Create or ensure Vapi assistant for current workspace.
 * Uses workspace name, greeting, agent_name. Stores vapi_assistant_id on workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { createAssistant } from "@/lib/vapi";
import { compileSystemPrompt } from "@/lib/business-brain";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: "Voice not configured" }, { status: 503 });
  }

  try {
    const db = getDb();
    const { data: ws, error: wsErr } = await db
      .from("workspaces")
      .select("id, name, greeting, agent_name, vapi_assistant_id")
      .eq("id", session.workspaceId)
      .single();

    if (wsErr || !ws) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const row = ws as { id: string; name?: string; greeting?: string; agent_name?: string; vapi_assistant_id?: string | null };
    let assistantId = row.vapi_assistant_id?.trim() || null;

    if (!assistantId) {
      const businessName = row.name?.trim() || "Our business";
      const agentName = row.agent_name?.trim() || "Receptionist";
      const greeting = row.greeting?.trim() || `Hello, thanks for calling ${businessName}. How can I help you today?`;
      const systemPrompt = compileSystemPrompt({
        business_name: businessName,
        agent_name: agentName,
        greeting,
      });
      const { id } = await createAssistant({
        name: `${agentName} – ${row.id.slice(0, 8)}`,
        systemPrompt,
        firstMessage: greeting,
      });
      assistantId = id;
      await db
        .from("workspaces")
        .update({ vapi_assistant_id: assistantId, updated_at: new Date().toISOString() })
        .eq("id", session.workspaceId);
    }

    return NextResponse.json({ ok: true, assistantId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
