import { getDb } from "@/lib/db/queries";
import { DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import type { KnowledgeItem } from "@/lib/workspace/starter-knowledge";

type DbLike = ReturnType<typeof getDb>;

type WorkspaceAgentSeed = {
  workspaceId: string;
  businessName: string;
  agentName?: string | null;
  greeting?: string | null;
  voiceId?: string | null;
  knowledgeItems?: KnowledgeItem[] | null;
  // Advanced fields from workspace_business_context
  industry?: string | null;
  services?: string | null;
  address?: string | null;
  phone?: string | null;
  primary_goal?: string | null;
  business_context?: string | null;
  target_audience?: string | null;
  assertiveness?: number | null;
  when_hesitation?: string | null;
  when_think_about_it?: string | null;
  when_pricing?: string | null;
  when_competitor?: string | null;
  offer_summary?: string | null;
  business_hours?: Record<string, { start: string; end: string } | null> | null;
  faq?: Array<{ q?: string; a?: string }> | null;
  emergencies_after_hours?: string | null;
  appointment_handling?: string | null;
};

function buildKnowledgeBase(seed: WorkspaceAgentSeed) {
  return {
    services: (seed.knowledgeItems ?? [])
      .filter((item) => item.q?.toLowerCase().includes("service"))
      .map((item) => item.a)
      .filter(Boolean),
    faq: (seed.knowledgeItems ?? []).map((item) => ({
      q: item.q ?? "",
      a: item.a ?? "",
    })),
    // Store advanced fields in knowledge_base for retrieval during compileSystemPrompt
    industry: seed.industry,
    primaryGoal: seed.primary_goal,
    businessContext: seed.business_context,
    targetAudience: seed.target_audience,
    assertiveness: seed.assertiveness,
    whenHesitation: seed.when_hesitation,
    whenThinkAboutIt: seed.when_think_about_it,
    whenPricing: seed.when_pricing,
    whenCompetitor: seed.when_competitor,
    emergencies_after_hours: seed.emergencies_after_hours,
    appointment_handling: seed.appointment_handling,
  };
}

export async function syncPrimaryAgent(
  db: DbLike,
  seed: WorkspaceAgentSeed,
): Promise<{ id: string } | null> {
  const voiceId = seed.voiceId?.trim() || DEFAULT_VOICE_ID;
  const name = seed.agentName?.trim() || "Primary Agent";
  const greeting =
    seed.greeting?.trim() ||
    `Thanks for calling ${seed.businessName}. How can I help you today?`;
  const knowledgeBase = buildKnowledgeBase(seed);

  const firstExisting = (
    await db
      .from("agents")
      .select("id")
      .eq("workspace_id", seed.workspaceId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  ).data;

  const updates = {
    name,
    voice_id: voiceId,
    personality: "professional",
    purpose: "both",
    greeting,
    knowledge_base: knowledgeBase,
    rules: {
      neverSay: [],
      alwaysTransfer: [],
      escalationChain: [],
    },
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (firstExisting) {
    const { data: updated } = await db
      .from("agents")
      .update(updates)
      .eq("id", (firstExisting as { id: string }).id)
      .select("id")
      .maybeSingle();
    return (updated as { id: string } | null) ?? null;
  }

  const { data: created } = await db
    .from("agents")
    .insert({
      workspace_id: seed.workspaceId,
      ...updates,
      stats: {
        totalCalls: 0,
        avgRating: 0,
        appointmentsBooked: 0,
      },
    })
    .select("id")
    .maybeSingle();

  return (created as { id: string } | null) ?? null;
}
