export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/lib/db/queries";
import { scrapeAndAnalyze } from "@/lib/ai/website-intelligence";

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
  try {
    const body = await req.json();
    const { website_url, industry, workspace_id } = body as {
      website_url?: string;
      industry?: string;
      workspace_id?: string;
    };

    if (!website_url || typeof website_url !== "string") {
      return NextResponse.json(
        { error: "website_url is required" },
        { status: 400 }
      );
    }

    if (!workspace_id || typeof workspace_id !== "string") {
      return NextResponse.json(
        { error: "workspace_id is required" },
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

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(website_url);
    } catch {
      return NextResponse.json(
        { error: "Invalid website URL format" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Step 1: Scrape website and generate knowledge base
    const intelligence = await scrapeAndAnalyze(
      parsedUrl.toString(),
      workspace_id
    );

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
      recommendedTone: intelligence.recommendedTone,
      recommendedPersonality: intelligence.recommendedPersonality,
      keyPhrases: intelligence.keyPhrases,
      thingToNeverSay: intelligence.thingToNeverSay,
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

    // Step 3: Auto-configure agent personality
    await db.from("workspace_settings").upsert(
      {
        workspace_id,
        setting_key: "agent_personality",
        setting_value: JSON.stringify({
          tone: intelligence.recommendedTone,
          personality: intelligence.recommendedPersonality,
          keyPhrases: intelligence.keyPhrases,
          thingToNeverSay: intelligence.thingToNeverSay,
          configuredAt: new Date().toISOString(),
        }),
      },
      { onConflict: "workspace_id,setting_key" }
    );

    // Step 4: Configure campaign templates based on industry
    const campaignTemplates = generateCampaignTemplates(
      intelligence.industry
    );
    await db.from("workspace_settings").upsert(
      {
        workspace_id,
        setting_key: "campaign_templates",
        setting_value: JSON.stringify(campaignTemplates),
      },
      { onConflict: "workspace_id,setting_key" }
    );

    // Step 5: Configure default follow-up sequences
    const followUpSequences = generateFollowUpSequences(
      intelligence.followUpTexts,
      intelligence.industry
    );
    await db.from("workspace_settings").upsert(
      {
        workspace_id,
        setting_key: "followup_sequences",
        setting_value: JSON.stringify(followUpSequences),
      },
      { onConflict: "workspace_id,setting_key" }
    );

    // Step 6: Auto-detect and enable communication modes
    const enabledModes: string[] = [];

    if (intelligence.contactPhone) {
      enabledModes.push("voice_calls");
      await db.from("workspace_settings").upsert(
        {
          workspace_id,
          setting_key: "enable_voice_calls",
          setting_value: "true",
        },
        { onConflict: "workspace_id,setting_key" }
      );
    }

    enabledModes.push("sms");
    await db.from("workspace_settings").upsert(
      {
        workspace_id,
        setting_key: "enable_sms",
        setting_value: "true",
      },
      { onConflict: "workspace_id,setting_key" }
    );

    if (intelligence.contactEmail) {
      enabledModes.push("email");
      await db.from("workspace_settings").upsert(
        {
          workspace_id,
          setting_key: "enable_email",
          setting_value: "true",
        },
        { onConflict: "workspace_id,setting_key" }
      );
    }

    // Step 7: Store basic business info
    await db.from("workspace_settings").upsert(
      {
        workspace_id,
        setting_key: "business_name",
        setting_value: intelligence.businessName,
      },
      { onConflict: "workspace_id,setting_key" }
    );

    await db.from("workspace_settings").upsert(
      {
        workspace_id,
        setting_key: "industry",
        setting_value: intelligence.industry,
      },
      { onConflict: "workspace_id,setting_key" }
    );

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

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("One-click setup error:", message, err);

    if (message.includes("Unable to fetch") || message.includes("HTTP")) {
      return NextResponse.json(
        { error: "Unable to fetch website. Please verify the URL is correct and publicly accessible." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "One-click setup failed. Please ensure your website is accessible and try again.",
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
