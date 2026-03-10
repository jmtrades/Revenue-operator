/**
 * POST /api/workspace/create — Persist onboarding data to workspace (requires session).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { sendAgentLiveEmail } from "@/lib/email/agent-live";
import { buildStarterKnowledge, mergeKnowledgeItems } from "@/lib/workspace/starter-knowledge";
import { syncPrimaryAgent } from "@/lib/agents/sync-primary-agent";

export const dynamic = "force-dynamic";

interface OnboardingPayload {
  businessName?: string;
  businessPhone?: string;
  website?: string;
  address?: string;
  industry?: string;
  useCases?: string[];
  orgType?: string;
  agentTemplate?: string;
  agentName?: string;
  greeting?: string;
  businessHours?: Record<string, unknown>;
  knowledgeItems?: unknown[];
  preferredLanguage?: string;
  elevenlabsVoiceId?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: OnboardingPayload;
  try {
    body = (await req.json()) as OnboardingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.businessName === "string" ? body.businessName.trim() || "My Workspace" : "My Workspace";
  const phone = typeof body.businessPhone === "string" ? body.businessPhone.trim() || null : null;
  const website = typeof body.website === "string" ? body.website.trim() || null : null;
  const address = typeof body.address === "string" ? body.address.trim() || null : null;
  const industry = typeof body.industry === "string" ? body.industry.trim() || null : null;
  const useCases = Array.isArray(body.useCases) ? body.useCases.filter((u): u is string => typeof u === "string") : null;
  const agentTemplate = typeof body.agentTemplate === "string" ? body.agentTemplate : null;
  const agentName = typeof body.agentName === "string" ? body.agentName : null;
  const greeting = typeof body.greeting === "string" ? body.greeting : null;
  const businessHours = body.businessHours && typeof body.businessHours === "object" ? body.businessHours : null;
  const rawKnowledgeItems = Array.isArray(body.knowledgeItems) ? body.knowledgeItems : null;
  const preferredLanguage = typeof body.preferredLanguage === "string" ? body.preferredLanguage.trim() || null : null;
  const elevenlabsVoiceId = typeof body.elevenlabsVoiceId === "string" ? body.elevenlabsVoiceId.trim() || null : null;

  try {
    const db = getDb();
    let workspaceId = session.workspaceId;

    if (!workspaceId) {
      const { data: created, error: createErr } = await db
        .from("workspaces")
        .insert({ name, owner_id: session.userId, autonomy_level: "assisted", kill_switch: false })
        .select("id")
        .single();
      if (createErr || !created) {
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
      }
      workspaceId = (created as { id: string }).id;
      await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
    }

    const starterKnowledge = buildStarterKnowledge({
      industry,
      useCases,
      address,
      businessHours,
    });
    const knowledgeItems = mergeKnowledgeItems(
      rawKnowledgeItems as Array<{ q?: string; a?: string }> | null,
      starterKnowledge,
    );

    const update: Record<string, unknown> = { name, updated_at: new Date().toISOString() };
    if (phone !== null) update.phone = phone;
    if (website !== null) update.website = website;
    if (address !== null) update.address = address;
    if (industry !== null) update.industry = industry;
    if (agentTemplate !== null) update.agent_template = agentTemplate;
    if (agentName !== null) update.agent_name = agentName;
    if (greeting !== null) update.greeting = greeting;
    if (businessHours !== null) update.working_hours = businessHours;
    if (knowledgeItems !== null) update.knowledge_items = knowledgeItems;
    if (preferredLanguage !== null) update.preferred_language = preferredLanguage;
    if (elevenlabsVoiceId !== null) update.elevenlabs_voice_id = elevenlabsVoiceId;

    const { error: updateErr } = await db.from("workspaces").update(update).eq("id", workspaceId);
    if (updateErr) {
      return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
    }

    // Ensure workspace_business_context has the business_name for sidebar and brain.
    try {
      await db
        .from("workspace_business_context")
        .upsert(
          {
            workspace_id: workspaceId,
            business_name: name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" },
        );
    } catch {
      // Non-fatal; business context can be completed later.
    }

    await syncPrimaryAgent(db, {
      workspaceId,
      businessName: name,
      agentName,
      greeting,
      voiceId: elevenlabsVoiceId,
      knowledgeItems,
    });

    sendAgentLiveEmail(workspaceId).catch(() => {});

    return NextResponse.json({ ok: true, workspaceId });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
