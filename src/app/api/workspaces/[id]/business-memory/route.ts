/**
 * Business memory: read/write workspace learnings with provenance
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getBusinessMemoryWithProvenance } from "@/lib/business-memory";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const MEMORY_TYPES = ["common_objections", "avg_buying_cycle_days", "conversion_triggers", "loss_patterns"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const map: Record<string, { content: unknown; provenance: { source_type?: string; confidence?: number; sample_size?: number; last_updated?: string } }> = {};
  for (const t of MEMORY_TYPES) {
    const { content, provenance } = await getBusinessMemoryWithProvenance(id, t);
    if (content) {
      map[t] = { content, provenance };
    }
  }
  return NextResponse.json(map);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authErrPut = await requireWorkspaceAccess(req, id);
  if (authErrPut) return authErrPut;
  let body: { memory_type?: string; content?: unknown; provenance?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const memoryType = body.memory_type;
  const content = body.content ?? {};
  const provenance = body.provenance ?? {};

  if (!memoryType || !MEMORY_TYPES.includes(memoryType as (typeof MEMORY_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid memory_type" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("business_memory")
    .select("id")
    .eq("workspace_id", id)
    .eq("memory_type", memoryType)
    .single();

  const updatePayload = {
    content,
    source_type: (provenance as { source_type?: string }).source_type ?? "manual",
    confidence: (provenance as { confidence?: number }).confidence ?? 0.5,
    sample_size: (provenance as { sample_size?: number }).sample_size ?? null,
    last_updated: now,
  };

  if ((existing as { id?: string })?.id) {
    await db
      .from("business_memory")
      .update(updatePayload)
      .eq("workspace_id", id)
      .eq("memory_type", memoryType);
  } else {
    await db.from("business_memory").insert({
      workspace_id: id,
      memory_type: memoryType,
      ...updatePayload,
    });
  }
  return NextResponse.json({ memory_type: memoryType, content, provenance: updatePayload });
}
