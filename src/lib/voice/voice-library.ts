/**
 * Curated voice library for Revenue Operator.
 *
 * Provides a catalog of phone-optimized voices with:
 * - Industry-specific recommendations
 * - Voice personality profiles
 * - Phone audio quality ratings
 * - Preview configuration for the voice selector UI
 *
 * Each voice is tuned for telephony (8kHz mu-law) with:
 * - De-essing for sibilant reduction
 * - Low-end boost for phone speaker warmth
 * - Dynamic range compression for consistent volume
 * - Pitch and speed tuning per persona
 */

export interface VoiceProfile {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  accent: string;
  personality: string;
  description: string;
  /** Phone audio quality rating 1-10 */
  phone_quality: number;
  /** Industries this voice works best for */
  recommended_industries: string[];
  /** Voice synthesis config overrides */
  config: VoiceConfig;
  /** Sample phrases for preview */
  preview_phrases: string[];
  /** Tags for search/filter */
  tags: string[];
  /** Whether this voice is available (some may require specific providers) */
  available: boolean;
  /** Provider required for this voice */
  provider: "recall" | "elevenlabs" | "deepgram" | "cartesia" | "polly";
  /** Fallback Polly voice when primary provider unavailable */
  fallback_polly_id: string;
}

export interface VoiceConfig {
  voice_id: string;
  pitch_shift?: number;
  speed?: number;
  stability?: number;
  style?: number;
  warmth?: number;
}

/**
 * Curated voice catalog — each voice is hand-tuned for phone quality.
 *
 * IMPORTANT: voice_ids marked with provider "recall" require the self-hosted
 * voice server to be running. They map to voices registered on that server.
 * Voices marked "polly" work via Twilio TwiML <Say> and are always available.
 *
 * When adding new voices:
 *   1. Verify the voice_id exists on the provider
 *   2. Test phone audio quality at 8kHz mu-law
 *   3. Rate phone_quality honestly (most voices drop 2-3 points over phone)
 */
