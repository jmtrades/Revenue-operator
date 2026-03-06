/**
 * POST /api/vapi/create-agent — Create or ensure Vapi assistant for current workspace.
 * Uses layered system prompt, ElevenLabs voice, Deepgram transcriber, and agent tool calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { createAssistant, updateAssistant } from "@/lib/vapi";
import { compileSystemPrompt } from "@/lib/business-brain";
import { buildAgentFunctions } from "@/lib/agent-functions";
import { getTemplateCapabilities, getTemplateVoiceId } from "@/lib/data/agent-templates";

export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  name?: string | null;
  greeting?: string | null;
  agent_name?: string | null;
  vapi_assistant_id?: string | null;
  preferred_language?: string | null;
  elevenlabs_voice_id?: string | null;
  phone?: string | null;
  working_hours?: Record<string, { open?: string; close?: string }> | null;
  knowledge_items?: Array<{ q?: string; a?: string }> | null;
  agent_template?: string | null;
};

export async function POST(req: NextRequest) {
  const session = await getSession(req);
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
      .select("id, name, greeting, agent_name, vapi_assistant_id, preferred_language, elevenlabs_voice_id, phone, working_hours, knowledge_items, agent_template")
      .eq("id", session.workspaceId)
      .single();

    if (wsErr || !ws) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const row = ws as WorkspaceRow;
    const businessName = row.name?.trim() || "Our business";
    const agentName = row.agent_name?.trim() || "Receptionist";
    const greeting = row.greeting?.trim() || `Thanks for calling ${businessName}. How can I help you today?`;
    const hours = row.working_hours && typeof row.working_hours === "object"
      ? Object.fromEntries(
          Object.entries(row.working_hours)
            .filter(([, v]) => v && typeof v === "object" && ("open" in v || "start" in v))
            .map(([k, v]) => {
              const h = v as { open?: string; close?: string; start?: string; end?: string };
              return [k, { start: h.start ?? h.open ?? "09:00", end: h.end ?? h.close ?? "17:00" }];
            })
        )
      : undefined;
    const faq = Array.isArray(row.knowledge_items)
      ? row.knowledge_items.filter((x): x is { q?: string; a?: string } => x && typeof x === "object")
      : [];
    const systemPrompt = compileSystemPrompt({
      business_name: businessName,
      agent_name: agentName,
      greeting,
      preferred_language: row.preferred_language ?? undefined,
      phone: row.phone ?? undefined,
      business_hours: hours,
      faq,
    });
    const capabilities = getTemplateCapabilities(row.agent_template);
    const toolCalls = buildAgentFunctions({ id: row.id, capabilities }).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
    const voiceId = row.elevenlabs_voice_id?.trim() || getTemplateVoiceId(row.agent_template) || null;
    const assistantPayload = {
      name: `${businessName} Agent`,
      systemPrompt,
      firstMessage: greeting,
      endCallMessage: `Thank you for calling ${businessName}. Have a great day!`,
      voiceId,
      language: row.preferred_language ?? null,
      workspaceId: row.id,
      toolCalls,
    };

    let assistantId = row.vapi_assistant_id?.trim() || null;
    if (assistantId) {
      await updateAssistant(assistantId, assistantPayload);
    } else {
      const { id } = await createAssistant(assistantPayload);
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
