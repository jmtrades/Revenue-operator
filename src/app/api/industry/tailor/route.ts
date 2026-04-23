/**
 * POST /api/industry/tailor
 *
 * Phase 82 — Unlimited industries. When a visitor types a custom industry
 * (any freetext, e.g. "vintage watch restoration" or "commercial beekeeping"),
 * this endpoint uses the OpenAI gpt-4o-mini model to generate a tailored
 * industry pack: greeting script, 5-7 FAQs, follow-up cadence, voice tone,
 * and a short list of commonly asked services. The response is shaped to
 * match the `industry_templates` table so the rest of the onboarding flow
 * treats it identically to a built-in preset.
 *
 * Security:
 * - CSRF: assertSameOrigin on POST
 * - Rate limit: 10 requests / hour per IP (freetext LLM endpoints are
 *   expensive and abusable). Backed by in-memory map which is fine for
 *   single-region deploy; upgrade to Redis when we go multi-region.
 * - Input sanitisation: industry must be 2-120 chars, alphanumeric+
 *   whitespace+punctuation. Rejects prompt-injection attempts containing
 *   common override patterns ("ignore previous", "system:", etc).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { assertSameOrigin } from "@/lib/http/csrf";

/** Shape the client expects back — identical to industry_templates rows. */
export interface TailoredIndustryPack {
  industry_slug: string;
  industry_name: string;
  default_greeting: string;
  default_faq: { question: string; answer: string }[];
  default_follow_up_cadence: string[];
  voice_tone: string;
  recommended_services: string[];
  // Flag so downstream code can differentiate AI-generated from built-in packs.
  ai_generated: true;
}

/** Cheap in-memory IP rate limiter. 10 req/hour is enough for legit use. */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateHits.set(ip, hits);
  return false;
}

