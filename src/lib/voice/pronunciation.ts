/**
 * Pronunciation Dictionary System
 *
 * Per-workspace custom pronunciation rules that preprocess TTS input before
 * sending to Deepgram Aura. Handles business names, staff names, medical terms,
 * street addresses, and any word the default TTS mispronounces.
 *
 * Two approaches supported:
 * 1. Respelling: "Nguyen" → "Win" (simple, TTS reads the respelling)
 * 2. SSML phoneme: "Nguyen" → <phoneme alphabet="ipa" ph="wɪn">Nguyen</phoneme>
 *
 * The preprocessor runs before every TTS call, replacing known words with
 * their pronunciation-corrected equivalents.
 */

export interface PronunciationEntry {
  /** The word or phrase as written */
  word: string;
  /** How it should be pronounced (respelling for TTS) */
  respelling: string;
  /** Optional IPA phonetic transcription */
  ipa?: string;
  /** Category for organization */
  category: "business_name" | "staff_name" | "medical" | "address" | "service" | "custom";
  /** Whether to match case-insensitively */
  caseInsensitive: boolean;
}

export interface PronunciationDictionary {
  workspaceId: string;
  entries: PronunciationEntry[];
  updatedAt: string;
}

/**
 * Preprocess TTS text by replacing words with their pronunciation-corrected equivalents.
 * Runs before every TTS call.
 */
/**
 * Escape text for safe inclusion in SSML attributes/content.
 */
function escapeSSML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function applyPronunciationRules(
  text: string,
  dictionary: PronunciationEntry[],
): string {
  if (!dictionary || dictionary.length === 0) return text;
  if (!text || typeof text !== "string") return text ?? "";

  let processed = text;

  // Sort by word length (longest first) to prevent partial replacements
  const sorted = [...dictionary]
    .filter((e) => e.word && typeof e.word === "string" && e.word.trim())
    .sort((a, b) => b.word.length - a.word.length);

  for (const entry of sorted) {
    const flags = entry.caseInsensitive ? "gi" : "g";
    // Use word boundaries to prevent partial replacements
    const escaped = entry.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, flags);

    if (entry.ipa) {
      // Use SSML phoneme tag if IPA is available (requires SSML-capable TTS)
      // Escape user-supplied IPA and word to prevent SSML injection
      const safeIpa = escapeSSML(entry.ipa);
      const safeWord = escapeSSML(entry.word);
      processed = processed.replace(
        pattern,
        `<phoneme alphabet="ipa" ph="${safeIpa}">${safeWord}</phoneme>`,
      );
    } else {
      // Simple respelling replacement
      processed = processed.replace(pattern, entry.respelling ?? entry.word);
    }
  }

  return processed;
}

/**
 * Extract terms from workspace context that should be added to the
 * pronunciation dictionary. Auto-suggests entries for business name,
 * staff names, and addresses.
 */
export function suggestPronunciationEntries(context: {
  businessName?: string;
  staffNames?: string[];
  address?: string;
  services?: string[];
}): PronunciationEntry[] {
  const suggestions: PronunciationEntry[] = [];

  // Business name (if it contains unusual words)
  if (context.businessName) {
    suggestions.push({
      word: context.businessName,
      respelling: context.businessName, // User should verify
      category: "business_name",
      caseInsensitive: true,
    });
  }

  // Staff names
  if (context.staffNames) {
    for (const name of context.staffNames) {
      if (name.trim()) {
        suggestions.push({
          word: name.trim(),
          respelling: name.trim(), // User should verify
          category: "staff_name",
          caseInsensitive: false,
        });
      }
    }
  }

  // Address components (street names are often mispronounced)
  if (context.address) {
    suggestions.push({
      word: context.address,
      respelling: context.address,
      category: "address",
      caseInsensitive: true,
    });
  }

  return suggestions;
}

/**
 * Common pronunciation corrections for business contexts.
 * These are applied globally as a baseline.
 */
export const COMMON_PRONUNCIATION_FIXES: PronunciationEntry[] = [
  // Common name corrections
  { word: "LLC", respelling: "L L C", category: "custom", caseInsensitive: false },
  { word: "Inc", respelling: "Incorporated", category: "custom", caseInsensitive: false },
  { word: "DDS", respelling: "D D S", category: "medical", caseInsensitive: false },
  { word: "DMD", respelling: "D M D", category: "medical", caseInsensitive: false },
  { word: "HVAC", respelling: "H-vack", category: "service", caseInsensitive: false },
  { word: "ASAP", respelling: "A-sap", category: "custom", caseInsensitive: false },
  { word: "ETA", respelling: "E T A", category: "custom", caseInsensitive: false },
  { word: "appt", respelling: "appointment", category: "custom", caseInsensitive: true },
  { word: "apt", respelling: "apartment", category: "address", caseInsensitive: true },
  { word: "Ste", respelling: "Suite", category: "address", caseInsensitive: false },
  { word: "Blvd", respelling: "Boulevard", category: "address", caseInsensitive: false },
  { word: "Ave", respelling: "Avenue", category: "address", caseInsensitive: false },
  { word: "Pkwy", respelling: "Parkway", category: "address", caseInsensitive: false },
  { word: "Dr.", respelling: "Doctor", category: "custom", caseInsensitive: false },
  { word: "vs", respelling: "versus", category: "custom", caseInsensitive: true },
  { word: "w/", respelling: "with", category: "custom", caseInsensitive: true },
];
