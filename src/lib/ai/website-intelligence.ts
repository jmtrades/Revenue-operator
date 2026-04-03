/**
 * Business Intelligence Generator - Universal setup for any business model
 * Supports: websites, descriptions, agencies, solo closers, appointment setters, etc.
 */

import { log } from "@/lib/logger";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface TextContent {
  text: string;
}

interface MessageResponse {
  content: TextContent[];
}

export interface SetupInput {
  website_url?: string;
  business_description?: string;
  industry?: string;
  product_or_service?: string;
  target_audience?: string;
  price_range?: string;
  selling_for?: string;
  use_case?: string;
  tone?: string;
  additional_context?: string;
}

export interface BusinessIntelligence {
  businessName: string;
  industry: string;
  servicesOffered: string[];
  pricingInfo: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  businessHours: string | null;
  valuePropositions: string[];
  uniqueSellingPoints: string[];
  commonPainPoints: string[];
  agentGreetingScript: string;
  faqPairs: Array<{ question: string; answer: string }>;
  objectionHandlers: Array<{ objection: string; handler: string }>;
  bookingScript: string | null;
  followUpTexts: string[];
  followUpEmails: string[];
  recommendedTone: string;
  recommendedPersonality: string;
  keyPhrases: string[];
  thingToNeverSay: string[];
  qualifyingQuestions: string[];
  extractedAt: Date;
}

export type WebsiteIntelligence = BusinessIntelligence;

async function fetchUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (err) {
    log("error", `Failed to fetch ${url}`, { error: err instanceof Error ? err.message : String(err) });
    return "";
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style tags and their content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

  // Split into lines and clean up
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 10); // Only lines with meaningful content

  return lines.join("\n");
}

async function fetchAndParsePages(
  baseUrl: string
): Promise<Record<string, string>> {
  const baseUrlObj = new URL(baseUrl);
  const baseUrlStr = baseUrlObj.origin;

  const pages = [
    { path: "", name: "homepage" },
    { path: "/about", name: "about" },
    { path: "/services", name: "services" },
    { path: "/pricing", name: "pricing" },
    { path: "/contact", name: "contact" },
    { path: "/faq", name: "faq" },
  ];

  const results: Record<string, string> = {};

  for (const page of pages) {
    const url = page.path ? `${baseUrlStr}${page.path}` : baseUrlStr;
    const html = await fetchUrl(url);
    const text = extractTextFromHtml(html);
    if (text.length > 0) {
      results[page.name] = text;
    }
  }

  return results;
}

async function callClaudeApi(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
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
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as MessageResponse;
  const content = data.content[0];
  if (!content || typeof content !== 'object' || !('text' in content)) {
    throw new Error("Unexpected response format from Claude API");
  }
  return content.text;
}

