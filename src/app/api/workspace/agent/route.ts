/**
 * GET /api/workspace/agent — Load agent config (greeting, voice, knowledge, etc.) for current workspace.
 * PATCH /api/workspace/agent — Update agent config; then call POST /api/vapi/create-agent to sync to Vapi.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const { data, error } = await db
      .from("workspaces")
      .select("id, name, greeting, agent_name, preferred_language, elevenlabs_voice_id, phone, working_hours, knowledge_items, agent_template")
      .eq("id", session.workspaceId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const row = data as {
      id: string;
      name?: string | null;
      greeting?: string | null;
      agent_name?: string | null;
      preferred_language?: string | null;
      elevenlabs_voice_id?: string | null;
      phone?: string | null;
      working_hours?: unknown;
      knowledge_items?: unknown;
      agent_template?: string | null;
    };

    return NextResponse.json({
      businessName: row.name ?? "",
      greeting: row.greeting ?? "",
      agentName: row.agent_name ?? "",
      preferredLanguage: row.preferred_language ?? "en",
      elevenlabsVoiceId: row.elevenlabs_voice_id ?? "",
      phone: row.phone ?? "",
      workingHours: row.working_hours ?? undefined,
      knowledgeItems: Array.isArray(row.knowledge_items) ? row.knowledge_items : [],
      agentTemplate: row.agent_template ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    businessName?: string;
    greeting?: string;
    agentName?: string;
    preferredLanguage?: string;
    elevenlabsVoiceId?: string;
    knowledgeItems?: Array<{ q?: string; a?: string }>;
    workingHours?: Record<string, unknown>;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.businessName === "string") update.name = body.businessName.trim() || "My Workspace";
  if (typeof body.greeting === "string") update.greeting = body.greeting.trim();
  if (typeof body.agentName === "string") update.agent_name = body.agentName.trim();
  if (typeof body.preferredLanguage === "string") update.preferred_language = body.preferredLanguage.trim() || "en";
  if (typeof body.elevenlabsVoiceId === "string") update.elevenlabs_voice_id = body.elevenlabsVoiceId.trim() || null;
  if (Array.isArray(body.knowledgeItems)) update.knowledge_items = body.knowledgeItems;
  if (body.workingHours && typeof body.workingHours === "object") update.working_hours = body.workingHours;

  try {
    const db = getDb();
    const { error } = await db.from("workspaces").update(update).eq("id", session.workspaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
