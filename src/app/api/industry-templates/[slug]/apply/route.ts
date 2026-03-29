/**
 * POST /api/industry-templates/[slug]/apply
 * Applies an industry template to the workspace's active agent
 * Requires workspace authentication
 *
 * Body (optional):
 * - sections?: ("greeting" | "faq" | "scripts" | "cadence")[] - only apply these sections
 *   If omitted, applies all sections
 *
 * Template variable substitution:
 * - [Practice Name] or [Business Name] → workspace.name
 * - [Agent Name] → agent.name
 * - [Doctor] or [Owner] → owner's full name
 * - [Phone] → workspace.phone (or verified_phone)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getSession } from "@/lib/auth/request-session";

type TemplateSection = "greeting" | "faq" | "scripts" | "cadence";

interface ApplyRequestBody {
  sections?: TemplateSection[];
}

/**
 * Substitutes template variables in text with workspace data
 */
function substituteVariables(
  text: string | null | undefined,
  substitutions: Record<string, string>
): string {
  if (!text) return "";

  let result = text;
  for (const [placeholder, value] of Object.entries(substitutions)) {
    // Create regex patterns for all variants
    const patterns = [
      new RegExp(`\\[${placeholder}\\]`, "gi"),
      new RegExp(`\\[${placeholder.replace(/\s+/g, "\\s+")}\\]`, "gi"),
    ];
    for (const pattern of patterns) {
      result = result.replace(pattern, value || "");
    }
  }
  return result;
}

/**
 * Substitutes variables in FAQ items
 */
function substituteFaqVariables(
  faq: Array<{ q: string; a: string }> | null | undefined,
  substitutions: Record<string, string>
): Array<{ q: string; a: string }> {
  if (!faq || !Array.isArray(faq)) return [];

  return faq.map((item) => ({
    q: substituteVariables(item.q, substitutions),
    a: substituteVariables(item.a, substitutions),
  }));
}

/**
 * Substitutes variables in string array (like scripts)
 */
function substituteStringArrayVariables(
  items: string[] | null | undefined,
  substitutions: Record<string, string>
): string[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item) => substituteVariables(item, substitutions));
}

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

    let requestBody: ApplyRequestBody = {};
    try {
      requestBody = await req.json();
    } catch {
      // Body is optional, continue with defaults
    }

    const { sections } = requestBody;
    const applyAllSections = !sections || sections.length === 0;
    const sectionSet = new Set(sections || []);

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

    // Fetch workspace for variable substitution
    const { data: workspace, error: workspaceError } = await db
      .from("workspaces")
      .select("id, name, owner_id, phone")
      .eq("id", workspaceId)
      .maybeSingle();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Fetch workspace owner for [Doctor]/[Owner] substitution
    let ownerName = "Owner";
    if (workspace.owner_id) {
      const { data: owner } = await db
        .from("users")
        .select("full_name")
        .eq("id", workspace.owner_id)
        .maybeSingle();
      if (owner?.full_name) {
        ownerName = owner.full_name;
      }
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

    // Build substitution map
    const substitutions: Record<string, string> = {
      "Practice Name": workspace.name || "",
      "Business Name": workspace.name || "",
      "Agent Name": "", // Will be set if agent exists
      Doctor: ownerName,
      Owner: ownerName,
      Phone: workspace.phone || "",
    };

    let agentId: string;
    let existingAgent: Record<string, unknown> | null = agents?.[0] ?? null;

    // If no active agent exists, create one
    if (!existingAgent) {
      substitutions["Agent Name"] = "Primary Agent";

      const greetingText = applyAllSections || sectionSet.has("greeting")
        ? substituteVariables(template.default_greeting || "", substitutions)
        : "";

      const faqData = applyAllSections || sectionSet.has("faq")
        ? substituteFaqVariables(template.default_faq || [], substitutions)
        : [];

      const scriptsData = applyAllSections || sectionSet.has("scripts")
        ? substituteStringArrayVariables(template.default_scripts || [], substitutions)
        : [];

      const cadenceData = applyAllSections || sectionSet.has("cadence")
        ? template.default_follow_up_cadence || []
        : [];

      const { data: newAgent, error: createError } = await db
        .from("agents")
        .insert({
          workspace_id: workspaceId,
          name: "Primary Agent",
          greeting: greetingText,
          knowledge_base: {
            faq: faqData,
            services: [],
          },
          rules: {
            templates: scriptsData,
            followUpCadence: cadenceData,
            neverSay: [],
            alwaysTransfer: [],
            escalationChain: [],
          },
          personality: "professional",
          purpose: "both",
          is_active: true,
          metadata: {
            industry_template_applied: slug,
            industry_template_applied_at: new Date().toISOString(),
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
    const agentName = (existingAgent as { name?: string }).name || "Agent";
    substitutions["Agent Name"] = agentName;

    const existingKb = (existingAgent as { knowledge_base?: Record<string, unknown> })
      ?.knowledge_base || {};
    const existingFaq = (existingKb.faq as Array<{ q: string; a: string }>) || [];
    const existingRules = (existingAgent as { rules?: Record<string, unknown> })?.rules || {};

    let updatedKnowledgeBase = { ...existingKb };
    let updatedRules = { ...existingRules };

    // Apply greeting if included in sections
    let newGreeting = (existingAgent as { greeting: string }).greeting;
    if (applyAllSections || sectionSet.has("greeting")) {
      newGreeting = substituteVariables(template.default_greeting || "", substitutions);
    }

    // Apply FAQ if included in sections
    if (applyAllSections || sectionSet.has("faq")) {
      const templateFaq = substituteFaqVariables(template.default_faq || [], substitutions);
      const existingQuestions = new Set(existingFaq.map((item) => item.q?.toLowerCase()));
      const mergedFaq = [...existingFaq];
      for (const item of templateFaq) {
        if (!existingQuestions.has(item.q?.toLowerCase())) {
          mergedFaq.push(item);
        }
      }
      updatedKnowledgeBase = {
        ...existingKb,
        faq: mergedFaq,
      };
    }

    // Apply scripts if included in sections
    if (applyAllSections || sectionSet.has("scripts")) {
      const templateScripts = substituteStringArrayVariables(
        template.default_scripts || [],
        substitutions
      );
      updatedRules = {
        ...existingRules,
        templates: templateScripts,
      };
    }

    // Apply cadence if included in sections
    if (applyAllSections || sectionSet.has("cadence")) {
      updatedRules = {
        ...updatedRules,
        followUpCadence: template.default_follow_up_cadence || [],
      };
    }

    // Preserve unmodified rule fields
    updatedRules = {
      ...updatedRules,
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
      applied_sections: sections || "all",
    };

    const { data: updatedAgent, error: updateError } = await db
      .from("agents")
      .update({
        greeting: newGreeting,
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
