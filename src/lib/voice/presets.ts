/**
 * Voice presets — curated bundles of voice ID + tone + pacing + energy
 * optimized for specific business outcomes.
 *
 * Each preset is designed for a category of business and conversation type.
 * The system should recommend presets based on the industry selected during
 * agent setup, with warnings when a user selects a mismatched preset.
 */

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  voiceId: string;
  voiceName: string;
  /** Speaking speed override (0.85–1.05) */
  speed: number;
  /** Warmth override (0.3–0.8) */
  warmth: number;
  /** Energy level: low = calm/professional, high = enthusiastic */
  energy: "low" | "medium" | "high";
  /** Formality: 1 = very casual, 5 = very formal */
  formality: 1 | 2 | 3 | 4 | 5;
  /** Best industries for this preset */
  bestFor: string[];
  /** Conversion goal this preset optimizes for */
  conversionGoal: string;
  /** Industries where this preset should NOT be used */
  avoidFor: string[];
  /** Warning message if user selects this for a mismatched industry */
  mismatchWarning?: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "warm-welcome",
    name: "Warm Welcome",
    description: "Calm, reassuring tone that makes callers feel safe and cared for. Best for healthcare and wellness businesses.",
    voiceId: "us-female-warm-receptionist",
    voiceName: "Sarah",
    speed: 0.91,
    warmth: 0.72,
    energy: "low",
    formality: 3,
    bestFor: ["medical", "dental", "therapy", "spa", "wellness", "veterinary", "senior-care"],
    conversionGoal: "New patient booking — caller must feel safe and unhurried",
    avoidFor: ["sales", "collections"],
    mismatchWarning: "This voice is optimized for care-focused businesses. For sales or high-energy contexts, consider 'Confident Booker' or 'Assertive Follow-Up'.",
  },
  {
    id: "confident-booker",
    name: "Confident Booker",
    description: "Efficient and friendly — gets to the booking fast without feeling pushy. Ideal for appointment-led service businesses.",
    voiceId: "us-female-professional",
    voiceName: "Jennifer",
    speed: 0.95,
    warmth: 0.55,
    energy: "medium",
    formality: 3,
    bestFor: ["salon", "fitness", "home-services", "auto-repair", "cleaning", "photography"],
    conversionGoal: "Fast appointment lock with minimal back-and-forth",
    avoidFor: ["legal", "medical", "financial"],
    mismatchWarning: "This preset prioritizes speed over reassurance. For sensitive industries, consider 'Warm Welcome' or 'Calm Authority'.",
  },
  {
    id: "calm-authority",
    name: "Calm Authority",
    description: "Professional and measured — builds trust through competence. Ideal for legal, financial, and insurance.",
    voiceId: "us-male-professional",
    voiceName: "Adam",
    speed: 0.90,
    warmth: 0.50,
    energy: "low",
    formality: 4,
    bestFor: ["legal", "financial", "insurance", "accounting", "consulting", "real-estate"],
    conversionGoal: "Trust-building and information capture — caller must feel heard",
    avoidFor: ["restaurant", "retail", "entertainment"],
  },
  {
    id: "friendly-helper",
    name: "Friendly Helper",
    description: "Upbeat and approachable — callers leave smiling. Perfect for casual, customer-facing businesses.",
    voiceId: "us-female-casual",
    voiceName: "Emma",
    speed: 0.96,
    warmth: 0.68,
    energy: "high",
    formality: 2,
    bestFor: ["restaurant", "retail", "entertainment", "events", "pet-services", "tutoring"],
    conversionGoal: "Delight and booking — caller leaves with a positive impression",
    avoidFor: ["legal", "medical", "financial"],
    mismatchWarning: "This preset's casual energy may feel inappropriate for professional or regulated industries.",
  },
  {
    id: "premium-concierge",
    name: "Premium Concierge",
    description: "Refined and unhurried — white-glove service feel. For high-end and luxury businesses.",
    voiceId: "uk-female-warm",
    voiceName: "Charlotte",
    speed: 0.88,
    warmth: 0.60,
    energy: "low",
    formality: 4,
    bestFor: ["luxury-spa", "high-end-clinic", "private-practice", "architecture", "wealth-management"],
    conversionGoal: "Exclusivity — caller feels they are receiving premium service",
    avoidFor: ["hvac", "plumbing", "fast-food"],
  },
  {
    id: "assertive-followup",
    name: "Assertive Follow-Up",
    description: "Confident and direct — re-engages leads without being pushy. Built for outbound sales and follow-ups.",
    voiceId: "us-male-confident",
    voiceName: "Sam",
    speed: 0.97,
    warmth: 0.45,
    energy: "medium",
    formality: 3,
    bestFor: ["sales", "lead-follow-up", "reactivation", "setter", "agency"],
    conversionGoal: "Re-engagement — get the lead back on track toward a booking or meeting",
    avoidFor: ["medical", "therapy", "senior-care"],
    mismatchWarning: "This assertive style may feel inappropriate for care-focused or sensitive industries.",
  },
  {
    id: "gentle-reminder",
    name: "Gentle Reminder",
    description: "Soft and non-intrusive — perfect for appointment reminders and no-show follow-ups.",
    voiceId: "us-female-calm",
    voiceName: "Rachel",
    speed: 0.92,
    warmth: 0.70,
    energy: "low",
    formality: 3,
    bestFor: ["appointment-reminders", "no-show-recovery", "check-ins", "any-industry"],
    conversionGoal: "Confirmation — reduce no-show rate and maintain relationship",
    avoidFor: [],
  },
  {
    id: "local-friendly",
    name: "Local Friendly",
    description: "Approachable and trustworthy — like a neighbor who happens to be great at their job.",
    voiceId: "us-female-friendly",
    voiceName: "Holly",
    speed: 0.95,
    warmth: 0.65,
    energy: "medium",
    formality: 2,
    bestFor: ["hvac", "plumbing", "roofing", "contractors", "landscaping", "pest-control", "electrical"],
    conversionGoal: "Trust and scheduling — 'my neighbor recommended you' energy",
    avoidFor: ["legal", "finance", "enterprise"],
  },
  {
    id: "polished-professional",
    name: "Polished Professional",
    description: "Crisp and credible — projects corporate competence without being cold. For B2B and enterprise.",
    voiceId: "uk-male-authoritative",
    voiceName: "George",
    speed: 0.89,
    warmth: 0.48,
    energy: "low",
    formality: 5,
    bestFor: ["enterprise", "agency", "b2b", "saas", "recruiting", "corporate"],
    conversionGoal: "Credibility — caller takes the business seriously",
    avoidFor: ["casual-dining", "pet-services", "kids-activities"],
  },
  {
    id: "bilingual-bridge",
    name: "Bilingual Bridge",
    description: "Warm and adaptable — serves both English and Spanish callers naturally.",
    voiceId: "us-es-female-warm",
    voiceName: "Maria",
    speed: 0.93,
    warmth: 0.65,
    energy: "medium",
    formality: 3,
    bestFor: ["mixed-language-markets", "texas", "california", "florida", "healthcare", "services"],
    conversionGoal: "Accessibility — no caller feels excluded by language barriers",
    avoidFor: [],
  },
];

