export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { syncPrimaryAgent } from "@/lib/agents/sync-primary-agent";
import { DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;
  const db = getDb();
  const { data, error } = await db.from("agents").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let agents = data ?? [];
  if (agents.length === 0) {
    const { data: workspace } = await db
      .from("workspaces")
      .select("id, name, agent_name, greeting, elevenlabs_voice_id, vapi_assistant_id, knowledge_items")
      .eq("id", workspaceId)
      .maybeSingle();
    const row = workspace as {
      id: string;
      name?: string | null;
      agent_name?: string | null;
      greeting?: string | null;
      elevenlabs_voice_id?: string | null;
      vapi_assistant_id?: string | null;
      knowledge_items?: Array<{ q?: string; a?: string }> | null;
    } | null;
    if (row) {
      try {
        await syncPrimaryAgent(db, {
          workspaceId: row.id,
          businessName: row.name?.trim() || "My Workspace",
          agentName: row.agent_name,
          greeting: row.greeting,
          voiceId: row.elevenlabs_voice_id,
          vapiAssistantId: row.vapi_assistant_id,
          knowledgeItems: row.knowledge_items,
        });
      } catch {
        await db.from("agents").insert({
          workspace_id: row.id,
          name: row.agent_name?.trim() || "Receptionist",
          voice_id: row.elevenlabs_voice_id?.trim() || DEFAULT_VOICE_ID,
          personality: "professional",
          purpose: "both",
          greeting:
            row.greeting?.trim() ||
            `Thanks for calling ${row.name?.trim() || "your business"}. How can I help you today?`,
          knowledge_base: {
            faq: Array.isArray(row.knowledge_items) ? row.knowledge_items : [],
            services: [],
          },
          rules: {
            neverSay: [],
            alwaysTransfer: [],
            escalationChain: [],
          },
          is_active: true,
          vapi_agent_id: row.vapi_assistant_id?.trim() || null,
          stats: {
            totalCalls: 0,
            avgRating: 0,
            appointmentsBooked: 0,
          },
        });
      }
      const { data: seeded } = await db
        .from("agents")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      agents = seeded ?? [];
    }
  }

  return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
  let body: { workspace_id: string; name: string; template?: string; purpose?: string; personality?: string; voice_id?: string; greeting?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { workspace_id, name } = body;
  if (!workspace_id || !name) return NextResponse.json({ error: "workspace_id and name required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspace_id);
  if (err) return err;
  const validPurpose = ["inbound", "outbound", "both"];
  const validPersonality = ["friendly", "professional", "casual", "empathetic"];
  const db = getDb();

  // If workspace has an industry set and no explicit templates were provided,
  // seed from industry_templates for vertical-specific defaults
  let industryGreeting: string | undefined;
  let industryKnowledgeBase: Record<string, unknown> = {};
  let industryRules: Record<string, unknown> = {};

  if (!body.template) {
    const { data: ws } = await db
      .from("workspaces")
      .select("industry")
      .eq("id", workspace_id)
      .maybeSingle();
    const wsRow = ws as { industry?: string | null } | null;
    if (wsRow?.industry) {
      const { data: tmpl } = await db
        .from("industry_templates")
        .select("default_greeting, default_scripts, default_faq, default_follow_up_cadence")
        .eq("industry_slug", wsRow.industry)
        .maybeSingle();
      const t = tmpl as {
        default_greeting?: string | null;
        default_scripts?: unknown;
        default_faq?: unknown;
        default_follow_up_cadence?: unknown;
      } | null;
      if (t) {
        industryGreeting = t.default_greeting ?? undefined;
        industryKnowledgeBase = { faq: t.default_faq ?? [], services: [] };
        industryRules = {
          templates: t.default_scripts ?? {},
          followUpCadence: t.default_follow_up_cadence ?? {},
          neverSay: [],
          alwaysTransfer: [],
          escalationChain: [],
        };
      }
    }
  }

  const { data: agent, error } = await db.from("agents").insert({
    workspace_id,
    name,
    personality: validPersonality.includes(body.personality ?? "") ? body.personality : "professional",
    purpose: validPurpose.includes(body.purpose ?? "") ? body.purpose : "both",
    greeting: body.greeting || industryGreeting || `Hi, thanks for calling! This is ${name}. How can I help you today?`,
    ...(body.template ? { template: body.template } : {}),
    ...(body.voice_id ? { voice_id: body.voice_id } : {}),
    knowledge_base: Object.keys(industryKnowledgeBase).length > 0 ? industryKnowledgeBase : {},
    rules: Object.keys(industryRules).length > 0 ? industryRules : {},
    is_active: true,
  }).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(agent);
}
