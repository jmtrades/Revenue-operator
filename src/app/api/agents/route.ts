export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { syncPrimaryAgent } from "@/lib/agents/sync-primary-agent";
import { DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { canCreateAgent } from "@/lib/billing/plan-enforcement";
import { VOICE_TIER_LIMITS } from "@/lib/voice/billing";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;
  const db = getDb();
  const { data, error } = await db.from("agents").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not process agent configuration. Please try again." }, { status: 500 });

  let agents = data ?? [];
  if (agents.length === 0) {
    const { data: workspace } = await db
      .from("workspaces")
      .select("id, name, agent_name, greeting, voice_id, knowledge_items")
      .eq("id", workspaceId)
      .maybeSingle();
    const row = workspace as {
      id: string;
      name?: string | null;
      agent_name?: string | null;
      greeting?: string | null;
      voice_id?: string | null;
      knowledge_items?: Array<{ q?: string; a?: string }> | null;
    } | null;
    if (row) {
      try {
        await syncPrimaryAgent(db, {
          workspaceId: row.id,
          businessName: row.name?.trim() || "My Workspace",
          agentName: row.agent_name,
          greeting: row.greeting,
          voiceId: row.voice_id,
          knowledgeItems: row.knowledge_items,
        });
      } catch {
        await db.from("agents").insert({
          workspace_id: row.id,
          name: row.agent_name?.trim() || "Primary Agent",
          voice_id: row.voice_id?.trim() || DEFAULT_VOICE_ID,
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
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id: string; name: string; template?: string; purpose?: string; personality?: string; voice_id?: string; greeting?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { workspace_id } = body;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!workspace_id || !name) return NextResponse.json({ error: "workspace_id and name required" }, { status: 400 });
  if (name.length > 255) return NextResponse.json({ error: "Agent name must be 255 characters or less" }, { status: 400 });

  // Validate voice_id against known voices and tier limits if provided
  if (body.voice_id) {
    try {
      const { RECALL_VOICES } = await import("@/lib/constants/recall-voices");
      const validVoiceIds = RECALL_VOICES.map((v: { id: string }) => v.id);
      if (!validVoiceIds.includes(body.voice_id)) {
        return NextResponse.json({ error: "Invalid voice_id. Please select a valid voice." }, { status: 400 });
      }

      // Check if voice is premium and if user's plan allows it
      const voice = RECALL_VOICES.find((v: { id: string }) => v.id === body.voice_id);
      const isPremiumVoice = voice && !["us-female-warm-receptionist", "us-female-professional", "us-female-casual", "us-male-confident", "us-male-casual", "us-male-professional"].includes(voice.id);

      if (isPremiumVoice) {
        const { data: wsData } = await getDb()
          .from("workspaces")
          .select("billing_tier")
          .eq("id", workspace_id)
          .maybeSingle();

        const wsTier = (wsData as { billing_tier?: string } | null)?.billing_tier?.toLowerCase() || "solo";
        const validTier = (["solo", "business", "scale", "enterprise"].includes(wsTier) ? wsTier : "solo") as keyof typeof VOICE_TIER_LIMITS;
        const limits = VOICE_TIER_LIMITS[validTier];

        if (!limits.premium_voices) {
          return NextResponse.json(
            {
              error: "Voice not available on your plan",
              reason: "voice_not_available",
              message: `The voice "${voice.name}" is only available on our Business plan or higher. Upgrade to access premium voices.`,
            },
            { status: 403 }
          );
        }
      }
    } catch (err) {
      // If voice list can't be loaded, allow any voice_id (graceful degradation)
      log("warn", "[agents POST] Could not validate voice_id:", { detail: err });
    }
  }

  const err = await requireWorkspaceAccess(req, workspace_id);
  if (err) return err;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`create-agent:${workspace_id}`, 10, 60_000);
  if (!rl.allowed) {
    const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.max(0, retryAfterSeconds)) } }
    );
  }
  // Enforce plan limit on agent creation
  const enforcement = await canCreateAgent(workspace_id);
  if (!enforcement.allowed) {
    return NextResponse.json(
      {
        error: enforcement.message,
        reason: enforcement.reason,
        upgrade_to: enforcement.upgradeTo,
        current: enforcement.current,
        limit: enforcement.limit,
      },
      { status: 403 }
    );
  }

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

  // NOTE: Do not set vapi_agent_id for new agents. Keep reading it for backwards compatibility with existing agents.
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
  if (error) return NextResponse.json({ error: "Could not process agent configuration. Please try again." }, { status: 500 });
  return NextResponse.json(agent);
}
