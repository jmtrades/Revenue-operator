/**
 * GET /api/workspace/me — Current workspace snapshot for session.
 * PATCH /api/workspace/me — Update basic business profile fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { buildWorkspaceReadiness } from "@/lib/workspace/readiness";

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

  try {
    const db = getDb();
    const [{ data, error }, { data: phoneCfg }, { count: callCount }, { data: calendar }, { count: teamCount }, { count: leadCount }, { data: lastCall }] =
      await Promise.all([
        db
          .from("workspaces")
          .select(
            "id, name, agent_name, vapi_assistant_id, knowledge_items, website, industry, address, onboarding_completed_at",
          )
          .eq("id", workspaceId)
          .single(),
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
    const knowledgeCount = Array.isArray(row.knowledge_items)
      ? row.knowledge_items.filter((item) => (item.q ?? "").trim() && (item.a ?? "").trim()).length
      : 0;
    const readiness = buildWorkspaceReadiness({
      businessName: row.name,
      agentName: row.agent_name,
      knowledgeCount,
      phoneConnected: Boolean(phoneCfg),
      callCount: callCount ?? 0,
      calendarConnected: Boolean(calendar),
      teamCount: teamCount ?? 0,
    });

    return NextResponse.json({
      authenticated: true,
      id: row.id,
      name: row.name || "My Workspace",
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
        estRevenue: (leadCount ?? 0) * 800,
        minutesUsed: (callCount ?? 0) * 6,
        minutesLimit: 400,
        lastCallAt: (lastCall as { call_started_at?: string | null } | null)?.call_started_at ?? null,
      },
      systemEvents: readiness.systemEvents,
      workspaceReady: !readiness.showBanner,
    });
  } catch {
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
  const session = await getSession(req);
  if (!session?.userId || !session.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const db = getDb();
    if (update.onboarding_completed_at) {
      const { data: existing } = await db
        .from("workspaces")
        .select("knowledge_items")
        .eq("id", session.workspaceId)
        .single();
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
