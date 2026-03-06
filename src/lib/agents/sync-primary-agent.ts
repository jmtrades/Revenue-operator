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
  vapiAssistantId?: string | null;
  knowledgeItems?: KnowledgeItem[] | null;
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
  };
}

export async function syncPrimaryAgent(
  db: DbLike,
  seed: WorkspaceAgentSeed,
): Promise<{ id: string } | null> {
  const voiceId = seed.voiceId?.trim() || DEFAULT_VOICE_ID;
  const name = seed.agentName?.trim() || "Receptionist";
  const greeting =
    seed.greeting?.trim() ||
    `Thanks for calling ${seed.businessName}. How can I help you today?`;
  const knowledgeBase = buildKnowledgeBase(seed);

  const { data: existingByVapi } = seed.vapiAssistantId
    ? await db
        .from("agents")
        .select("id")
        .eq("workspace_id", seed.workspaceId)
        .eq("vapi_agent_id", seed.vapiAssistantId)
        .maybeSingle()
    : { data: null };

  const firstExisting =
    existingByVapi ??
    (
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
    vapi_agent_id: seed.vapiAssistantId?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (firstExisting) {
    const { data: updated } = await db
      .from("agents")
      .update(updates)
      .eq("id", (firstExisting as { id: string }).id)
      .select("id")
      .single();
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
    .single();

  return (created as { id: string } | null) ?? null;
}
