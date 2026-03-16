/**
 * Business Memory Layer
 * Store structured workspace learnings. Inject into reasoning. Never modify past messages.
 */

import { getDb } from "@/lib/db/queries";

export type MemoryType =
  | "common_objections"
  | "avg_buying_cycle_days"
  | "conversion_triggers"
  | "loss_patterns";

export interface MemoryContent {
  items?: string[];
  value?: number;
  patterns?: string[];
  [key: string]: unknown;
}

export interface MemoryProvenance {
  source_type?: "derived" | "manual";
  confidence?: number;
  sample_size?: number;
  last_updated?: string;
}

const CONFIDENCE_THRESHOLD = 0.6;

export async function getBusinessMemory(
  workspaceId: string,
  memoryType: MemoryType
): Promise<MemoryContent | null> {
  const db = getDb();
  const { data } = await db
    .from("business_memory")
    .select("content")
    .eq("workspace_id", workspaceId)
    .eq("memory_type", memoryType)
    .maybeSingle();
  return (data as { content?: MemoryContent })?.content ?? null;
}

export async function getBusinessMemoryWithProvenance(
  workspaceId: string,
  memoryType: MemoryType
): Promise<{ content: MemoryContent | null; provenance: MemoryProvenance }> {
  const db = getDb();
  const { data } = await db
    .from("business_memory")
    .select("content, source_type, confidence, sample_size, last_updated")
    .eq("workspace_id", workspaceId)
    .eq("memory_type", memoryType)
    .maybeSingle();
  const row = data as { content?: MemoryContent; source_type?: string; confidence?: number; sample_size?: number; last_updated?: string } | null;
  return {
    content: row?.content ?? null,
    provenance: {
      source_type: (row?.source_type as "derived" | "manual") ?? "manual",
      confidence: row?.confidence ?? 0.5,
      sample_size: row?.sample_size,
      last_updated: row?.last_updated ?? undefined,
    },
  };
}

export async function setBusinessMemory(
  workspaceId: string,
  memoryType: MemoryType,
  content: MemoryContent,
  source?: string,
  provenance?: Partial<MemoryProvenance>
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("business_memory")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("memory_type", memoryType)
    .maybeSingle();
  const updatePayload = {
    content,
    source: source ?? null,
    source_type: provenance?.source_type ?? "manual",
    confidence: provenance?.confidence ?? 0.5,
    sample_size: provenance?.sample_size ?? null,
    last_updated: now,
  };
  if ((existing as { id?: string })?.id) {
    await db.from("business_memory").update(updatePayload).eq("workspace_id", workspaceId).eq("memory_type", memoryType);
  } else {
    await db.from("business_memory").insert({
      workspace_id: workspaceId,
      memory_type: memoryType,
      ...updatePayload,
    });
  }
}

export async function getMemoryContextForReasoning(workspaceId: string): Promise<string> {
  const parts: string[] = [];
  const types: MemoryType[] = ["common_objections", "avg_buying_cycle_days", "conversion_triggers", "loss_patterns"];
  for (const t of types) {
    const { content: mem, provenance } = await getBusinessMemoryWithProvenance(workspaceId, t);
    if (!mem || (provenance.confidence ?? 0) < CONFIDENCE_THRESHOLD) continue;
    if (t === "common_objections" && Array.isArray(mem.items)) {
      parts.push(`Common objections: ${mem.items.join("; ")}`);
    }
    if (t === "avg_buying_cycle_days" && typeof mem.value === "number") {
      parts.push(`Avg buying cycle: ${mem.value} days`);
    }
    if (t === "conversion_triggers" && Array.isArray(mem.items)) {
      parts.push(`Conversion triggers: ${mem.items.join("; ")}`);
    }
    if (t === "loss_patterns" && Array.isArray(mem.patterns)) {
      parts.push(`Loss patterns: ${mem.patterns.join("; ")}`);
    }
  }
  return parts.length > 0 ? `Workspace learnings: ${parts.join(". ")}` : "";
}