export const VOICE_LIBRARY: VoiceProfile[] = [
  // ── FEMALE VOICES ──────────────────────────────────────────────
  {
    id: "sarah-warm",
    name: "Sarah",
    gender: "female",
    accent: "American (General)",
    personality: "Warm, confident, approachable",
    description: "The default Revenue Operator voice. Warm and professional with natural conversational rhythm. Perfect for sales and customer service.",
    phone_quality: 9,
    recommended_industries: ["dental", "medical", "legal", "real_estate", "insurance", "financial", "consulting"],
    config: {
      voice_id: "us-female-warm-receptionist",
      speed: 0.98,
      stability: 0.72,
      style: 0.35,
      warmth: 0.8,
    },
    preview_phrases: [
      "Hey there! Thanks for calling. How can I help you today?",
      "That's a great question. Let me look into that for you real quick.",
      "I totally understand your concern. Here's what I'd recommend...",
    ],
    tags: ["warm", "professional", "sales", "operator", "default"],
    available: true,
    provider: "recall",
    fallback_polly_id: "Polly.Joanna-Neural",
  },
  {
    id: "emma-energetic",
    name: "Emma",
    gender: "female",
    accent: "American (Midwest)",
    personality: "Energetic, friendly, enthusiastic",
    description: "High-energy voice perfect for sales-driven businesses. Sounds excited to help without being over the top.",
    phone_quality: 8,
    recommended_industries: ["fitness", "salon", "spa", "retail", "restaurant", "event_planning"],
    config: {
      voice_id: "us-female-energetic",
      speed: 1.02,
      stability: 0.65,
      style: 0.45,
      warmth: 0.75,
    },
    preview_phrases: [
      "Oh awesome, thanks for calling! What can I do for you?",
      "That sounds amazing! Let me get you set up right away.",
      "We'd love to have you. Let me check our availability...",
    ],
    tags: ["energetic", "friendly", "upbeat", "sales"],
    available: true,
    provider: "recall",
    fallback_polly_id: "Polly.Joanna-Neural",
  },
  {
    id: "grace-calm",
    name: "Grace",
    gender: "female",
    accent: "American (Northeast)",
    personality: "Calm, reassuring, authoritative",
    description: "Composed and trustworthy voice ideal for medical, legal, and financial services where callers need reassurance.",
    phone_quality: 9,
    recommended_industries: ["medical", "legal", "financial", "insurance", "veterinary", "mental_health", "senior_care"],
    config: {
      voice_id: "us-female-calm-professional",
      speed: 0.95,
      stability: 0.8,
      style: 0.25,
      warmth: 0.7,
    },
    preview_phrases: [
      "Thank you for calling. I'm here to help. What's going on?",
      "I completely understand. Let me walk you through your options.",
      "You're in good hands. Let me get that scheduled for you.",
    ],
    tags: ["calm", "reassuring", "professional", "medical", "legal"],
    available: true,
    provider: "recall",
    fallback_polly_id: "Polly.Joanna-Neural",
  },
  {
    id: "olivia-british",
    name: "Olivia",
    gender: "female",
    accent: "British (RP)",
    personality: "Polished, sophisticated, articulate",
    description: "British-accented voice that conveys sophistication and credibility. Great for premium brands and consulting.",
    phone_quality: 8,
    recommended_industries: ["consulting", "luxury_retail", "financial", "legal", "education", "tech"],
    config: {
      voice_id: "uk-female-professional",
      speed: 0.96,
      stability: 0.75,
      style: 0.3,
      warmth: 0.65,
    },
    preview_phrases: [
      "Good morning, thank you for ringing. How may I assist you?",
      "Brilliant. I'll sort that out for you straightaway.",
      "I'd be happy to walk you through the details.",
    ],
    tags: ["british", "sophisticated", "polished", "premium"],
    available: true,
    provider: "recall",
    fallback_polly_id: "Polly.Joanna-Neural",
  },

  // ── MALE VOICES ────────────────────────────────────────────────
  {
    id: "james-professional",
    name: "James",
    gender: "male",
    accent: "American (General)",
    personality: "Professional, trustworthy, steady",
    description: "Deep, professional voice that builds instant trust. Ideal for B2B, trades, and services where authority matters.",
    phone_quality: 9,
    recommended_industries: ["hvac", "plumbing", "electrical", "construction", "automotive", "b2b", "it_services"],
    config: {
      voice_id: "us-male-professional",
      speed: 0.96,
      stability: 0.78,
      style: 0.3,
      warmth: 0.7,
    },
    preview_phrases: [
      "Hey there, thanks for calling. What can I help you with today?",
      "Sure thing. Let me get someone out to you as soon as possible.",
      "I hear you. Let me see what we've got available this week.",
    ],
    tags: ["professional", "trustworthy", "deep", "authoritative"],
    available: true,
    provider: "recall",
    fallback_polly_id: "Polly.Matthew-Neural",
  },
  {
    id: "marcus-friendly",
    name: "Marcus",
    gender: "male",
    accent: "American (Southern)",
    personality: "Friendly, laid-back, genuine",
    description: "Warm southern-tinged voice that makes everyone feel welcome. Perfect for hospitality, dining, and local services.",
    phone_quality: 8,
    recommended_industries: ["restaurant", "hospitality", "retail", "real_estate", "home_services", "landscaping"],
    config: {
      voice_id: "us-male-friendly-southern",
      speed: 0.94,
      stability: 0.7,
      style: 0.4,
      warmth: 0.85,
    },
    preview_phrases: [
      "Well hey there! Thanks for giving us a call. What can I do for ya?",
      "Oh absolutely, we can take care of that for you.",
      "No problem at all. Let me get that set up.",
    ],
    tags: ["friendly", "southern", "warm", "welcoming", "hospitality"],
    available: true,
    provider: "recall",
    fallback_polly_id: "Polly.Matthew-Neural",
  },
  {
    id: "alex-tech",
    name: "Alex",
    gender: "male",
    accent: "American (West Coast)",
    personality: "Smart, casual, tech-savvy",
    description: "Modern, tech-forward voice perfect for SaaS, startups, and technology companies. Casual but competent.",
    phone_quality: 8,
    recommended_industries: ["tech", "saas", "startup", "ecommerce", "digital_marketing", "web_design"],
    config: {
      voice_id: "us-male-tech-casual",
      speed: 1.0,
      stability: 0.68,
      style: 0.38,
      warmth: 0.72,
    },
    preview_phrases: [
      "Hey! Thanks for reaching out. What's going on?",
      "Yeah totally, I can walk you through how that works.",
      "Cool, let me pull that up for you real quick.",
    ],
    tags: ["tech", "casual", "modern", "startup"],
    available: true,
    provider: "recall",
    fallback_polly_id: "Polly.Matthew-Neural",
  },

  // ── POLLY VOICES (Twilio fallback) ────────────────────────────
  {
    id: "polly-joanna",
    name: "Joanna (Polly)",
    gender: "female",
    accent: "American (General)",
    personality: "Clear, natural, versatile",
    description: "Amazon Polly Neural voice. Used as fallback when self-hosted voice server is unavailable. Good clarity over phone.",
    phone_quality: 7,
    recommended_industries: ["general"],
    config: {
      voice_id: "Polly.Joanna-Neural",
      speed: 0.98,
    },
    preview_phrases: [
      "Hello, thank you for calling. How can I help you?",
      "I'd be happy to help you with that.",
    ],
    tags: ["polly", "fallback", "neural", "clear"],
    available: true,
    provider: "polly",
    fallback_polly_id: "Polly.Joanna-Neural",
  },
];

