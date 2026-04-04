/**
 * GET /api/workspace/me — Current workspace snapshot for session.
 * PATCH /api/workspace/me — Update basic business profile fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { buildWorkspaceReadiness } from "@/lib/workspace/readiness";
import { log } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  name?: string | null;
  agent_name?: string | null;
  vapi_assistant_id?: string | null;
  knowledge_items?: Array<{ q?: string; a?: string }> | null;
  website?: string | null;
  industry?: string | null;
  address?: string | null;
  onboarding_completed_at?: string | null;
  verified_phone?: string | null;
  notification_preferences?: Record<string, string[]> | null;
};

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({
      authenticated: true,
      name: "My Workspace",
      id: null,
      demoMode: true,
      progress: null,
    });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const [
      { data, error },
      { data: ctx },
      { data: phoneCfg },
      { count: callCount },
      { data: calendar },
      { count: teamCount },
      { count: leadCount },
      { count: agentCount },
      { count: campaignCount },
      { data: lastCall },
    ] = await Promise.all([
      db
        .from("workspaces")
        .select(
          "id, name, agent_name, vapi_assistant_id, knowledge_items, website, industry, address, onboarding_completed_at, notification_preferences, verified_phone",
        )
        .eq("id", workspaceId)
        .maybeSingle(),
      db
        .from("workspace_business_context")
        .select("business_name")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
      db
        .from("phone_configs")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle(),
      db
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      db
        .from("google_calendar_tokens")
        .select("workspace_id")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
      db
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      db
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      db
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      db
        .from("call_sessions")
        .select("call_started_at")
        .eq("workspace_id", workspaceId)
        .order("call_started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (error || !data) {
      return NextResponse.json({
        authenticated: true,
        name: "My Workspace",
        id: workspaceId,
        demoMode: true,
        progress: null,
      });
    }

    const row = data as WorkspaceRow;
    const ctxRow = ctx as { business_name?: string | null } | null;
    const businessName =
      (ctxRow?.business_name ?? "").trim() || (row.name ?? "").trim() || "My Workspace";

    // Backfill workspace_business_context.business_name for older workspaces
    // that predate onboarding propagation. This keeps sidebar and brain APIs
    // consistent for legacy accounts.
    if (!ctxRow?.business_name && businessName !== "My Workspace") {
      try {
        await db
          .from("workspace_business_context")
          .upsert(
            {
              workspace_id: workspaceId,
              business_name: businessName,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id" },
          );
      } catch {
        // Non-fatal; UI can still use computed businessName.
      }
    }

    const knowledgeCount = Array.isArray(row.knowledge_items)
      ? row.knowledge_items.filter((item) => (item.q ?? "").trim() && (item.a ?? "").trim()).length
      : 0;
    const hasVerifiedPhone = Boolean((row.verified_phone ?? "").toString().trim());
    const readiness = buildWorkspaceReadiness({
      businessName,
      businessAddress: (row.address ?? "").toString().trim() || null,
      businessPhone: hasVerifiedPhone || Boolean(phoneCfg),
      agentName: row.agent_name,
      agentCount: agentCount ?? 0,
      knowledgeCount,
      phoneConnected: Boolean(phoneCfg),
      callCount: callCount ?? 0,
      calendarConnected: Boolean(calendar),
      teamCount: teamCount ?? 0,
      contactsCount: leadCount ?? 0,
      campaignsCount: campaignCount ?? 0,
    });

    return NextResponse.json({
      authenticated: true,
      id: row.id,
      name: businessName,
      website: row.website ?? "",
      industry: row.industry ?? "",
      address: row.address ?? "",
      onboardingCompletedAt: row.onboarding_completed_at ?? null,
      verifiedPhone: row.verified_phone ?? null,
      demoMode: readiness.showBanner,
      banner: {
        show: readiness.showBanner,
        text: readiness.bannerText,
        href: readiness.bannerHref,
        cta: readiness.bannerCta,
      },
      progress: {
        completed: readiness.completed,
        total: readiness.total,
        items: readiness.items,
        nextStep: readiness.nextStep,
      },
      stats: {
        calls: callCount ?? 0,
        leads: leadCount ?? 0,
        estRevenue: 0, // Populated from real deal data on dashboard
        minutesUsed: 0, // Populated from call_sessions on dashboard
        minutesLimit: 0, // Populated from billing plan on dashboard
        lastCallAt: (lastCall as { call_started_at?: string | null } | null)?.call_started_at ?? null,
      },
      systemEvents: readiness.systemEvents,
      workspaceReady: !readiness.showBanner,
      notification_preferences: (row.notification_preferences as Record<string, string[]> | null) ?? null,
    });
  } catch (err) {
    log("error", "workspace.me.GET_failed", { workspaceId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({
      authenticated: true,
      name: "My Workspace",
      id: workspaceId,
      demoMode: true,
      progress: null,
    });
  }
}

export async function PATCH(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.userId || !session.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErrPatch = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPatch) return authErrPatch;

  const STARTER_KNOWLEDGE: Array<{ q: string; a: string }> = [
    { q: "What are your hours?", a: "We are open Monday through Friday, 9 AM to 5 PM." },
    { q: "Where are you located?", a: "I can have someone share our address with you. What is the best way to reach you?" },
    { q: "How do I book an appointment?", a: "I can help you with that right now. What day works best for you?" },
    { q: "What services do you offer?", a: "We offer a full range of services. What specifically are you looking for help with?" },
    { q: "What is your pricing?", a: "Pricing depends on your specific needs. I can have our team send you a detailed quote. Can I get your name and email?" },
  ];

  let body: {
    name?: string;
    website?: string;
    industry?: string;
    address?: string;
    onboardingCompletedAt?: string | null;
    notification_preferences?: Record<string, string[]>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === "string") update.name = body.name.trim() || "My Workspace";
  if (typeof body.website === "string") update.website = body.website.trim() || null;
  if (typeof body.industry === "string") update.industry = body.industry.trim() || null;
  if (typeof body.address === "string") update.address = body.address.trim() || null;
  if ("onboardingCompletedAt" in body) update.onboarding_completed_at = body.onboardingCompletedAt ?? null;
  if (body.notification_preferences && typeof body.notification_preferences === "object") {
    update.notification_preferences = body.notification_preferences;
  }

  try {
    const db = getDb();
    if (update.onboarding_completed_at) {
      const { data: existing } = await db
        .from("workspaces")
        .select("knowledge_items")
        .eq("id", session.workspaceId)
        .maybeSingle();
      const current = (existing as { knowledge_items?: Array<{ q?: string; a?: string }> } | null)?.knowledge_items;
      const hasContent = Array.isArray(current) && current.some((x) => (x?.q ?? "").trim() && (x?.a ?? "").trim());
      if (!hasContent) {
        update.knowledge_items = STARTER_KNOWLEDGE;
      }
    }
    const { error } = await db
      .from("workspaces")
      .update(update)
      .eq("id", session.workspaceId);
    if (error) return NextResponse.json({ error: "Could not update workspace settings. Please try again." }, { status: 500 });
    try {
      await db.from("audit_log").insert({
        workspace_id: session.workspaceId,
        actor_user_id: session.userId,
        actor_type: "user",
        action_type: "settings_update",
        details_json: { scope: "workspace_me", fields: Object.keys(update).filter((k) => k !== "updated_at") },
      });
    } catch {
      // non-blocking
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    log("error", "workspace.me.PATCH_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
