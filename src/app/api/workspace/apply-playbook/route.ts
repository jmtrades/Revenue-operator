/**
 * Apply Playbook to Workspace
 * POST /api/workspace/apply-playbook
 *
 * Takes a playbook and customizes it for the user's business
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getPlaybook } from "@/lib/ai/playbooks";
import { assertSameOrigin } from "@/lib/http/csrf";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface PlaybookCustomization {
  business_name?: string;
  agent_name?: string;
  phone?: string;
  custom_details?: string;
}

interface ApplyPlaybookRequest {
  workspace_id: string;
  playbook_id: string;
  customizations?: PlaybookCustomization;
}

/**
 * Personalize playbook using Claude API
 * Replaces generic terms with user's business info
 */
async function personalizePlaybook(
  playbookId: string,
  customizations: PlaybookCustomization
): Promise<Record<string, unknown> | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    return null;
  }

  const playbook = getPlaybook(playbookId);
  if (!playbook) return null;

  const prompt = `You are an expert sales trainer. I'm going to give you a sales playbook template and some business details. Your job is to personalize the playbook for this specific business.

BUSINESS DETAILS:
Business Name: ${customizations.business_name || "The Business"}
Agent Name: ${customizations.agent_name || "Agent Name"}
Phone: ${customizations.phone || "+1-XXX-XXX-XXXX"}
Additional Context: ${customizations.custom_details || "None provided"}

CURRENT PLAYBOOK:
${JSON.stringify(playbook, null, 2)}

Please personalize this playbook by:
1. Replacing {company}, {company_name}, {agent_name} with the actual values
2. Replacing {phone} with the actual phone number
3. Making greeting_script, voicemail_script, and call_scripts feel authentic to this business
4. Updating FAQs and objection handlers to be specific to what this business actually sells
5. Personalizing sample_scenarios with realistic, specific pain points
6. Keeping the same structure and field names

Return ONLY valid JSON matching the playbook structure. Do not include markdown formatting or explanation text.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-1",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      return null;
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const textContent = data.content.find((c) => c.type === "text");
    if (!textContent) return null;

    // Parse the JSON response
    const personalized = JSON.parse(textContent.text);
    return personalized;
  } catch (err) {
    console.error("Error personalizing playbook:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: ApplyPlaybookRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { workspace_id, playbook_id, customizations } = body;

  // Validate required fields
  if (!workspace_id) {
    return NextResponse.json(
      { error: "workspace_id required" },
      { status: 400 }
    );
  }

  if (!playbook_id) {
    return NextResponse.json(
      { error: "playbook_id required" },
      { status: 400 }
    );
  }

  // Validate workspace access
  const authErr = await requireWorkspaceAccess(req, workspace_id);
  if (authErr) return authErr;

  // Verify playbook exists
  const playbook = getPlaybook(playbook_id);
  if (!playbook) {
    return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
  }

  const db = getDb();

  // Personalize playbook if customizations provided
  let appliedConfig = playbook;

  if (
    customizations &&
    (customizations.business_name ||
      customizations.agent_name ||
      customizations.phone ||
      customizations.custom_details)
  ) {
    try {
      const personalized = await personalizePlaybook(
        playbook_id,
        customizations
      );
      if (personalized) {
        appliedConfig = personalized as unknown as typeof playbook;
      }
    } catch (err) {
      console.error("Personalization failed:", err);
      // Fall back to non-personalized playbook
    }
  }

  // Save to workspace knowledge base
  try {
    const { error } = await db
      .from("workspaces")
      .update({
        playbook_applied: playbook_id,
        playbook_config: appliedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace_id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to save playbook to workspace" },
        { status: 500 }
      );
    }

    // Create a knowledge base entry for this playbook
    const knowledgeBaseEntry = {
      source: "playbook",
      playbook_id: playbook_id,
      title: appliedConfig.title,
      greeting_script: appliedConfig.greeting_script,
      voicemail_script: appliedConfig.voicemail_script,
      key_phrases: appliedConfig.key_phrases,
      faqs: appliedConfig.faqs,
      objection_handlers: appliedConfig.objection_handlers,
      call_scripts: appliedConfig.call_scripts,
      tone: appliedConfig.tone,
      personality_traits: appliedConfig.personality_traits,
    };

    // Get agent name from customizations or playbook suggestion
    const agentName = customizations?.agent_name ||
      (appliedConfig.agent_name_suggestion as unknown as string | undefined) ||
      `${appliedConfig.title} Operator`;

    // Check if an agent already exists for this workspace
    const { data: agents } = await db
      .from("agents")
      .select("id")
      .eq("workspace_id", workspace_id)
      .limit(1);

    let agentId: string | undefined;

    if (agents && agents.length > 0) {
      // Update existing agent with playbook data
      agentId = agents[0].id;

      const { error: updateError } = await db
        .from("agents")
        .update({
          knowledge_base: {
            ...knowledgeBaseEntry,
            faq: appliedConfig.faqs,
            scripts: appliedConfig.call_scripts,
          },
          greeting: appliedConfig.greeting_script,
          rules: {
            neverSay: appliedConfig.things_to_never_say,
            keyPhrases: appliedConfig.key_phrases,
            escalationTriggers: appliedConfig.escalation_triggers,
            personality: appliedConfig.personality_traits,
          },
        })
        .eq("id", agentId);

      if (updateError) {
        console.error("Error updating agent:", updateError);
      }
    } else {
      // No agent exists - create one from the playbook
      const { DEFAULT_VOICE_ID } = await import("@/lib/constants/curated-voices");

      const { data: newAgent, error: insertError } = await db
        .from("agents")
        .insert({
          workspace_id,
          name: agentName,
          voice_id: DEFAULT_VOICE_ID,
          personality: appliedConfig.personality_traits?.[0] || "professional",
          purpose: "both",
          greeting: appliedConfig.greeting_script,
          knowledge_base: {
            ...knowledgeBaseEntry,
            faq: appliedConfig.faqs,
            scripts: appliedConfig.call_scripts,
          },
          rules: {
            neverSay: appliedConfig.things_to_never_say,
            keyPhrases: appliedConfig.key_phrases,
            escalationTriggers: appliedConfig.escalation_triggers,
            personality: appliedConfig.personality_traits,
          },
          is_active: true,
        })
        .select()
        .maybeSingle();

      if (insertError || !newAgent) {
        console.error("Error creating agent:", insertError);
        // Don't fail the entire request if agent creation fails - playbook config was still saved
      } else {
        agentId = newAgent.id;
      }
    }

    return NextResponse.json({
      ok: true,
      playbook_id: playbook_id,
      agent_id: agentId,
      agent_name: agentName,
      applied_config: {
        title: appliedConfig.title,
        subtitle: appliedConfig.subtitle,
        category: appliedConfig.category,
        greeting_script: appliedConfig.greeting_script,
        voicemail_script: appliedConfig.voicemail_script,
        tone: appliedConfig.tone,
        recommended_settings: appliedConfig.recommended_settings,
      },
      message: `Playbook "${appliedConfig.title}" applied successfully${agentId ? ` and agent "${agentName}" created` : ""}`,
    });
  } catch (err) {
    console.error("Unexpected error applying playbook:", err);
    return NextResponse.json(
      { error: "Something went wrong applying the playbook" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workspace/apply-playbook
 * Returns available playbooks for a workspace
 */
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id required" },
      { status: 400 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  // Get workspace to see if playbook is already applied
  const { data: workspace } = await db
    .from("workspaces")
    .select("playbook_applied, playbook_config")
    .eq("id", workspaceId)
    .maybeSingle();

  const wsData = workspace as {
    playbook_applied?: string;
    playbook_config?: unknown;
  } | null;

  return NextResponse.json({
    workspace_id: workspaceId,
    current_playbook: wsData?.playbook_applied || null,
    current_config: wsData?.playbook_config || null,
  });
}
