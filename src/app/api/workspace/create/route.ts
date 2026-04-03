/**
 * POST /api/workspace/create — Persist onboarding data to workspace (requires session).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { sendAgentLiveEmail } from "@/lib/email/agent-live";
import { buildStarterKnowledge, mergeKnowledgeItems } from "@/lib/workspace/starter-knowledge";
import { syncPrimaryAgent } from "@/lib/agents/sync-primary-agent";
import { parseBody, phoneSchema } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const workspaceCreateSchema = z.object({
  businessName: z.string().max(255).optional(),
  businessPhone: phoneSchema.optional(),
  website: z.string().url("Invalid website URL").optional(),
  address: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  useCases: z.array(z.string()).optional(),
  orgType: z.string().max(100).optional(),
  agentTemplate: z.string().max(255).optional(),
  agentName: z.string().max(255).optional(),
  greeting: z.string().max(2000).optional(),
  businessHours: z.record(z.string(), z.unknown()).optional(),
  knowledgeItems: z.array(z.unknown()).optional(),
  preferredLanguage: z.string().max(10).optional(),
  voiceId: z.string().max(100).optional(),
  elevenlabsVoiceId: z.string().max(100).optional(), // Deprecated: kept for backwards compatibility
  billingTier: z.string().max(50).optional(),
});


export async function POST(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: 5 requests per minute per user
  const rl = await checkRateLimit(`workspace:create:${session.userId}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Enforce email verification before workspace creation.
  if (!session.emailVerified) {
    return NextResponse.json({ error: "Please verify your email first" }, { status: 403 });
  }

  const parsed = await parseBody(req, workspaceCreateSchema);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const name = (body.businessName ?? "").trim() || "My Workspace";
  const phone = (body.businessPhone ?? "").trim() || null;
  const website = (body.website ?? "").trim() || null;
  const address = (body.address ?? "").trim() || null;
  const industry = (body.industry ?? "").trim() || null;
  const useCases = body.useCases ?? null;
  const agentTemplate = body.agentTemplate ?? null;
  const agentName = body.agentName ?? null;
  const greeting = body.greeting ?? null;
  const businessHours = body.businessHours ?? null;
  const rawKnowledgeItems = body.knowledgeItems ?? null;
  const preferredLanguage = (body.preferredLanguage ?? "").trim() || null;
  // Accept both voiceId and elevenlabsVoiceId for backwards compatibility
  const voiceId = ((body.voiceId ?? body.elevenlabsVoiceId) ?? "").trim() || null;
  const billingTier = (body.billingTier ?? "").trim() || null;

  try {
    const db = getDb();
    let workspaceId = session.workspaceId;

    if (!workspaceId) {
      const insertPayload: Record<string, unknown> = { name, owner_id: session.userId, autonomy_level: "assisted", kill_switch: false };
      if (billingTier !== null) insertPayload.billing_tier = billingTier;

      const { data: created, error: createErr } = await db
        .from("workspaces")
        .insert(insertPayload)
        .select("id")
        .maybeSingle();
      if (createErr || !created) {
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
      }
      workspaceId = (created as { id: string }).id;
      await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
    } else {
      const authErr = await requireWorkspaceAccess(req, workspaceId);
      if (authErr) return authErr;
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
    if (voiceId !== null) update.voice_id = voiceId;

    const { error: updateErr } = await db.from("workspaces").update(update).eq("id", workspaceId);
    if (updateErr) {
      return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
    }

    // Ensure workspace_billing record exists (required for billing queries)
    try {
      await db
        .from("workspace_billing")
        .upsert(
          {
            workspace_id: workspaceId,
            plan: "pending",
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" },
        );
    } catch {
      // Non-fatal; billing record can be created later by webhook
    }

    // Ensure workspace_members record exists (required for authorization)
    try {
      const { data: existing } = await db
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", session.userId)
        .maybeSingle();
      if (!existing) {
        await db.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: session.userId,
          role: "owner",
        });
      }
    } catch {
      // Non-fatal; member record can be created later
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
      voiceId,
      knowledgeItems,
    });

    // Auto-provision a phone number for the workspace (non-blocking).
    // Without a provisioned number the workspace can't receive calls/SMS.
    let provisionedPhone: string | null = null;
    try {
      const { data: existingConfig } = await db
        .from("phone_configs")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle();

      if (!existingConfig) {
        const { getTelephonyService } = await import("@/lib/telephony");
        const telephony = getTelephonyService();
        const searchResult = await telephony.searchAvailableNumbers({ areaCode: "US", limit: 3 });

        if ("error" in searchResult) {
          log("warn", "workspace.phone_search_failed", { workspaceId, error: searchResult.error });
        } else if (searchResult.length === 0) {
          log("warn", "workspace.phone_no_numbers_available", { workspaceId });
        } else {
          const num = searchResult[0].phone_number;
          const purchaseResult = await telephony.purchaseNumber(num);

          if ("error" in purchaseResult) {
            log("warn", "workspace.phone_purchase_failed", { workspaceId, phone: num, error: purchaseResult.error });
          } else {
            await db.from("phone_configs").insert({
              workspace_id: workspaceId,
              proxy_number: num,
              status: "active",
              twilio_phone_sid: purchaseResult.numberId,
            });
            provisionedPhone = num;
            log("info", "workspace.phone_auto_provisioned", { workspaceId, phone: num });
          }
        }
      }
    } catch (phoneErr) {
      // Non-fatal — user can provision a number later in Settings → Phone
      log("warn", "workspace.phone_auto_provision_failed", {
        workspaceId,
        error: phoneErr instanceof Error ? phoneErr.message : String(phoneErr),
      });
    }

    sendAgentLiveEmail(workspaceId).catch((err) => { log("error", "[workspace/create] error:", { error: err instanceof Error ? err.message : err }); });

    return NextResponse.json({ ok: true, workspaceId, provisionedPhone });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
