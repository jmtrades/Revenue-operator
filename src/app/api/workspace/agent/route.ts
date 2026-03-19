/**
 * GET /api/workspace/agent — Load agent config (greeting, voice, knowledge, etc.) for current workspace.
 * PATCH /api/workspace/agent — Update agent config and sync to voice provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { syncPrimaryAgent } from "@/lib/agents/sync-primary-agent";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { data, error } = await db
      .from("workspaces")
      .select("id, name, greeting, agent_name, preferred_language, elevenlabs_voice_id, phone, working_hours, knowledge_items, agent_template")
      .eq("id", session.workspaceId)
      .maybeSingle();

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

    // For backwards compatibility, return elevenlabsVoiceId if it exists, otherwise empty string
    const voiceId = row.elevenlabs_voice_id ?? "";

    return NextResponse.json({
      businessName: row.name ?? "",
      greeting: row.greeting ?? "",
      agentName: row.agent_name ?? "",
      preferredLanguage: row.preferred_language ?? "en",
      voiceId,
      elevenlabsVoiceId: voiceId, // Deprecated: kept for backwards compatibility
      phone: row.phone ?? "",
      workingHours: row.working_hours ?? undefined,
      knowledgeItems: Array.isArray(row.knowledge_items) ? row.knowledge_items : [],
      agentTemplate: row.agent_template ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const MAX_PAYLOAD_BYTES = 500_000; // 500KB

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErrPatch = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPatch) return authErrPatch;

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: {
    businessName?: string;
    greeting?: string;
    agentName?: string;
    preferredLanguage?: string;
    voiceId?: string;
    elevenlabsVoiceId?: string; // Deprecated but kept for backwards compatibility
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
  // Accept both voiceId and elevenlabsVoiceId for backwards compatibility
  const voiceIdValue = body.voiceId ?? body.elevenlabsVoiceId;
  if (typeof voiceIdValue === "string") update.elevenlabs_voice_id = voiceIdValue.trim() || null;
  if (Array.isArray(body.knowledgeItems)) update.knowledge_items = body.knowledgeItems;
  if (body.workingHours && typeof body.workingHours === "object") update.working_hours = body.workingHours;

  try {
    const db = getDb();
    const { error } = await db.from("workspaces").update(update).eq("id", session.workspaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const voiceId = typeof update.elevenlabs_voice_id === "string" ? update.elevenlabs_voice_id : null;
    const agentName = typeof update.agent_name === "string" ? update.agent_name : null;
    const greeting = typeof update.greeting === "string" ? update.greeting : null;
    const businessName = typeof update.name === "string" ? update.name : "My Workspace";
    await syncPrimaryAgent(db, {
      workspaceId: session.workspaceId,
      businessName,
      agentName,
      greeting,
      voiceId,
      knowledgeItems: Array.isArray(update.knowledge_items)
        ? (update.knowledge_items as Array<{ q?: string; a?: string }>)
        : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