async function generateAgentKnowledge(
  context: string,
  useCase?: string,
  tone?: string
): Promise<{
  agentGreetingScript: string;
  faqPairs: Array<{ question: string; answer: string }>;
  objectionHandlers: Array<{ objection: string; handler: string }>;
  bookingScript: string | null;
  followUpTexts: string[];
  followUpEmails: string[];
  recommendedTone: string;
  recommendedPersonality: string;
  keyPhrases: string[];
  thingToNeverSay: string[];
  qualifyingQuestions: string[];
}> {
  const useCaseContext = useCase ? `\nThe primary use case is: ${useCase}` : "";
  const toneContext = tone ? `\nThe preferred tone is: ${tone}` : "";

  const prompt = `You are an expert sales training consultant and voice AI specialist. Generate a comprehensive, realistic sales playbook for an AI agent.

BUSINESS CONTEXT:
${context}
${useCaseContext}
${toneContext}

Generate a complete JSON sales playbook (valid JSON only, no markdown or explanations):
{
  "agentGreetingScript": "A natural, confident opening (2-3 sentences) the agent uses to start conversations. Should feel like a real person, not robotic. Be specific to their business.",
  "faqPairs": [
    {"question": "...", "answer": "..."}
    // Generate 12-15 FAQ pairs based on their specific business. Include real objections customers might have.
  ],
  "objectionHandlers": [
    {"objection": "Specific objection", "handler": "Word-for-word response that feels natural and confident"}
    // Generate 8-10 handlers for: price concerns, timing, trust, competitor comparisons, complexity, decision-making delays, etc.
    // Handlers should be 1-2 sentences, natural language, with specific proof points or reframes.
  ],
  "bookingScript": "Word-for-word script (2-3 sentences) to transition to scheduling. Use natural language like 'Let me get you on the calendar' or null if not applicable.",
  "followUpTexts": [
    "Short SMS follow-up after initial call (under 160 chars)",
    "Re-engagement after 3 days of no response (actionable, not pushy)",
    "Confirming appointment (warm, professional)",
    "Introducing time-limited offer or urgency",
    "Checking in post-meeting/demo (add real value)"
  ],
  "followUpEmails": [
    "First email: Summary of conversation + next step (3-4 sentences)",
    "Second email (24h later): Sharing relevant resource/case study",
    "Third email (3 days): Different angle or social proof",
    "Fourth email (1 week): Gentle reminder with specific CTA",
    "Fifth email (reactivation): New angle or special offer"
  ],
  "recommendedTone": "One of: professional, friendly, consultative, direct_confident, casual. Must match their business style.",
  "recommendedPersonality": "Brief description of ideal agent personality. Example: 'Knowledgeable but approachable, confident without being pushy, focused on solving real problems'",
  "keyPhrases": [
    "phrase 1",
    // Generate 8-10 power phrases specific to their industry that feel authentic and move conversations forward
  ],
  "thingToNeverSay": [
    "avoid this phrasing",
    // Generate 5-8 things agents should avoid: generic phrases, off-brand language, manipulation tactics, etc.
  ],
  "qualifyingQuestions": [
    "Question to understand their specific situation",
    // Generate 6-8 qualifying questions that uncover decision-making power, timeline, budget, and real needs
  ]
}

Be SPECIFIC to their business type. Not generic. Generate realistic scripts from an actual top performer in their industry. Use natural language, not corporate jargon. All responses must be valid JSON.`;

  const result = await callClaudeApi(prompt);

  try {
    let jsonStr = result;
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return {
      agentGreetingScript: parsed.agentGreetingScript || "",
      faqPairs: Array.isArray(parsed.faqPairs) ? parsed.faqPairs : [],
      objectionHandlers: Array.isArray(parsed.objectionHandlers)
        ? parsed.objectionHandlers
        : [],
      bookingScript: parsed.bookingScript || null,
      followUpTexts: Array.isArray(parsed.followUpTexts) ? parsed.followUpTexts : [],
      followUpEmails: Array.isArray(parsed.followUpEmails) ? parsed.followUpEmails : [],
      recommendedTone: parsed.recommendedTone || "professional",
      recommendedPersonality: parsed.recommendedPersonality || "professional and helpful",
      keyPhrases: Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : [],
      thingToNeverSay: Array.isArray(parsed.thingToNeverSay)
        ? parsed.thingToNeverSay
        : [],
      qualifyingQuestions: Array.isArray(parsed.qualifyingQuestions)
        ? parsed.qualifyingQuestions
        : [],
    };
  } catch (err) {
    log("error", "Failed to parse Claude response as JSON", { error: err instanceof Error ? err.message : String(err) });
    throw new Error("Failed to generate valid agent scripts");
  }
}

