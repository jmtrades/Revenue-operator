export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/lib/db/queries";
import {
  scrapeAndAnalyze,
  generateBusinessIntelligence,
  type SetupInput,
} from "@/lib/ai/website-intelligence";
import { setWorkspaceSettings } from "@/lib/db/workspace-settings";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

interface SetupResult {
  success: boolean;
  workspaceId: string;
  businessName: string;
  industry: string;
  configuredItems: string[];
  knowledgeBaseStatus: string;
  agentPersonalityConfigured: boolean;
  campaignTemplatesReady: boolean;
  followUpSequencesConfigured: boolean;
  communicationModesEnabled: string[];
  nextSteps: string[];
  estimatedReadyTime: string;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await req.json();
    const input = body as SetupInput & { workspace_id?: string };
    const { workspace_id } = input;

    if (!workspace_id || typeof workspace_id !== "string") {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Validate that at least one input is provided
    if (
      !input.website_url &&
      !input.business_description &&
      !input.industry &&
      !input.product_or_service
    ) {
      return NextResponse.json(
        {
          error:
            "At least one of: website_url, business_description, industry, or product_or_service is required",
        },
        { status: 400 }
      );
    }

    const authErr = await requireWorkspaceAccess(req, workspace_id);
    if (authErr) return authErr;

    // Rate limit: 1 per hour per workspace (one-click setup is expensive)
    const rl = await checkRateLimit(
      `one_click_setup:${workspace_id}`,
      1,
      3600000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "One-click setup can only be run once per hour per workspace" },
        { status: 429 }
      );
    }

    // Validate URL if provided
    if (input.website_url && typeof input.website_url === "string") {
      try {
        new URL(input.website_url);
      } catch {
        return NextResponse.json(
          { error: "Invalid website URL format" },
          { status: 400 }
        );
      }
    }

    const db = getDb();

    // Step 1: Generate business intelligence
    const intelligence = await generateBusinessIntelligence(input);

    // Step 2: Store the full intelligence in workspace knowledge
    const knowledgeBase = {
      businessName: intelligence.businessName,
      industry: intelligence.industry,
      servicesOffered: intelligence.servicesOffered,
      pricingInfo: intelligence.pricingInfo,
      contactPhone: intelligence.contactPhone,
      contactEmail: intelligence.contactEmail,
      contactAddress: intelligence.contactAddress,
      businessHours: intelligence.businessHours,
      valuePropositions: intelligence.valuePropositions,
      uniqueSellingPoints: intelligence.uniqueSellingPoints,
      commonPainPoints: intelligence.commonPainPoints,
      agentGreetingScript: intelligence.agentGreetingScript,
      faqPairs: intelligence.faqPairs,
      objectionHandlers: intelligence.objectionHandlers,
      bookingScript: intelligence.bookingScript,
      followUpTexts: intelligence.followUpTexts,
      followUpEmails: intelligence.followUpEmails,
      recommendedTone: intelligence.recommendedTone,
      recommendedPersonality: intelligence.recommendedPersonality,
      keyPhrases: intelligence.keyPhrases,
      thingToNeverSay: intelligence.thingToNeverSay,
      qualifyingQuestions: intelligence.qualifyingQuestions,
      generatedAt: new Date().toISOString(),
      setupMethod: "auto_one_click",
    };

    await db.from("workspace_knowledge").upsert(
      {
        workspace_id,
        knowledge_key: "auto_generated_intelligence",
        knowledge_value: JSON.stringify(knowledgeBase),
      },
      { onConflict: "workspace_id,knowledge_key" }
    );

    // Step 3: Auto-configure agent personality, campaign templates, follow-up sequences, communication modes, business info
    const campaignTemplates = generateCampaignTemplates(intelligence.industry);
    const followUpSequences = generateFollowUpSequences(
      intelligence.followUpTexts,
      intelligence.industry
    );

    const enabledModes: string[] = ["sms"];
    const settingsUpdate: Record<string, unknown> = {
      agent_personality: JSON.stringify({
        tone: intelligence.recommendedTone,
        personality: intelligence.recommendedPersonality,
        keyPhrases: intelligence.keyPhrases,
        thingToNeverSay: intelligence.thingToNeverSay,
        configuredAt: new Date().toISOString(),
      }),
      campaign_templates: JSON.stringify(campaignTemplates),
      followup_sequences: JSON.stringify(followUpSequences),
      enable_sms: "true",
      business_name: intelligence.businessName,
      industry: intelligence.industry,
    };

    if (intelligence.contactPhone) {
      enabledModes.push("voice_calls");
      settingsUpdate.enable_voice_calls = "true";
    }

    if (intelligence.contactEmail) {
      enabledModes.push("email");
      settingsUpdate.enable_email = "true";
    }

    await setWorkspaceSettings(workspace_id, settingsUpdate);

    // Step 8: Populate workspace_business_context for voice agent
    try {
      await db.from("workspace_business_context").upsert(
        {
          workspace_id,
          business_name: intelligence.businessName || null,
          industry: intelligence.industry || null,
          services: (intelligence.servicesOffered ?? []).join(", ") || null,
          address: intelligence.contactAddress || null,
          offer_summary: (intelligence.valuePropositions ?? []).join(". ") || null,
          ideal_customer: (intelligence.commonPainPoints ?? []).join(", ") || null,
          faq: (intelligence.faqPairs ?? []).slice(0, 20),
          tone_guidelines: intelligence.recommendedTone
            ? { style: intelligence.recommendedTone, formality: "professional" }
            : { style: "calm", formality: "professional" },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );
    } catch (ctxErr) {
      console.warn("[one-click-setup] workspace_business_context upsert failed:", ctxErr instanceof Error ? ctxErr.message : ctxErr);
    }

    // Build result
    const result: SetupResult = {
      success: true,
      workspaceId: workspace_id,
      businessName: intelligence.businessName,
      industry: intelligence.industry,
      configuredItems: [
        "Knowledge base with FAQ pairs",
        "Objection handlers",
        "Agent greeting script",
        "Follow-up text templates",
        "Agent personality profile",
        "Campaign templates",
        "Follow-up sequences",
      ],
      knowledgeBaseStatus: `Loaded with ${intelligence.faqPairs.length} FAQ pairs and ${intelligence.objectionHandlers.length} objection handlers`,
      agentPersonalityConfigured: true,
      campaignTemplatesReady: true,
      followUpSequencesConfigured: true,
      communicationModesEnabled: enabledModes,
      nextSteps: [
        "Review and customize agent personality settings if needed",
        "Upload your first batch of leads",
        "Monitor initial call performance",
        "System will auto-improve based on call outcomes",
      ],
      estimatedReadyTime: "Immediately - system is ready for outbound calls",
    };

    // Return the full intelligence for preview/confirmation
    return NextResponse.json(
      {
        ...result,
        generatedIntelligence: {
          agentGreetingScript: intelligence.agentGreetingScript,
          faqPairs: intelligence.faqPairs.slice(0, 3),
          objectionHandlers: intelligence.objectionHandlers.slice(0, 3),
          followUpTexts: intelligence.followUpTexts,
          followUpEmails: intelligence.followUpEmails,
          keyPhrases: intelligence.keyPhrases,
          qualifyingQuestions: intelligence.qualifyingQuestions,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "One-click setup error:", { error: message, err });

    if (
      message.includes("Unable to fetch") ||
      message.includes("HTTP") ||
      message.includes("not accessible")
    ) {
      return NextResponse.json(
        {
          error:
            "Could not process the provided website. If you provided a URL, please verify it's correct and publicly accessible. Otherwise, provide a business description instead.",
        },
        { status: 400 }
      );
    }

    if (message.includes("At least one of")) {
      return NextResponse.json(
        {
          error:
            "Please provide at least one of: website URL, business description, industry, or product/service.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Setup failed. Please ensure your inputs are valid and try again.",
      },
      { status: 500 }
    );
  }
}

function generateCampaignTemplates(
  industry: string
): Record<string, unknown> {
  const templates: Record<string, Record<string, unknown>> = {
    saas: {
      name: "SaaS Product Launch Campaign",
      type: "nurture",
      description:
        "Multi-touch campaign for SaaS product outreach with demo focus",
      steps: [
        "Initial discovery call",
        "Send product demo link",
        "Follow up after demo",
        "Address objections",
        "Close or schedule trial",
      ],
    },
    services: {
      name: "Service Provider Campaign",
      type: "consultation",
      description: "Consultation-focused campaign for service businesses",
      steps: [
        "Qualify pain points",
        "Propose solution fit",
        "Share case studies",
        "Schedule consultation",
        "Send proposal",
      ],
    },
    ecommerce: {
      name: "E-commerce Partnership Campaign",
      type: "partnership",
      description: "B2B campaign for e-commerce partnerships",
      steps: [
        "Introduce product",
        "Share catalog",
        "Discuss margins and terms",
        "Create account",
        "Onboard seller",
      ],
    },
    real_estate: {
      name: "Real Estate Lead Nurture",
      type: "nurture",
      description: "Property-focused campaign for real estate professionals",
      steps: [
        "Property inquiry",
        "Send listing details",
        "Schedule showing",
        "Financial pre-qualification",
        "Make offer",
      ],
    },
  };

  // Return the industry-specific template or a generic one
  return templates[industry.toLowerCase()] || {
    name: "General Outreach Campaign",
    type: "outreach",
    description: "Basic multi-touch outreach campaign",
    steps: [
      "Initial contact",
      "Value proposition",
      "Objection handling",
      "Call to action",
      "Follow up",
    ],
  };
}

function generateFollowUpSequences(
  followUpTexts: string[],
  industry: string
): Record<string, unknown> {
  return {
    default: {
      name: "Default Follow-up Sequence",
      steps: [
        {
          order: 1,
          delay: "1 hour",
          type: "sms",
          template: followUpTexts[0] || "Following up on our call today.",
        },
        {
          order: 2,
          delay: "24 hours",
          type: "sms",
          template:
            followUpTexts[1] ||
            "Wanted to make sure you got the information about our product.",
        },
        {
          order: 3,
          delay: "3 days",
          type: "email",
          template:
            followUpTexts[2] ||
            "I found this case study that might be relevant to your situation.",
        },
        {
          order: 4,
          delay: "7 days",
          type: "sms",
          template:
            followUpTexts[3] ||
            "Quick question - did anything else come up after our conversation?",
        },
        {
          order: 5,
          delay: "14 days",
          type: "email",
          template:
            followUpTexts[4] ||
            "Wanted to check in one more time - let me know if timing has changed.",
        },
      ],
      enabled: true,
      industry,
      createdAt: new Date().toISOString(),
    },
  };
}
