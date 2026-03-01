/**
 * GET /api/workspaces/[id]/business-brain — compiled system prompt for voice agent.
 * Uses workspace_business_context + agent knowledge_base. Auth: workspace access required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { compileSystemPrompt } from "@/lib/business-brain";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await context.params;
  const access = await requireWorkspaceAccess(req, workspaceId);
  if (access) return access;

  const db = getDb();
  const [ctxRes, agentRes] = await Promise.all([
    db.from("workspace_business_context").select("business_name, offer_summary, business_hours, faq").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("agents").select("name, greeting, knowledge_base").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
  ]);

  const ctx = ctxRes.data as { business_name?: string; offer_summary?: string; business_hours?: Record<string, unknown>; faq?: Array<{ q?: string; a?: string }> } | null;
  const agent = agentRes.data as { name?: string; greeting?: string; knowledge_base?: Record<string, unknown> } | null;

  const business_name = ctx?.business_name ?? "The business";
  const offer_summary = ctx?.offer_summary ?? "";
  const business_hours = (ctx?.business_hours ?? {}) as Record<string, { start: string; end: string } | null>;
  const faq = ctx?.faq ?? [];
  const agent_name = agent?.name ?? "Sarah";
  const greeting = agent?.greeting ?? undefined;
  const kb = agent?.knowledge_base ?? {};
  const services = typeof kb.services === "string" ? kb.services : undefined;
  const emergencies_after_hours = typeof kb.emergencies_after_hours === "string" ? kb.emergencies_after_hours : undefined;
  const appointment_handling = typeof kb.appointment_handling === "string" ? kb.appointment_handling : undefined;
  const faq_extra = typeof kb.faq_extra === "string" ? kb.faq_extra : undefined;

  const systemPrompt = compileSystemPrompt({
    business_name,
    offer_summary,
    business_hours,
    faq,
    agent_name,
    greeting,
    services,
    emergencies_after_hours,
    appointment_handling,
    faq_extra,
  });

  return NextResponse.json({
    systemPrompt,
    agent_name,
    greeting: greeting ?? null,
  });
}