async function extractBusinessInfo(
  extractedContent: Record<string, string>
): Promise<{
  businessName: string;
  industry: string;
  servicesOffered: string[];
  pricingInfo: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  businessHours: string | null;
  valuePropositions: string[];
  uniqueSellingPoints: string[];
  commonPainPoints: string[];
}> {
  const combinedContent = Object.entries(extractedContent)
    .map(([page, content]) => `\n=== ${page.toUpperCase()} ===\n${content}`)
    .join("\n");

  const prompt = `Analyze the following website content and extract key business information. Return a valid JSON response only, no markdown.

WEBSITE CONTENT:
${combinedContent}

Respond with this JSON structure:
{
  "businessName": "Company name",
  "industry": "Industry category",
  "servicesOffered": ["service 1", "service 2", ...],
  "pricingInfo": "Price range or null if not found",
  "contactPhone": "Phone number or null",
  "contactEmail": "Email address or null",
  "contactAddress": "Full address or null",
  "businessHours": "Hours description or null",
  "valuePropositions": ["value 1", "value 2", ...],
  "uniqueSellingPoints": ["USP 1", "USP 2", ...],
  "commonPainPoints": ["pain point 1", "pain point 2", ...]
}

Be concise and factual. Extract only information clearly stated on the website.`;

  const result = await callClaudeApi(prompt);

  try {
    let jsonStr = result;
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return {
      businessName: parsed.businessName || "Unknown Business",
      industry: parsed.industry || "General",
      servicesOffered: Array.isArray(parsed.servicesOffered)
        ? parsed.servicesOffered
        : [],
      pricingInfo: parsed.pricingInfo || null,
      contactPhone: parsed.contactPhone || null,
      contactEmail: parsed.contactEmail || null,
      contactAddress: parsed.contactAddress || null,
      businessHours: parsed.businessHours || null,
      valuePropositions: Array.isArray(parsed.valuePropositions)
        ? parsed.valuePropositions
        : [],
      uniqueSellingPoints: Array.isArray(parsed.uniqueSellingPoints)
        ? parsed.uniqueSellingPoints
        : [],
      commonPainPoints: Array.isArray(parsed.commonPainPoints)
        ? parsed.commonPainPoints
        : [],
    };
  } catch (err) {
    log("error", "Failed to parse business info response", { error: err instanceof Error ? err.message : String(err) });
    throw new Error("Failed to extract business information");
  }
}

async function generateBusinessInfoFromDescription(
  input: SetupInput
): Promise<{
  businessName: string;
  industry: string;
  servicesOffered: string[];
  pricingInfo: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  businessHours: string | null;
  valuePropositions: string[];
  uniqueSellingPoints: string[];
  commonPainPoints: string[];
}> {
  const prompt = `Based on the following business information, generate a detailed business profile. Return valid JSON only, no markdown.

Business Information:
${input.business_description ? `Description: ${input.business_description}` : ""}
${input.industry ? `Industry: ${input.industry}` : ""}
${input.product_or_service ? `Product/Service: ${input.product_or_service}` : ""}
${input.target_audience ? `Target Audience: ${input.target_audience}` : ""}
${input.price_range ? `Price Range: ${input.price_range}` : ""}
${input.selling_for ? `Selling For: ${input.selling_for}` : ""}
${input.additional_context ? `Additional Context: ${input.additional_context}` : ""}

Generate this JSON structure:
{
  "businessName": "Business name (infer from context if not explicit)",
  "industry": "Industry category",
  "servicesOffered": ["service 1", "service 2", ...],
  "pricingInfo": "Price info or null",
  "contactPhone": null,
  "contactEmail": null,
  "contactAddress": null,
  "businessHours": null,
  "valuePropositions": ["value 1", "value 2", ...],
  "uniqueSellingPoints": ["USP 1", "USP 2", ...],
  "commonPainPoints": ["pain point 1", "pain point 2", ...]
}

Be realistic and specific to the business described.`;

  const result = await callClaudeApi(prompt);

  try {
    let jsonStr = result;
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return {
      businessName: parsed.businessName || "Your Business",
      industry: parsed.industry || input.industry || "General",
      servicesOffered: Array.isArray(parsed.servicesOffered)
        ? parsed.servicesOffered
        : [input.product_or_service || "Service"].filter(Boolean),
      pricingInfo: parsed.pricingInfo || input.price_range || null,
      contactPhone: parsed.contactPhone || null,
      contactEmail: parsed.contactEmail || null,
      contactAddress: parsed.contactAddress || null,
      businessHours: parsed.businessHours || null,
      valuePropositions: Array.isArray(parsed.valuePropositions)
        ? parsed.valuePropositions
        : [],
      uniqueSellingPoints: Array.isArray(parsed.uniqueSellingPoints)
        ? parsed.uniqueSellingPoints
        : [],
      commonPainPoints: Array.isArray(parsed.commonPainPoints)
        ? parsed.commonPainPoints
        : [],
    };
  } catch (err) {
    log("error", "Failed to generate business info", { error: err instanceof Error ? err.message : String(err) });
    throw new Error("Failed to generate business information");
  }
}

