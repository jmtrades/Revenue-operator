/**
 * Curated self-hosted voices from the Recall voice server.
 * These voices are generated locally and provide cost savings compared to ElevenLabs.
 * 30+ diverse voices across multiple accents, genders, and tones.
 */

export type RecallVoice = {
  id: string;
  name: string;
  desc: string;
  description: string;
  accent: string;
  gender: "female" | "male" | "neutral";
  age: "young" | "middle-aged";
  tone: string;
  bestFor: string;
};

export const RECALL_VOICES: RecallVoice[] = [
  // ============================================================================
  // AMERICAN FEMALE VOICES (8)
  // ============================================================================

  {
    id: "us-female-warm-receptionist",
    name: "Sarah",
    desc: "Warm receptionist",
    description: "Warm & welcoming receptionist voice",
    accent: "American",
    gender: "female",
    age: "young",
    tone: "warm",
    bestFor: "Customer service, reception, greeting",
  },
  {
    id: "us-female-professional",
    name: "Jennifer",
    desc: "Professional",
    description: "Professional & articulate",
    accent: "American",
    gender: "female",
    age: "middle-aged",
    tone: "professional",
    bestFor: "Corporate, formal, office communications",
  },
  {
    id: "us-female-casual",
    name: "Emma",
    desc: "Casual & friendly",
    description: "Casual & approachable",
    accent: "American",
    gender: "female",
    age: "young",
    tone: "casual",
    bestFor: "Startups, modern brands, relaxed settings",
  },
  {
    id: "us-female-energetic",
    name: "Madison",
    desc: "Energetic & upbeat",
    description: "Energetic & upbeat",
    accent: "American",
    gender: "female",
    age: "young",
    tone: "energetic",
    bestFor: "Promotions, events, exciting announcements",
  },
  {
    id: "us-female-calm",
    name: "Rachel",
    desc: "Calm & reassuring",
    description: "Calm & reassuring",
    accent: "American",
    gender: "female",
    age: "middle-aged",
    tone: "calm",
    bestFor: "Healthcare, support, sensitive topics",
  },
  {
    id: "us-female-authoritative",
    name: "Victoria",
    desc: "Authoritative",
    description: "Authoritative & commanding",
    accent: "American",
    gender: "female",
    age: "middle-aged",
    tone: "authoritative",
    bestFor: "Compliance, security, executive communications",
  },
  {
    id: "us-female-friendly",
    name: "Holly",
    desc: "Friendly & personable",
    description: "Friendly & personable",
    accent: "American",
    gender: "female",
    age: "young",
    tone: "friendly",
    bestFor: "Customer service, community engagement",
  },
  {
    id: "us-female-empathetic",
    name: "Sophie",
    desc: "Empathetic & compassionate",
    description: "Empathetic & compassionate",
    accent: "American",
    gender: "female",
    age: "middle-aged",
    tone: "empathetic",
    bestFor: "Counseling, healthcare, crisis support",
  },

  // ============================================================================
  // BRITISH FEMALE VOICES (4)
  // ============================================================================

  {
    id: "uk-female-professional",
    name: "Charlotte",
    desc: "Professional British",
    description: "Professional British accent",
    accent: "British",
    gender: "female",
    age: "middle-aged",
    tone: "professional",
    bestFor: "Luxury brands, upscale services, premium clients",
  },
  {
    id: "uk-female-warm",
    name: "Olivia",
    desc: "Warm British",
    description: "Warm British accent",
    accent: "British",
    gender: "female",
    age: "young",
    tone: "warm",
    bestFor: "Hospitality, engagement, relationship building",
  },
  {
    id: "uk-female-casual",
    name: "Poppy",
    desc: "Casual British",
    description: "Casual British voice",
    accent: "British",
    gender: "female",
    age: "young",
    tone: "casual",
    bestFor: "Modern brands, youth-focused, trendy",
  },
  {
    id: "uk-female-authoritative",
    name: "Eleanor",
    desc: "Authoritative British",
    description: "Authoritative British accent",
    accent: "British",
    gender: "female",
    age: "middle-aged",
    tone: "authoritative",
    bestFor: "Governance, executive, formal authority",
  },

  // ============================================================================
  // AUSTRALIAN FEMALE VOICES (2)
  // ============================================================================

  {
    id: "au-female-friendly",
    name: "Chloe",
    desc: "Friendly Australian",
    description: "Friendly Australian accent",
    accent: "Australian",
    gender: "female",
    age: "young",
    tone: "friendly",
    bestFor: "Casual, modern, down-to-earth communications",
  },
  {
    id: "au-female-professional",
    name: "Isabella",
    desc: "Professional Australian",
    description: "Professional Australian accent",
    accent: "Australian",
    gender: "female",
    age: "middle-aged",
    tone: "professional",
    bestFor: "Business communications, professional settings",
  },

  // ============================================================================
  // AMERICAN MALE VOICES (8)
  // ============================================================================

  {
    id: "us-male-confident",
    name: "Adam",
    desc: "Confident",
    description: "Confident & authoritative",
    accent: "American",
    gender: "male",
    age: "middle-aged",
    tone: "confident",
    bestFor: "Sales, persuasive communications, confidence",
  },
  {
    id: "us-male-casual",
    name: "Sam",
    desc: "Casual",
    description: "Casual & approachable",
    accent: "American",
    gender: "male",
    age: "young",
    tone: "casual",
    bestFor: "Tech startups, modern brands, approachable",
  },
  {
    id: "us-male-professional",
    name: "James",
    desc: "Professional",
    description: "Professional & measured",
    accent: "American",
    gender: "male",
    age: "middle-aged",
    tone: "professional",
    bestFor: "Corporate, formal, business settings",
  },
  {
    id: "us-male-warm",
    name: "Michael",
    desc: "Warm & personable",
    description: "Warm & personable",
    accent: "American",
    gender: "male",
    age: "middle-aged",
    tone: "warm",
    bestFor: "Relationship building, personal connection",
  },
  {
    id: "us-male-energetic",
    name: "Nathan",
    desc: "Energetic & passionate",
    description: "Energetic & passionate",
    accent: "American",
    gender: "male",
    age: "young",
    tone: "energetic",
    bestFor: "Promotions, exciting announcements, enthusiasm",
  },
  {
    id: "us-male-calm",
    name: "Daniel",
    desc: "Calm & measured",
    description: "Calm & measured",
    accent: "American",
    gender: "male",
    age: "middle-aged",
    tone: "calm",
    bestFor: "Healthcare, support, thoughtful communications",
  },
  {
    id: "us-male-deep",
    name: "Marcus",
    desc: "Deep & commanding",
    description: "Deep & commanding presence",
    accent: "American",
    gender: "male",
    age: "middle-aged",
    tone: "deep",
    bestFor: "Executive, authority, prestige, gravitas",
  },
  {
    id: "us-male-friendly",
    name: "Chris",
    desc: "Friendly",
    description: "Friendly & approachable",
    accent: "American",
    gender: "male",
    age: "young",
    tone: "friendly",
    bestFor: "Outbound calling, engagement, approachable",
  },

  // ============================================================================
  // BRITISH MALE VOICES (4)
  // ============================================================================

  {
    id: "uk-male-professional",
    name: "George",
    desc: "Professional British",
    description: "Professional British accent",
    accent: "British",
    gender: "male",
    age: "middle-aged",
    tone: "professional",
    bestFor: "Finance, corporate, professional settings",
  },
  {
    id: "uk-male-warm",
    name: "William",
    desc: "Warm British",
    description: "Warm British accent",
    accent: "British",
    gender: "male",
    age: "middle-aged",
    tone: "warm",
    bestFor: "Relationship building, personal touch, rapport",
  },
  {
    id: "uk-male-casual",
    name: "Liam",
    desc: "Casual British",
    description: "Casual British accent",
    accent: "British",
    gender: "male",
    age: "young",
    tone: "casual",
    bestFor: "Youthful, modern, trendy brands",
  },
  {
    id: "uk-male-deep",
    name: "Benedict",
    desc: "Deep authoritative British",
    description: "Deep, authoritative British accent",
    accent: "British",
    gender: "male",
    age: "middle-aged",
    tone: "deep",
    bestFor: "Prestige, gravitas, executive authority",
  },

  // ============================================================================
  // AUSTRALIAN MALE VOICES (2)
  // ============================================================================

  {
    id: "au-male-friendly",
    name: "Oliver",
    desc: "Friendly Australian",
    description: "Friendly Australian accent",
    accent: "Australian",
    gender: "male",
    age: "young",
    tone: "friendly",
    bestFor: "Casual, down-to-earth, friendly communications",
  },
  {
    id: "au-male-professional",
    name: "Jack",
    desc: "Professional Australian",
    description: "Professional Australian accent",
    accent: "Australian",
    gender: "male",
    age: "middle-aged",
    tone: "professional",
    bestFor: "Business-focused interactions, professional",
  },

  // ============================================================================
  // NEUTRAL/ANDROGYNOUS VOICES (2)
  // ============================================================================

  {
    id: "neutral-professional",
    name: "Casey",
    desc: "Professional neutral",
    description: "Professional & inclusive",
    accent: "American",
    gender: "neutral",
    age: "young",
    tone: "professional",
    bestFor: "Inclusive communications, modern, professional",
  },
  {
    id: "neutral-friendly",
    name: "Alex",
    desc: "Friendly neutral",
    description: "Friendly & approachable",
    accent: "American",
    gender: "neutral",
    age: "young",
    tone: "friendly",
    bestFor: "Diverse teams, inclusive, approachable",
  },
];

export const DEFAULT_RECALL_VOICE_ID = RECALL_VOICES[0].id;

/**
 * Search for voices by criteria.
 */
export function searchRecallVoices(options: {
  gender?: string;
  accent?: string;
  tone?: string;
  age?: string;
}): RecallVoice[] {
  return RECALL_VOICES.filter((voice) => {
    if (options.gender && voice.gender !== options.gender) return false;
    if (options.accent && voice.accent !== options.accent) return false;
    if (options.tone && voice.tone !== options.tone) return false;
    if (options.age && voice.age !== options.age) return false;
    return true;
  });
}

/**
 * Get all unique accents available.
 */
export function getRecallAccents(): string[] {
  const accents = new Set(RECALL_VOICES.map((v) => v.accent));
  return Array.from(accents).sort();
}

/**
 * Get all unique tones available.
 */
export function getRecallTones(): string[] {
  const tones = new Set(RECALL_VOICES.map((v) => v.tone));
  return Array.from(tones).sort();
}
