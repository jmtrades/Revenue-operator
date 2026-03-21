/**
 * STT Custom Vocabulary Boost
 *
 * Per-workspace keyword list passed to Deepgram STT to improve recognition
 * of business-specific terms. This dramatically reduces Word Error Rate (WER)
 * on proper nouns (business names, staff names, service names, addresses).
 *
 * Deepgram's keyword boosting increases the likelihood of recognizing
 * specific words by adjusting the language model's prior probability.
 *
 * Usage: Extract key terms from workspace setup, then pass them as
 * `keywords` parameter in the Deepgram STT request.
 */

export interface STTVocabularyConfig {
  /** Words to boost in recognition (business name, staff, services, etc.) */
  keywords: STTKeyword[];
  /** Workspace ID this vocabulary belongs to */
  workspaceId: string;
}

export interface STTKeyword {
  /** The word or phrase to boost */
  word: string;
  /** Boost intensity: 1-10. Higher = stronger recognition bias.
   *  5 = moderate, 8 = strong, 10 = always recognize even in noise. */
  boost: number;
  /** Category for organization */
  category: "business_name" | "staff" | "service" | "address" | "product" | "custom";
}

/**
 * Build an STT vocabulary boost list from workspace context.
 * This should be called once when an agent is created or updated,
 * and the result cached for use in every call.
 */
export function buildSTTVocabulary(context: {
  businessName: string;
  staffNames?: string[];
  services?: string[];
  address?: string;
  industry?: string;
  customTerms?: string[];
  faqContent?: string;
}): STTKeyword[] {
  const keywords: STTKeyword[] = [];

  // Business name — highest priority
  if (context.businessName) {
    keywords.push({
      word: context.businessName,
      boost: 10,
      category: "business_name",
    });
    // Also boost individual words in multi-word names
    const words = context.businessName.split(/\s+/).filter((w) => w.length > 2);
    for (const w of words) {
      keywords.push({ word: w, boost: 7, category: "business_name" });
    }
  }

  // Staff names
  if (context.staffNames) {
    for (const name of context.staffNames) {
      if (name.trim()) {
        keywords.push({ word: name.trim(), boost: 8, category: "staff" });
        // Boost first and last names individually
        const parts = name.trim().split(/\s+/);
        for (const part of parts) {
          if (part.length > 2) {
            keywords.push({ word: part, boost: 6, category: "staff" });
          }
        }
      }
    }
  }

  // Services
  if (context.services) {
    for (const service of context.services) {
      if (service.trim()) {
        keywords.push({ word: service.trim(), boost: 7, category: "service" });
      }
    }
  }

  // Address components
  if (context.address) {
    // Extract street name and city
    const parts = context.address.split(",").map((p) => p.trim());
    for (const part of parts) {
      if (part.length > 3) {
        keywords.push({ word: part, boost: 5, category: "address" });
      }
    }
  }

  // Industry-specific terms
  if (context.industry) {
    const industryTerms = getIndustryTerms(context.industry);
    for (const term of industryTerms) {
      keywords.push({ word: term, boost: 5, category: "custom" });
    }
  }

  // Custom terms
  if (context.customTerms) {
    for (const term of context.customTerms) {
      if (term.trim()) {
        keywords.push({ word: term.trim(), boost: 6, category: "custom" });
      }
    }
  }

  // Extract terms from FAQ content
  if (context.faqContent) {
    const extracted = extractKeyTerms(context.faqContent);
    for (const term of extracted) {
      keywords.push({ word: term, boost: 4, category: "custom" });
    }
  }

  // Deduplicate by word (keep highest boost)
  const deduped = new Map<string, STTKeyword>();
  for (const kw of keywords) {
    const key = kw.word.toLowerCase();
    const existing = deduped.get(key);
    if (!existing || kw.boost > existing.boost) {
      deduped.set(key, kw);
    }
  }

  return Array.from(deduped.values());
}

/**
 * Format keywords for Deepgram API's keywords parameter.
 * Returns format: ["word:boost", "word:boost", ...]
 */
export function formatForDeepgram(keywords: STTKeyword[]): string[] {
  return keywords.map((kw) => `${kw.word}:${kw.boost}`);
}

/**
 * Get industry-specific terms that callers commonly use.
 */
function getIndustryTerms(industry: string): string[] {
  const normalized = industry.toLowerCase();

  const termMap: Record<string, string[]> = {
    dental: ["cleaning", "filling", "crown", "root canal", "extraction", "implant", "veneer", "whitening", "X-ray", "fluoride", "braces", "Invisalign", "periodontal"],
    medical: ["appointment", "referral", "prescription", "lab work", "physical", "checkup", "urgent care", "telehealth", "copay", "deductible", "prior authorization"],
    legal: ["consultation", "retainer", "deposition", "litigation", "settlement", "mediation", "probate", "power of attorney", "notarize"],
    hvac: ["furnace", "compressor", "thermostat", "ductwork", "refrigerant", "SEER rating", "heat pump", "air handler", "condensate", "BTU"],
    plumbing: ["leak", "drain", "sewer", "water heater", "garbage disposal", "faucet", "pipe", "valve", "backflow", "sump pump"],
    roofing: ["shingles", "flashing", "gutter", "soffit", "fascia", "ridge vent", "underlayment", "ice dam", "dormer", "skylight"],
    salon: ["highlights", "balayage", "keratin", "blowout", "trim", "ombre", "gloss", "toner", "extensions", "deep condition"],
    restaurant: ["reservation", "catering", "takeout", "delivery", "party", "banquet", "prix fixe", "tasting menu", "dietary", "allergen"],
    real_estate: ["listing", "showing", "open house", "closing", "escrow", "appraisal", "inspection", "mortgage", "pre-approval", "MLS"],
    fitness: ["membership", "personal training", "group class", "spin", "yoga", "Pilates", "CrossFit", "assessment", "orientation"],
    auto: ["oil change", "brake", "alignment", "transmission", "diagnostic", "tire rotation", "coolant flush", "timing belt", "suspension"],
    insurance: ["premium", "deductible", "copay", "coverage", "claim", "endorsement", "rider", "underwriting", "policy", "beneficiary"],
  };

  // Match against known industries
  for (const [key, terms] of Object.entries(termMap)) {
    if (normalized.includes(key)) return terms;
  }

  return [];
}

/**
 * Extract likely key terms from FAQ or knowledge base text.
 * Finds capitalized multi-word phrases and proper nouns.
 */
function extractKeyTerms(text: string): string[] {
  const terms: string[] = [];

  // Find capitalized words that aren't sentence starters
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[^a-zA-Z'-]/g, "");
    if (word.length > 3 && /^[A-Z]/.test(word[0])) {
      terms.push(word);
    }
  }

  // Find quoted phrases
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) {
    for (const q of quoted) {
      const clean = q.replace(/"/g, "").trim();
      if (clean.length > 2) terms.push(clean);
    }
  }

  return [...new Set(terms)].slice(0, 50); // Cap at 50 terms
}