/** Strip obvious prompt-injection patterns before passing to the LLM. */
const INJECTION_PATTERNS = [
  /ignore\s+(all|any|previous|prior)\s+instructions/i,
  /system\s*:/i,
  /\bassistant\s*:/i,
  /\buser\s*:/i,
  /\b(act|pretend|roleplay)\s+as\b/i,
  /\bdisregard\b.*\b(rules|instructions|prompt)\b/i,
  /<\|(im_start|im_end|endoftext)\|>/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

/** Slugify "Vintage Watch Restoration" -> "vintage_watch_restoration" so
 * downstream code can key on it like a preset. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/** JSON-schema style guard for the LLM response. */
const RESPONSE_SCHEMA_HINT = `{
  "industry_name": "canonical display name, e.g. 'Vintage Watch Restoration'",
  "default_greeting": "15-35 word phone greeting the AI agent will use when answering inbound calls. Warm, professional, mentions the business generically ('thanks for calling — how can I help you today?').",
  "default_faq": [
    { "question": "...", "answer": "2-3 sentence answer..." }
  ],
  "default_follow_up_cadence": [
    "Day 0: ...",
    "Day 1: ...",
    "Day 3: ...",
    "Day 7: ...",
    "Day 14: ..."
  ],
  "voice_tone": "Short phrase describing tone — e.g. 'Warm, professional, detail-oriented'.",
  "recommended_services": ["4-6 short service labels typical for this industry"]
}`;

const SYSTEM_PROMPT = `You are a revenue-operations consultant generating a
tailored AI-agent playbook for a specific business industry. Produce ONLY
valid JSON matching the provided shape. The playbook must be realistic,
professional, and immediately usable by a front-desk AI agent that answers
phones, books appointments, qualifies leads, and follows up. Do NOT include
placeholder text like "[Your Business]" — write natural, production-ready
copy that works across most businesses in the industry. Never invent
specific regulations, pricing, or legal claims. Keep each FAQ answer under
60 words. Return 5-7 FAQs.`.replace(/\n\s+/g, " ").trim();

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { industry?: string };
  const raw = (body.industry ?? "").toString();
  const industry = raw.trim();

  // Validate length + characters.
  if (industry.length < 2 || industry.length > 120) {
    return NextResponse.json(
      { error: "Industry must be between 2 and 120 characters." },
      { status: 400 }
    );
  }
  if (!/^[\p{L}\p{N}\s&/.,'()\-]+$/u.test(industry)) {
    return NextResponse.json(
      { error: "Industry contains invalid characters." },
      { status: 400 }
    );
  }
  if (containsInjection(industry)) {
    return NextResponse.json(
      { error: "Industry text is not valid." },
      { status: 400 }
    );
  }

  const slug = slugify(industry);
  if (!slug) {
    return NextResponse.json(
      { error: "Could not derive a slug from that industry name." },
      { status: 400 }
    );
  }

  const openai = getOpenAI();
  if (!openai) {
    // In sandbox / CI / dev without key — return a sensible generic pack
    // rather than an error so the onboarding flow never blocks on infra.
    const fallback: TailoredIndustryPack = {
      industry_slug: slug,
      industry_name: industry,
      default_greeting: `Thanks so much for calling — how can I help you today?`,
      default_faq: [
        {
          question: "What services do you offer?",
          answer:
            "We handle inquiries, appointment booking, quotes, and follow-up so you never miss an opportunity. Tell me a little about what you need and I'll route you to the right person.",
        },
        {
          question: "What are your hours?",
          answer:
            "Our live team is usually available during standard business hours, and our AI operator answers calls 24/7 — I can book you in or take a message any time.",
        },
        {
          question: "How quickly can I get a response?",
          answer:
            "If it's time-sensitive I can flag it for an immediate callback. Otherwise we'll reach back out within one business day.",
        },
      ],
      default_follow_up_cadence: [
        "Day 0: Confirmation text + calendar invite",
        "Day 1: Reminder with what to bring / prep",
        "Day 3: Check-in if no reply",
        "Day 7: Final follow-up with soft CTA",
      ],
      voice_tone: "Warm, professional, and confident",
      recommended_services: ["Consultations", "Appointment booking", "Follow-up", "Quote requests"],
      ai_generated: true,
    };
    return NextResponse.json({ ok: true, pack: fallback, fallback: true });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nReturn JSON matching this shape:\n${RESPONSE_SCHEMA_HINT}` },
        {
          role: "user",
          content: `Generate a tailored AI-agent playbook for this industry: "${industry}". Return only the JSON object — no prose before or after.`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("Empty LLM response");

    const parsed = JSON.parse(text) as Partial<TailoredIndustryPack>;

    // Defensive — the model occasionally omits fields; fill gaps.
    const pack: TailoredIndustryPack = {
      industry_slug: slug,
      industry_name:
        (typeof parsed.industry_name === "string" && parsed.industry_name.trim()) || industry,
      default_greeting:
        (typeof parsed.default_greeting === "string" && parsed.default_greeting.trim()) ||
        `Thanks for calling — how can I help you today?`,
      default_faq: Array.isArray(parsed.default_faq)
        ? parsed.default_faq
            .filter(
              (f): f is { question: string; answer: string } =>
                !!f &&
                typeof (f as { question: unknown }).question === "string" &&
                typeof (f as { answer: unknown }).answer === "string"
            )
            .slice(0, 7)
        : [],
      default_follow_up_cadence: Array.isArray(parsed.default_follow_up_cadence)
        ? parsed.default_follow_up_cadence.filter((s): s is string => typeof s === "string").slice(0, 8)
        : [],
      voice_tone:
        (typeof parsed.voice_tone === "string" && parsed.voice_tone.trim()) ||
        "Warm, professional, and confident",
      recommended_services: Array.isArray(parsed.recommended_services)
        ? parsed.recommended_services.filter((s): s is string => typeof s === "string").slice(0, 8)
        : [],
      ai_generated: true,
    };

    return NextResponse.json({ ok: true, pack });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not generate a tailored pack for that industry. (${message.slice(0, 80)})` },
      { status: 500 }
    );
  }
}