/**
 * Get the recommended voice presets for a given industry.
 * Returns top 3 matches, sorted by relevance.
 */
export function getRecommendedPresets(industry: string): VoicePreset[] {
  const normalized = industry.toLowerCase().replace(/[^a-z0-9]/g, "-");

  // Score each preset: +2 for bestFor match, -10 for avoidFor match
  const scored = VOICE_PRESETS.map((preset) => {
    let score = 0;
    if (preset.bestFor.some((b) => normalized.includes(b) || b.includes(normalized))) {
      score += 2;
    }
    if (preset.avoidFor.some((a) => normalized.includes(a) || a.includes(normalized))) {
      score -= 10;
    }
    // "any-industry" presets get a small boost
    if (preset.bestFor.includes("any-industry")) {
      score += 0.5;
    }
    return { preset, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.preset);
}

/**
 * Check if a preset is mismatched for a given industry.
 * Returns the warning message if mismatched, null otherwise.
 */
export function checkPresetMismatch(presetId: string, industry: string): string | null {
  const preset = VOICE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;

  const normalized = industry.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const isAvoided = preset.avoidFor.some(
    (a) => normalized.includes(a) || a.includes(normalized),
  );

  return isAvoided ? (preset.mismatchWarning ?? "This voice preset may not be the best fit for your industry.") : null;
}
