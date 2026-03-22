/**
 * Website Intelligence Scraper - Fully automatic agent setup
 * Fetches website content, extracts business intelligence, and generates agent knowledge
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface TextContent {
  text: string;
}

interface MessageResponse {
  content: TextContent[];
}

export interface WebsiteIntelligence {
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
  recommendedTone: string;
  recommendedPersonality: string;
  keyPhrases: string[];
  thingToNeverSay: string[];
  extractedAt: Date;
}

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
    console.error(`Failed to fetch ${url}:`, err);
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
      model: "claude-opus-4-1",
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
  extractedContent: Record<string, string>
): Promise<{
  agentGreetingScript: string;
  faqPairs: Array<{ question: string; answer: string }>;
  objectionHandlers: Array<{ objection: string; handler: string }>;
  bookingScript: string | null;
  followUpTexts: string[];
  recommendedTone: string;
  recommendedPersonality: string;
  keyPhrases: string[];
  thingToNeverSay: string[];
}> {
  const combinedContent = Object.entries(extractedContent)
    .map(([page, content]) => `\n=== ${page.toUpperCase()} ===\n${content}`)
    .join("\n");

  const prompt = `You are an expert sales training consultant. Analyze the following website content and generate professional sales scripts and guidance for an AI sales agent.

WEBSITE CONTENT:
${combinedContent}

Please provide a JSON response with the following structure (valid JSON only, no markdown):
{
  "agentGreetingScript": "A natural, professional greeting script (2-3 sentences) the agent should use when initiating contact",
  "faqPairs": [
    {"question": "...", "answer": "..."},
    // 10-15 pairs based on the business offerings and common customer questions
  ],
  "objectionHandlers": [
    {"objection": "Price is too high", "handler": "..."},
    {"objection": "Need to think about it", "handler": "..."},
    {"objection": "We have a competitor already", "handler": "..."},
    // 8-10 total handlers for common objections
  ],
  "bookingScript": "Script for booking a meeting or demo (2-3 sentences), or null if not applicable",
  "followUpTexts": [
    "Text 1 for following up after initial contact",
    "Text 2 for re-engagement after no response",
    "Text 3 for confirming appointment",
    "Text 4 for introducing a discount/offer",
    "Text 5 for checking in after demo"
  ],
  "recommendedTone": "professional, friendly, consultative, etc.",
  "recommendedPersonality": "Brief description of the ideal agent personality: professional, energetic, empathetic, etc.",
  "keyPhrases": ["phrase 1", "phrase 2", ...] // 8-12 powerful phrases the agent should use frequently,
  "thingToNeverSay": ["phrase 1", "phrase 2", ...] // 5-8 phrases or topics to avoid
}

Generate realistic, actionable scripts based on the actual business type and offerings. All responses must be valid JSON.`;

  const result = await callClaudeApi(prompt);

  try {
    // Extract JSON from response (handle potential markdown wrapping)
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
      recommendedTone: parsed.recommendedTone || "professional",
      recommendedPersonality: parsed.recommendedPersonality || "professional",
      keyPhrases: Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : [],
      thingToNeverSay: Array.isArray(parsed.thingToNeverSay)
        ? parsed.thingToNeverSay
        : [],
    };
  } catch (err) {
    console.error("Failed to parse Claude response as JSON:", err);
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
    console.error("Failed to parse business info response:", err);
    throw new Error("Failed to extract business information");
  }
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
  const knowledge = await generateAgentKnowledge(pages);

  return {
    ...businessInfo,
    ...knowledge,
    extractedAt: new Date(),
  };
}
