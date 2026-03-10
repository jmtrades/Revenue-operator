import { getDb } from "@/lib/db/queries";
import { createAssistant, updateAssistant } from "@/lib/vapi";
import { buildAgentFunctions } from "@/lib/agent-functions";
import { buildVapiSystemPrompt } from "@/lib/agents/build-vapi-system-prompt";
import { DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { hasVapiServerKey } from "@/lib/vapi/env";

type DbLike = ReturnType<typeof getDb>;

type VoiceSettings = {
  stability?: number;
  speed?: number;
  responseDelay?: number;
  backchannel?: boolean;
  denoising?: boolean;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
};

type AgentKnowledgeBase = {
  services?: string[];
  faq?: Array<{ q?: string; a?: string }>;
  specialInstructions?: string;
  websiteUrl?: string;
  bookingEnabled?: boolean;
  afterHoursMode?: "messages" | "emergency" | "forward" | "closed" | null;
  maxCallDuration?: number;
  callStyle?: "thorough" | "conversational" | "quick" | null;
  voiceSettings?: VoiceSettings;
  qualification?: { criteria?: Array<{ label?: string; enabled?: boolean }>; customCriterion?: string };
  objections?: Array<{ trigger?: string; response?: string }>;
  confusedCallerHandling?: string | null;
  offTopicHandling?: string | null;
  primaryGoal?: string | null;
  businessContext?: string | null;
  targetAudience?: string | null;
  assertiveness?: number | null;
  whenHesitation?: string | null;
  whenThinkAboutIt?: string | null;
  whenPricing?: string | null;
  whenCompetitor?: string | null;
};

type AgentRules = {
  neverSay?: string[];
  alwaysTransfer?: string[];
  transferPhone?: string | null;
  transferRules?: Array<{ phrase?: string; phone?: string }>;
  learnedBehaviors?: string[];
  qualificationQuestions?: string[];
  objectionHandling?: {
    price?: string;
    timing?: string;
    competitor?: string;
    notInterested?: string;
  };
  escalationTriggers?: string[];
};

type AgentRow = {
  id: string;
  workspace_id: string;
  name?: string | null;
  greeting?: string | null;
  voice_id?: string | null;
  personality?: string | null;
  knowledge_base?: AgentKnowledgeBase | null;
  rules?: AgentRules | null;
  vapi_agent_id?: string | null;
  purpose?: string | null;
  is_active?: boolean | null;
};

type WorkspaceRow = {
  id: string;
  name?: string | null;
  preferred_language?: string | null;
  vapi_assistant_id?: string | null;
  address?: string | null;
  working_hours?: Record<string, { open?: string; close?: string }> | string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function syncVapiAgent(db: DbLike, agentId: string): Promise<{ assistantId: string }> {
  if (!hasVapiServerKey()) {
    throw new Error("Vapi is not configured");
  }

  const { data: agentData, error: agentError } = await db
    .from("agents")
    .select("id, workspace_id, name, greeting, voice_id, personality, knowledge_base, rules, vapi_agent_id, purpose, is_active")
    .eq("id", agentId)
    .single();
  if (agentError || !agentData) {
    throw new Error("Agent not found");
  }

  const agent = agentData as AgentRow;
  const { data: workspaceData, error: workspaceError } = await db
    .from("workspaces")
    .select("id, name, preferred_language, vapi_assistant_id, address, working_hours")
    .eq("id", agent.workspace_id)
    .single();
  if (workspaceError || !workspaceData) {
    throw new Error("Workspace not found");
  }

  const workspace = workspaceData as WorkspaceRow;
  const knowledgeBase = agent.knowledge_base ?? {};
  const rules = agent.rules ?? {};
  const voiceSettings = knowledgeBase.voiceSettings ?? {};
  const businessName =
    workspace.name?.trim() ||
    // prefer explicit business_name column if present on the row
    (workspace as { business_name?: string | null }).business_name?.trim() ||
    "My Workspace";
  const greeting =
    agent.greeting?.trim() ||
    `Thanks for calling ${businessName}. How can I help you today?`;
  const voiceId = agent.voice_id?.trim() || DEFAULT_VOICE_ID;
  const caps = ["capture_leads", "transfer_calls", "follow_up"];
  if (knowledgeBase.bookingEnabled !== false) {
    caps.push("book_appointments");
  }
  if (agent.purpose === "outbound") {
    caps.push("outbound_calls");
  }

  let businessHours: string | null = null;
  if (workspace.working_hours && typeof workspace.working_hours === "object" && !Array.isArray(workspace.working_hours)) {
    businessHours = Object.entries(workspace.working_hours)
      .map(([day, hours]) => {
        const open = (hours as { open?: string })?.open ?? "";
        const close = (hours as { close?: string })?.close ?? "";
        return `${day}: ${open}-${close}`.trim();
      })
      .filter(Boolean)
      .join("; ") || null;
  } else if (typeof workspace.working_hours === "string" && workspace.working_hours.trim()) {
    businessHours = workspace.working_hours.trim();
  }

  const qualificationCriteria =
    Array.isArray(knowledgeBase.qualification?.criteria) &&
    knowledgeBase.qualification.criteria.length > 0
      ? knowledgeBase.qualification.criteria
          .filter((c) => c.enabled && (c.label ?? "").trim())
          .map((c) => (c.label ?? "").trim())
      : [];

  const qualificationQuestions =
    Array.isArray(rules.qualificationQuestions) && rules.qualificationQuestions.length > 0
      ? rules.qualificationQuestions
          .map((q) => String(q ?? "").trim())
          .filter((q) => q.length > 0)
      : [];

  const escalationTriggers =
    Array.isArray(rules.escalationTriggers) && rules.escalationTriggers.length > 0
      ? rules.escalationTriggers
          .map((t) => String(t ?? "").trim())
          .filter((t) => t.length > 0)
      : [];

  const objectionsFromKnowledge =
    Array.isArray(knowledgeBase.objections) && knowledgeBase.objections.length > 0
      ? knowledgeBase.objections
      : [];

  const objectionsFromRules: Array<{ trigger: string; response: string }> = [];
  const ruleObj = rules.objectionHandling ?? {};
  const pushIf = (trigger: string, maybe: unknown) => {
    const response = typeof maybe === "string" ? maybe.trim() : "";
    if (!response) return;
    objectionsFromRules.push({ trigger, response });
  };
  pushIf("Price feels too high", ruleObj.price);
  pushIf("Now is not the right time", ruleObj.timing);
  pushIf("They are comparing you to competitors", ruleObj.competitor);
  pushIf("They say they're not interested", ruleObj.notInterested);

  const objectionsCombined: Array<{ trigger?: string; response?: string }> = [
    ...objectionsFromKnowledge,
    ...objectionsFromRules,
  ];

  const assistantPayload = {
    name: `${businessName} - ${agent.name?.trim() || "Receptionist"}`,
    systemPrompt: buildVapiSystemPrompt({
      businessName,
      industry: null,
      agentName: agent.name?.trim() || "Receptionist",
      greeting,
      services: Array.isArray(knowledgeBase.services) ? knowledgeBase.services : [],
      faq: Array.isArray(knowledgeBase.faq) ? knowledgeBase.faq : [],
      specialInstructions: knowledgeBase.specialInstructions ?? "",
      rules: {
        neverSay: Array.isArray(rules.neverSay) ? rules.neverSay : [],
        alwaysTransfer: Array.isArray(rules.alwaysTransfer) ? rules.alwaysTransfer : [],
        escalationTriggers,
        transferPhone: rules.transferPhone ?? null,
        transferRules: Array.isArray(rules.transferRules) ? rules.transferRules : [],
      },
      afterHoursMode: knowledgeBase.afterHoursMode ?? null,
      callStyle: knowledgeBase.callStyle ?? null,
      personality: agent.personality ?? null,
      qualificationCriteria,
      qualificationQuestions,
      objections: objectionsCombined,
      confusedCallerHandling: knowledgeBase.confusedCallerHandling ?? null,
      offTopicHandling: knowledgeBase.offTopicHandling ?? null,
      businessHours,
      address: workspace.address?.trim() || null,
      primaryGoal: knowledgeBase.primaryGoal ?? null,
      businessContext: knowledgeBase.businessContext ?? null,
      targetAudience: knowledgeBase.targetAudience ?? null,
      assertiveness: knowledgeBase.assertiveness ?? null,
      whenHesitation: knowledgeBase.whenHesitation ?? null,
      whenThinkAboutIt: knowledgeBase.whenThinkAboutIt ?? null,
      whenPricing: knowledgeBase.whenPricing ?? null,
      whenCompetitor: knowledgeBase.whenCompetitor ?? null,
      learnedBehaviors: Array.isArray(rules.learnedBehaviors) ? rules.learnedBehaviors : [],
    }),
    firstMessage: greeting,
    endCallMessage: "Thanks for calling. Have a great day!",
    voiceId,
    language: workspace.preferred_language ?? "en",
    workspaceId: workspace.id,
    toolCalls: buildAgentFunctions({ id: workspace.id, capabilities: caps }).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
    voiceSettings: {
      stability:
        typeof voiceSettings.stability === "number"
          ? clamp(voiceSettings.stability, 0, 1)
          : 0.55,
      speed:
        typeof voiceSettings.speed === "number"
          ? clamp(voiceSettings.speed, 0.8, 1.3)
          : 1,
      responseDelay:
        typeof voiceSettings.responseDelay === "number"
          ? clamp(voiceSettings.responseDelay, 0, 1.5)
          : 0.4,
      backchannel:
        typeof voiceSettings.backchannel === "boolean"
          ? voiceSettings.backchannel
          : true,
      denoising:
        typeof voiceSettings.denoising === "boolean"
          ? voiceSettings.denoising
          : true,
      similarityBoost:
        typeof voiceSettings.similarityBoost === "number"
          ? clamp(voiceSettings.similarityBoost, 0, 1)
          : 0.8,
      style:
        typeof voiceSettings.style === "number"
          ? clamp(voiceSettings.style, 0, 1)
          : 0.35,
      useSpeakerBoost:
        typeof voiceSettings.useSpeakerBoost === "boolean"
          ? voiceSettings.useSpeakerBoost
          : true,
    },
    maxDurationSeconds:
      typeof knowledgeBase.maxCallDuration === "number" && knowledgeBase.maxCallDuration > 0
        ? knowledgeBase.maxCallDuration * 60
        : 600,
  };

  let assistantId = agent.vapi_agent_id?.trim() || null;
  if (assistantId) {
    await updateAssistant(assistantId, assistantPayload);
  } else {
    const created = await createAssistant(assistantPayload);
    assistantId = created.id;
  }

  await db
    .from("agents")
    .update({
      vapi_agent_id: assistantId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agent.id);

  if (agent.is_active !== false) {
    await db
      .from("workspaces")
      .update({
        vapi_assistant_id: assistantId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace.id);
  }

  return { assistantId };
}
