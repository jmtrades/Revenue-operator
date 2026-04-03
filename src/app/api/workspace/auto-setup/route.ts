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

    // Rate limit: 3 per hour per workspace
    const rl = await checkRateLimit(
      `auto_setup:${workspace_id}`,
      3,
      3600000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many setup requests. Limit: 3 per hour" },
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

    // Generate business intelligence
    const intelligence = await generateBusinessIntelligence(input);

    // Save to workspace knowledge base
    const db = getDb();

    // Store business info in workspace_settings jsonb
    await setWorkspaceSettings(workspace_id, {
      business_name: intelligence.businessName,
      industry: intelligence.industry,
    });

    // Store all the generated scripts and FAQs as knowledge base
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
    };

    await db.from("workspace_knowledge").upsert(
      {
        workspace_id,
        knowledge_key: "auto_generated_intelligence",
        knowledge_value: JSON.stringify(knowledgeBase),
      },
      { onConflict: "workspace_id,knowledge_key" }
    );

    // Store scripts separately for easy access
    await setWorkspaceSettings(workspace_id, {
      greeting_script: intelligence.agentGreetingScript,
      recommended_tone: intelligence.recommendedTone,
    });

    // Also populate workspace_business_context so the voice agent has context
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
      log("warn", "[auto-setup] workspace_business_context upsert failed", { error: ctxErr instanceof Error ? ctxErr.message : String(ctxErr) });
    }

    return NextResponse.json(
      {
        success: true,
        intelligence,
        message: "Business profile analyzed successfully. Agent knowledge base updated.",
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "Auto-setup error:", { error: message, err });

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
        error: "Setup failed. Please ensure your inputs are valid and try again.",
      },
      { status: 500 }
    );
  }
}
import { log } from "@/lib/logger";
