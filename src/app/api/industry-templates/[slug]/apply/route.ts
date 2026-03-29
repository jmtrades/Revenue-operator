/**
 * POST /api/industry-templates/[slug]/apply
 * Applies an industry template to the workspace's active agent
 * Requires workspace authentication
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getSession } from "@/lib/auth/request-session";

interface Params {
  slug: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Fetch the template
    const { data: template, error: templateError } = await db
      .from("industry_templates")
      .select("*")
      .eq("industry_slug", slug)
      .maybeSingle();

    if (templateError) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: `Industry template with slug "${slug}" not found` },
        { status: 404 }
      );
    }

    // Get the active agent for this workspace (or first agent if multiple exist)
    const { data: agents, error: agentsError } = await db
      .from("agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1);

    if (agentsError) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    let agentId: string;
    let existingAgent: Record<string, unknown> | null = agents?.[0] ?? null;

    // If no active agent exists, create one
    if (!existingAgent) {
      const { data: newAgent, error: createError } = await db
        .from("agents")
        .insert({
          workspace_id: workspaceId,
          name: "Primary Agent",
          greeting: template.default_greeting || "",
          knowledge_base: {
            faq: template.default_faq || [],
            services: [],
          },
          rules: {
            templates: template.default_scripts || [],
            followUpCadence: template.default_follow_up_cadence || [],
            neverSay: [],
            alwaysTransfer: [],
            escalationChain: [],
          },
          personality: "professional",
          purpose: "both",
          is_active: true,
          metadata: {
            industry_template_applied: slug,
          },
        })
        .select()
        .maybeSingle();

      if (createError) {
        console.error("[DB Error] Create agent from template:", createError);
        return NextResponse.json(
          { error: "Something went wrong. Please try again." },
          { status: 500 }
        );
      }

      if (!newAgent) {
        return NextResponse.json(
          { error: "Failed to create agent" },
          { status: 500 }
        );
      }

      return NextResponse.json(newAgent);
    }

    // Update existing agent with template data
    agentId = (existingAgent as { id: string }).id;

    // Merge template FAQ into existing knowledge base
    const existingKb = (existingAgent as { knowledge_base?: Record<string, unknown> })
      ?.knowledge_base || {};
    const existingFaq = (existingKb.faq as Array<{ q: string; a: string }>) || [];
    const templateFaq = (template.default_faq as Array<{ q: string; a: string }>) || [];

    // Merge FAQ items: add template items that don't already exist (by question)
    const existingQuestions = new Set(existingFaq.map((item) => item.q?.toLowerCase()));
    const mergedFaq = [...existingFaq];
    for (const item of templateFaq) {
      if (!existingQuestions.has(item.q?.toLowerCase())) {
        mergedFaq.push(item);
      }
    }

    const updatedKnowledgeBase = {
      ...existingKb,
      faq: mergedFaq,
    };

    // Merge rules: combine scripts and cadence
    const existingRules = (existingAgent as { rules?: Record<string, unknown> })?.rules || {};
    const updatedRules = {
      ...existingRules,
      templates: template.default_scripts || [],
      followUpCadence: template.default_follow_up_cadence || [],
      neverSay: (existingRules.neverSay as string[]) || [],
      alwaysTransfer: (existingRules.alwaysTransfer as string[]) || [],
      escalationChain: (existingRules.escalationChain as string[]) || [],
    };

    // Build metadata with template marker
    const existingMetadata = (existingAgent as { metadata?: Record<string, unknown> })
      ?.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      industry_template_applied: slug,
      industry_template_applied_at: new Date().toISOString(),
    };

    const { data: updatedAgent, error: updateError } = await db
      .from("agents")
      .update({
        greeting: template.default_greeting || (existingAgent as { greeting: string }).greeting,
        knowledge_base: updatedKnowledgeBase,
        rules: updatedRules,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[DB Error] Update agent with template:", updateError);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    if (!updatedAgent) {
      return NextResponse.json(
        { error: "Failed to update agent" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedAgent);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Apply template error]:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
