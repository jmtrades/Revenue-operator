/**
 * GET /api/workspace/agent — Load agent config (greeting, voice, knowledge, etc.) for current workspace.
 * PATCH /api/workspace/agent — Update agent config and sync to voice provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { syncPrimaryAgent } from "@/lib/agents/sync-primary-agent";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { data, error } = await db
      .from("workspaces")
      .select("id, name, greeting, agent_name, preferred_language, voice_id, phone, working_hours, knowledge_items, agent_template, qualification_method, tone_preset, transfer_policy, transfer_number, escalation_threshold, escalation_triggers, allowed_actions, forbidden_actions, objections, custom_qualification_questions")
      .eq("id", session.workspaceId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const row = data as {
      id: string;
      name?: string | null;
      greeting?: string | null;
      agent_name?: string | null;
      preferred_language?: string | null;
      voice_id?: string | null;
      phone?: string | null;
      working_hours?: unknown;
      knowledge_items?: unknown;
      agent_template?: string | null;
      qualification_method?: string | null;
      tone_preset?: string | null;
      transfer_policy?: string | null;
      transfer_number?: string | null;
      escalation_threshold?: string | null;
      escalation_triggers?: string | null;
      allowed_actions?: unknown;
      forbidden_actions?: unknown;
      objections?: unknown;
      custom_qualification_questions?: unknown;
    };

    // Fetch business context data
    let businessContext: {
      industry?: string | null;
      services_offered?: string | null;
      primary_goal?: string | null;
      unique_selling_points?: string | null;
      target_audience?: string | null;
    } = {};

    try {
      const { data: bcData } = await db
        .from("workspace_business_context")
        .select("industry, services_offered, primary_goal, unique_selling_points, target_audience")
        .eq("workspace_id", session.workspaceId)
        .maybeSingle();

      if (bcData) {
        businessContext = bcData as typeof businessContext;
      }
    } catch (bc_err) {
      // If table doesn't exist or query fails, just continue without business context
      log("warn", "[workspace/agent] business context query failed");
    }

    // For backwards compatibility, return elevenlabsVoiceId if it exists, otherwise empty string
    const voiceId = row.voice_id ?? "";

    return NextResponse.json({
      businessName: row.name ?? "",
      greeting: row.greeting ?? "",
      agentName: row.agent_name ?? "",
      preferredLanguage: row.preferred_language ?? "en",
      voiceId,
      elevenlabsVoiceId: voiceId, // Deprecated: kept for backwards compatibility
      phone: row.phone ?? "",
      workingHours: row.working_hours ?? undefined,
      knowledgeItems: Array.isArray(row.knowledge_items) ? row.knowledge_items : [],
      agentTemplate: row.agent_template ?? null,
      qualificationMethod: row.qualification_method ?? "None",
      tonePreset: row.tone_preset ?? "Professional",
      transferPolicy: row.transfer_policy ?? "Never",
      transferNumber: row.transfer_number ?? "",
      escalationThreshold: row.escalation_threshold ?? "Balanced",
      escalationTriggers: row.escalation_triggers ?? "",
      allowedActions: Array.isArray(row.allowed_actions) ? row.allowed_actions : [],
      forbiddenActions: Array.isArray(row.forbidden_actions) ? row.forbidden_actions : [],
      objections: Array.isArray(row.objections) ? row.objections : [],
      customQualificationQuestions: Array.isArray(row.custom_qualification_questions) ? row.custom_qualification_questions : [],
      // Business context fields
      industry: businessContext.industry ?? "",
      servicesOffered: businessContext.services_offered ?? "",
      primaryGoal: businessContext.primary_goal ?? "",
      uniqueSellingPoints: businessContext.unique_selling_points ?? "",
      targetAudience: businessContext.target_audience ?? "",
    });
  } catch (err) {
    log("error", "workspace.agent.GET_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const MAX_PAYLOAD_BYTES = 500_000; // 500KB

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErrPatch = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPatch) return authErrPatch;

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: {
    businessName?: string;
    greeting?: string;
    agentName?: string;
    preferredLanguage?: string;
    voiceId?: string;
    elevenlabsVoiceId?: string; // Deprecated but kept for backwards compatibility
    knowledgeItems?: Array<{ q?: string; a?: string }>;
    workingHours?: Record<string, unknown>;
    // Business context fields (from workspace_business_context table)
    industry?: string;
    servicesOffered?: string;
    primaryGoal?: string;
    uniqueSellingPoints?: string;
    targetAudience?: string;
    // Advanced fields for workspace_business_context (legacy)
    services?: string;
    address?: string;
    phone?: string;
    businessContext?: string;
    assertiveness?: number;
    whenHesitation?: string;
    whenThinkAboutIt?: string;
    whenPricing?: string;
    whenCompetitor?: string;
    offerSummary?: string;
    businessHours?: Record<string, { start: string; end: string } | null>;
    // New agent behavior fields
    qualificationMethod?: string;
    customQualificationQuestions?: Array<{ q?: string; a?: string }>;
    tonePreset?: string;
    transferPolicy?: string;
    transferNumber?: string;
    escalationThreshold?: string;
    escalationTriggers?: string;
    allowedActions?: string[];
    forbiddenActions?: string[];
    objections?: Array<{ objection?: string; response?: string }>;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Validate and trim businessName (max 200 chars)
  if (typeof body.businessName === "string") {
    const trimmed = body.businessName.trim();
    if (trimmed.length > 200) {
      return NextResponse.json({ error: "Business name must be 200 characters or less" }, { status: 400 });
    }
    update.name = trimmed || "My Workspace";
  }

  // Validate and trim greeting (max 2000 chars)
  if (typeof body.greeting === "string") {
    const trimmed = body.greeting.trim();
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: "Greeting must be 2000 characters or less" }, { status: 400 });
    }
    update.greeting = trimmed;
  }

  // Validate and trim agentName (max 100 chars)
  if (typeof body.agentName === "string") {
    const trimmed = body.agentName.trim();
    if (trimmed.length > 100) {
      return NextResponse.json({ error: "Agent name must be 100 characters or less" }, { status: 400 });
    }
    update.agent_name = trimmed;
  }

  if (typeof body.preferredLanguage === "string") update.preferred_language = body.preferredLanguage.trim() || "en";
  // Accept both voiceId and elevenlabsVoiceId for backwards compatibility
  const voiceIdValue = body.voiceId ?? body.elevenlabsVoiceId;
  if (typeof voiceIdValue === "string") update.voice_id = voiceIdValue.trim() || null;
  if (Array.isArray(body.knowledgeItems)) update.knowledge_items = body.knowledgeItems;
  if (body.workingHours && typeof body.workingHours === "object") update.working_hours = body.workingHours;

  // New agent behavior fields
  if (typeof body.qualificationMethod === "string") update.qualification_method = body.qualificationMethod.trim() || "None";
  if (Array.isArray(body.customQualificationQuestions)) update.custom_qualification_questions = body.customQualificationQuestions;
  if (typeof body.tonePreset === "string") update.tone_preset = body.tonePreset.trim() || "Professional";
  if (typeof body.transferPolicy === "string") update.transfer_policy = body.transferPolicy.trim() || "Never";
  if (typeof body.transferNumber === "string") update.transfer_number = body.transferNumber.trim() || null;
  if (typeof body.escalationThreshold === "string") update.escalation_threshold = body.escalationThreshold.trim() || "Balanced";
  if (typeof body.escalationTriggers === "string") update.escalation_triggers = body.escalationTriggers.trim() || null;
  if (Array.isArray(body.allowedActions)) update.allowed_actions = body.allowedActions;
  if (Array.isArray(body.forbiddenActions)) update.forbidden_actions = body.forbiddenActions;
  if (Array.isArray(body.objections)) update.objections = body.objections;

  try {
    const db = getDb();
    const { error } = await db.from("workspaces").update(update).eq("id", session.workspaceId);
    if (error) return NextResponse.json({ error: "Could not update workspace settings. Please try again." }, { status: 500 });

    // Update workspace_business_context with advanced fields if provided
    const businessContextUpdate: Record<string, unknown> = {};
    if (typeof body.industry === "string") businessContextUpdate.industry = body.industry.trim() || null;
    if (typeof body.servicesOffered === "string") businessContextUpdate.services_offered = body.servicesOffered.trim() || null;
    if (typeof body.primaryGoal === "string") businessContextUpdate.primary_goal = body.primaryGoal.trim() || null;
    if (typeof body.uniqueSellingPoints === "string") businessContextUpdate.unique_selling_points = body.uniqueSellingPoints.trim() || null;
    if (typeof body.targetAudience === "string") businessContextUpdate.target_audience = body.targetAudience.trim() || null;
    // Legacy fields
    if (typeof body.services === "string") businessContextUpdate.services = body.services.trim() || null;
    if (typeof body.address === "string") businessContextUpdate.address = body.address.trim() || null;
    if (typeof body.phone === "string") businessContextUpdate.phone = body.phone.trim() || null;
    if (typeof body.businessContext === "string") businessContextUpdate.business_context = body.businessContext.trim() || null;
    if (typeof body.assertiveness === "number") businessContextUpdate.assertiveness = body.assertiveness;
    if (typeof body.whenHesitation === "string") businessContextUpdate.when_hesitation = body.whenHesitation.trim() || null;
    if (typeof body.whenThinkAboutIt === "string") businessContextUpdate.when_think_about_it = body.whenThinkAboutIt.trim() || null;
    if (typeof body.whenPricing === "string") businessContextUpdate.when_pricing = body.whenPricing.trim() || null;
    if (typeof body.whenCompetitor === "string") businessContextUpdate.when_competitor = body.whenCompetitor.trim() || null;
    if (typeof body.offerSummary === "string") businessContextUpdate.offer_summary = body.offerSummary.trim() || null;
    if (body.businessHours && typeof body.businessHours === "object") businessContextUpdate.business_hours = body.businessHours;

    // Upsert workspace_business_context
    if (Object.keys(businessContextUpdate).length > 0) {
      businessContextUpdate.workspace_id = session.workspaceId;
      businessContextUpdate.updated_at = new Date().toISOString();

      try {
        // Try to insert or update — use upsert pattern
        await db
          .from("workspace_business_context")
          .upsert(
            businessContextUpdate as Record<string, unknown>,
            { onConflict: "workspace_id" }
          );
      } catch (ctx_err) {
        // If table doesn't exist or upsert fails, log but don't fail the request
        log("warn", "[workspace/agent] workspace_business_context update failed", { error: ctx_err instanceof Error ? ctx_err.message : String(ctx_err) });
      }
    }

    const voiceId = typeof update.voice_id === "string" ? update.voice_id : null;
    const agentName = typeof update.agent_name === "string" ? update.agent_name : null;
    const greeting = typeof update.greeting === "string" ? update.greeting : null;
    const businessName = typeof update.name === "string" ? update.name : "My Workspace";
    await syncPrimaryAgent(db, {
      workspaceId: session.workspaceId,
      businessName,
      agentName,
      greeting,
      voiceId,
      knowledgeItems: Array.isArray(update.knowledge_items)
        ? (update.knowledge_items as Array<{ q?: string; a?: string }>)
        : null,
      // Pass through business context fields
      industry: typeof body.industry === "string" ? body.industry : null,
      services_offered: typeof body.servicesOffered === "string" ? body.servicesOffered : null,
      primary_goal: typeof body.primaryGoal === "string" ? body.primaryGoal : null,
      unique_selling_points: typeof body.uniqueSellingPoints === "string" ? body.uniqueSellingPoints : null,
      target_audience: typeof body.targetAudience === "string" ? body.targetAudience : null,
      // Legacy fields
      services: typeof body.services === "string" ? body.services : null,
      address: typeof body.address === "string" ? body.address : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      business_context: typeof body.businessContext === "string" ? body.businessContext : null,
      assertiveness: typeof body.assertiveness === "number" ? body.assertiveness : null,
      when_hesitation: typeof body.whenHesitation === "string" ? body.whenHesitation : null,
      when_think_about_it: typeof body.whenThinkAboutIt === "string" ? body.whenThinkAboutIt : null,
      when_pricing: typeof body.whenPricing === "string" ? body.whenPricing : null,
      when_competitor: typeof body.whenCompetitor === "string" ? body.whenCompetitor : null,
      offer_summary: typeof body.offerSummary === "string" ? body.offerSummary : null,
      business_hours: body.businessHours && typeof body.businessHours === "object" ? body.businessHours as Record<string, { start: string; end: string } | null> : null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log("error", "workspace.agent.PATCH_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
