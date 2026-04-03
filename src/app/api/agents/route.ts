export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/queries";
import { syncPrimaryAgent } from "@/lib/agents/sync-primary-agent";
import { DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { canCreateAgent } from "@/lib/billing/plan-enforcement";
import { VOICE_TIER_LIMITS } from "@/lib/voice/billing";
import { log } from "@/lib/logger";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiBadRequest, apiForbidden, apiInternalError, apiRateLimited, apiValidationError } from "@/lib/api/errors";

export const GET = withWorkspace(async (_req: NextRequest, ctx: WorkspaceContext) => {
  const { workspaceId } = ctx;
  const db = getDb();
  const { data, error } = await db.from("agents").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) return apiInternalError("Could not process agent configuration. Please try again.");

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

  return apiOk({ agents });
});

export const POST = withWorkspace(
  async (req: NextRequest, ctx: WorkspaceContext) => {
    const { workspaceId } = ctx;

    let body: { name: string; template?: string; purpose?: string; personality?: string; voice_id?: string; greeting?: string };
    try {
      body = await req.json();
    } catch {
      return apiBadRequest("Invalid JSON");
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return apiValidationError("Agent name is required");
    if (name.length > 255) return apiValidationError("Agent name must be 255 characters or less");

    // Validate voice_id against known voices and tier limits if provided
    if (body.voice_id) {
      try {
        const { RECALL_VOICES } = await import("@/lib/constants/recall-voices");
        const validVoiceIds = RECALL_VOICES.map((v: { id: string }) => v.id);
        if (!validVoiceIds.includes(body.voice_id)) {
          return apiValidationError("Invalid voice_id. Please select a valid voice.");
        }

        const voice = RECALL_VOICES.find((v: { id: string }) => v.id === body.voice_id);
        const isPremiumVoice = voice && !["us-female-warm-receptionist", "us-female-professional", "us-female-casual", "us-male-confident", "us-male-casual", "us-male-professional"].includes(voice.id);

        if (isPremiumVoice) {
          const { data: wsData } = await getDb()
            .from("workspaces")
            .select("billing_tier")
            .eq("id", workspaceId)
            .maybeSingle();

          const wsTier = (wsData as { billing_tier?: string } | null)?.billing_tier?.toLowerCase() || "solo";
          const validTier = (["solo", "business", "scale", "enterprise"].includes(wsTier) ? wsTier : "solo") as keyof typeof VOICE_TIER_LIMITS;
          const limits = VOICE_TIER_LIMITS[validTier];

          if (!limits.premium_voices) {
            return apiForbidden(`The voice "${voice.name}" is only available on Business plan or higher. Upgrade to access premium voices.`);
          }
        }
      } catch (err) {
        log("warn", "agents.voice_validation_failed", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Enforce plan limit on agent creation
    const enforcement = await canCreateAgent(workspaceId);
    if (!enforcement.allowed) {
      return apiForbidden(enforcement.message ?? "Agent limit reached");
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
        .eq("id", workspaceId)
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
      workspace_id: workspaceId,
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
    if (error) return apiInternalError("Could not process agent configuration. Please try again.");
    return apiOk(agent, 201);
  },
  { rateLimit: { key: "create-agent:{workspaceId}", max: 10, windowMs: 60_000 } },
);