export async function generateBusinessIntelligence(
  input: SetupInput
): Promise<BusinessIntelligence> {
  if (
    !input.website_url &&
    !input.business_description &&
    !input.industry &&
    !input.product_or_service
  ) {
    throw new Error(
      "At least one of: website_url, business_description, industry, or product_or_service is required"
    );
  }

  let businessInfo;
  let contentContext = "";

  // Step 1: Get website content if provided
  if (input.website_url) {
    try {
      const pages = await fetchAndParsePages(input.website_url);
      if (Object.keys(pages).length > 0) {
        businessInfo = await extractBusinessInfo(pages);
        contentContext = Object.entries(pages)
          .map(([page, content]) => `${page}: ${content.substring(0, 500)}`)
          .join("\n\n");
      } else {
        throw new Error("No content extracted");
      }
    } catch (err) {
      log("warn", "Failed to fetch website, using description instead", { error: err instanceof Error ? err.message : String(err) });
      businessInfo = await generateBusinessInfoFromDescription(input);
      contentContext = `${input.business_description || ""} ${input.product_or_service || ""}`.trim();
    }
  } else {
    businessInfo = await generateBusinessInfoFromDescription(input);
    contentContext = `${input.business_description || ""} ${input.product_or_service || ""}`.trim();
  }

  // Step 2: Build rich context for agent knowledge
  const fullContext = `
Business Name: ${businessInfo.businessName}
Industry: ${input.industry || businessInfo.industry}
${input.selling_for ? `Selling For: ${input.selling_for}` : ""}
${input.product_or_service ? `Product/Service: ${input.product_or_service}` : ""}
${input.target_audience ? `Target Audience: ${input.target_audience}` : ""}
${input.price_range ? `Price Range: ${input.price_range}` : businessInfo.pricingInfo ? `Pricing: ${businessInfo.pricingInfo}` : ""}
${input.additional_context ? `Additional Context: ${input.additional_context}` : ""}

Services Offered: ${businessInfo.servicesOffered.join(", ")}
Value Propositions: ${businessInfo.valuePropositions.join(", ")}
Unique Selling Points: ${businessInfo.uniqueSellingPoints.join(", ")}
Common Pain Points: ${businessInfo.commonPainPoints.join(", ")}

${contentContext ? `Website/Content Summary: ${contentContext}` : ""}
`;

  // Step 3: Generate agent knowledge with proper use case and tone
  const knowledge = await generateAgentKnowledge(
    fullContext,
    input.use_case,
    input.tone
  );

  return {
    ...businessInfo,
    industry: input.industry || businessInfo.industry,
    agentGreetingScript: knowledge.agentGreetingScript,
    faqPairs: knowledge.faqPairs,
    objectionHandlers: knowledge.objectionHandlers,
    bookingScript: knowledge.bookingScript,
    followUpTexts: knowledge.followUpTexts,
    followUpEmails: knowledge.followUpEmails,
    recommendedTone: knowledge.recommendedTone,
    recommendedPersonality: knowledge.recommendedPersonality,
    keyPhrases: knowledge.keyPhrases,
    thingToNeverSay: knowledge.thingToNeverSay,
    qualifyingQuestions: knowledge.qualifyingQuestions,
    extractedAt: new Date(),
  };
}

export async function scrapeAndAnalyze(
  url: string,
  workspaceId: string
): Promise<WebsiteIntelligence> {
  const pages = await fetchAndParsePages(url);

  if (Object.keys(pages).length === 0) {
    throw new Error(`Unable to fetch content from ${url}`);
  }

  const businessInfo = await extractBusinessInfo(pages);
  const knowledge = await generateAgentKnowledge(
    Object.entries(pages)
      .map(([page, content]) => `${page}: ${content}`)
      .join("\n\n")
  );

  return {
    ...businessInfo,
    ...knowledge,
    extractedAt: new Date(),
  };
}