/**
 * Resolve a voice to its effective voice_id.
 * Uses primary voice_id if the provider is available,
 * otherwise falls back to the guaranteed-working Polly voice.
 */
export function getEffectiveVoiceId(
  voiceId: string,
  streamingAvailable: boolean,
): string {
  const voice = VOICE_LIBRARY.find((v) => v.id === voiceId);
  if (!voice) return "Polly.Joanna-Neural";

  // Polly voices always work (via TwiML)
  if (voice.provider === "polly") return voice.config.voice_id;

  // Self-hosted voices require streaming server
  if (streamingAvailable) return voice.config.voice_id;

  // Fall back to Polly
  return voice.fallback_polly_id;
}

/**
 * Industry-to-voice recommendation map.
 * Maps industry codes to the best voice IDs for that industry.
 */
export const INDUSTRY_VOICE_MAP: Record<string, string[]> = {
  dental: ["sarah-warm", "grace-calm"],
  medical: ["grace-calm", "sarah-warm"],
  legal: ["grace-calm", "olivia-british", "james-professional"],
  real_estate: ["sarah-warm", "marcus-friendly", "james-professional"],
  insurance: ["sarah-warm", "grace-calm", "james-professional"],
  financial: ["grace-calm", "olivia-british", "james-professional"],
  consulting: ["olivia-british", "grace-calm", "james-professional"],
  hvac: ["james-professional", "marcus-friendly"],
  plumbing: ["james-professional", "marcus-friendly"],
  electrical: ["james-professional", "marcus-friendly"],
  construction: ["james-professional", "marcus-friendly"],
  automotive: ["james-professional", "marcus-friendly"],
  restaurant: ["emma-energetic", "marcus-friendly"],
  hospitality: ["marcus-friendly", "emma-energetic", "sarah-warm"],
  salon: ["emma-energetic", "sarah-warm"],
  spa: ["grace-calm", "emma-energetic"],
  fitness: ["emma-energetic", "alex-tech"],
  retail: ["emma-energetic", "sarah-warm", "marcus-friendly"],
  tech: ["alex-tech", "sarah-warm"],
  saas: ["alex-tech", "sarah-warm"],
  startup: ["alex-tech", "emma-energetic"],
  ecommerce: ["alex-tech", "sarah-warm"],
  education: ["olivia-british", "grace-calm", "sarah-warm"],
  veterinary: ["grace-calm", "sarah-warm"],
  mental_health: ["grace-calm"],
  senior_care: ["grace-calm", "sarah-warm"],
  home_services: ["james-professional", "marcus-friendly"],
  landscaping: ["marcus-friendly", "james-professional"],
  it_services: ["alex-tech", "james-professional"],
  b2b: ["james-professional", "sarah-warm"],
  web_design: ["alex-tech", "emma-energetic"],
  digital_marketing: ["alex-tech", "emma-energetic"],
  luxury_retail: ["olivia-british", "grace-calm"],
  event_planning: ["emma-energetic", "sarah-warm"],
};

/**
 * Get the recommended voice for an industry.
 * Returns the top recommendation, or the default voice if industry not found.
 */
export function getRecommendedVoice(industry: string): VoiceProfile {
  const voiceIds = INDUSTRY_VOICE_MAP[industry.toLowerCase()] ?? INDUSTRY_VOICE_MAP["general"];
  const voiceId = voiceIds?.[0] ?? "sarah-warm";
  return VOICE_LIBRARY.find((v) => v.id === voiceId) ?? VOICE_LIBRARY[0];
}

/**
 * Get all voices sorted by relevance for a given industry.
 */
export function getVoicesForIndustry(industry: string): VoiceProfile[] {
  const recommended = INDUSTRY_VOICE_MAP[industry.toLowerCase()] ?? [];
  const _recommendedSet = new Set(recommended);

  // Sort: recommended first (in order), then rest by phone quality
  return [...VOICE_LIBRARY].sort((a, b) => {
    const aRec = recommended.indexOf(a.id);
    const bRec = recommended.indexOf(b.id);
    if (aRec >= 0 && bRec >= 0) return aRec - bRec;
    if (aRec >= 0) return -1;
    if (bRec >= 0) return 1;
    return b.phone_quality - a.phone_quality;
  });
}

/**
 * Search voices by query (name, tag, personality, accent).
 */
export function searchVoices(query: string): VoiceProfile[] {
  const q = query.toLowerCase();
  return VOICE_LIBRARY.filter((v) =>
    v.name.toLowerCase().includes(q) ||
    v.tags.some((t) => t.includes(q)) ||
    v.personality.toLowerCase().includes(q) ||
    v.accent.toLowerCase().includes(q) ||
    v.description.toLowerCase().includes(q)
  );
}

/**
 * Get a voice profile by ID.
 */
export function getVoiceById(id: string): VoiceProfile | undefined {
  return VOICE_LIBRARY.find((v) => v.id === id);
}
