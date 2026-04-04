/**
 * Conversation Guardrails — Prevents AI agents from going off-script.
 *
 * Enforces boundaries on what the AI voice agent can say or promise.
 * Runs BEFORE each response is sent to the caller.
 *
 * Categories of protection:
 * 1. Topic boundaries — block responses about topics outside scope
 * 2. Promise limits — prevent unauthorized commitments (discounts, refunds, etc.)
 * 3. Compliance — block PII disclosure, legal claims, medical/financial advice
 * 4. Tone enforcement — detect and correct hostile, sarcastic, or inappropriate tone
 * 5. Escalation triggers — force handoff to human when guardrails are hit repeatedly
 */

export interface GuardrailConfig {
  /** Topics the agent IS allowed to discuss */
  allowedTopics: string[];
  /** Topics explicitly banned */
  bannedTopics: string[];
  /** Maximum discount the agent can offer (percentage, 0 = none) */
  maxDiscountPercent: number;
  /** Whether agent can promise refunds */
  canPromiseRefund: boolean;
  /** Whether agent can schedule appointments */
  canBookAppointments: boolean;
  /** Whether agent can quote prices */
  canQuotePrices: boolean;
  /** Maximum price agent can quote without escalation */
  maxQuotablePrice?: number;
  /** Force escalation after N guardrail violations in one call */
  escalationThreshold: number;
  /** Custom blocked phrases (exact or pattern match) */
  blockedPhrases: string[];
  /** Industry-specific compliance rules */
  complianceMode?: "healthcare" | "financial" | "legal" | "general";
}

export interface GuardrailCheckResult {
  allowed: boolean;
  /** Which guardrail was triggered */
  violation?: string;
  /** Category of the violation */
  category?: "topic" | "promise" | "compliance" | "tone" | "phrase";
  /** Suggested replacement text */
  suggestion?: string;
  /** Whether to escalate to a human */
  shouldEscalate: boolean;
  /** Running violation count for this call */
  violationCount: number;
}

// Default guardrail config for new workspaces
export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  allowedTopics: [
    "scheduling", "appointments", "pricing", "services", "availability",
    "hours", "location", "contact", "follow-up", "callback",
  ],
  bannedTopics: [
    "politics", "religion", "competitors", "lawsuits", "internal-operations",
    "employee-info", "salary", "personal-opinions",
  ],
  maxDiscountPercent: 0,
  canPromiseRefund: false,
  canBookAppointments: true,
  canQuotePrices: true,
  maxQuotablePrice: undefined,
  escalationThreshold: 3,
  blockedPhrases: [],
  complianceMode: "general",
};

// Compliance patterns by industry
const COMPLIANCE_PATTERNS: Record<string, RegExp[]> = {
  healthcare: [
    /\b(diagnos|prescri|treat|cur|medicat)\w*/i,
    /\b(hipaa|medical\s+record|patient\s+data)\b/i,
    /\b(you\s+(have|need|should\s+take)\s+\w+\s*(medication|medicine|drug))/i,
  ],
  financial: [
    /\b(guaranteed\s+return|risk[- ]free\s+investment|insider)\b/i,
    /\b(your\s+credit\s+score|social\s+security\s+number|ssn|bank\s+account)\b/i,
    /\b(financial\s+advice|investment\s+advice|tax\s+advice)\b/i,
  ],
  legal: [
    /\b(legal\s+advice|i('m|\s+am)\s+not\s+a\s+lawyer|attorney[- ]client)\b/i,
    /\b(you\s+should\s+sue|file\s+a\s+lawsuit|settle\s+for)\b/i,
  ],
  general: [],
};

// Toxic/inappropriate tone patterns
const TONE_VIOLATIONS: RegExp[] = [
  /\b(shut\s+up|stupid|idiot|dumb|loser)\b/i,
  /\b(i\s+don'?t\s+care|that'?s\s+not\s+my\s+problem|whatever)\b/i,
  /\b(you'?re\s+wrong|you\s+don'?t\s+know|you\s+people)\b/i,
];

// Promise/commitment patterns
const PROMISE_PATTERNS = {
  discount: /\b(\d+)\s*%?\s*(off|discount|reduce|lower|cut)\b/i,
  refund: /\b(refund|money\s+back|reimburse|credit\s+back)\b/i,
  guarantee: /\b(guarantee|promise|100\s*%|absolutely|definitely\s+will)\b/i,
  price: /\$\s*(\d+[\d,.]*)/,
};

/** Track violations per call session */
const sessionViolations = new Map<string, number>();

/**
 * Check a proposed agent response against guardrails.
 * Call this BEFORE sending the response to the caller.
 */
export function checkResponse(
  callSessionId: string,
  proposedResponse: string,
  config: GuardrailConfig = DEFAULT_GUARDRAILS
): GuardrailCheckResult {
  const violations = sessionViolations.get(callSessionId) ?? 0;
  const text = proposedResponse.toLowerCase();

  // 1. Check banned topics
  for (const topic of config.bannedTopics) {
    if (text.includes(topic.toLowerCase().replace(/-/g, " ")) || text.includes(topic.toLowerCase())) {
      const newCount = violations + 1;
      sessionViolations.set(callSessionId, newCount);
      return {
        allowed: false,
        violation: `Banned topic detected: ${topic}`,
        category: "topic",
        suggestion: "I appreciate your question, but that's outside the scope of what I can help with. Let me focus on how I can assist you today.",
        shouldEscalate: newCount >= config.escalationThreshold,
        violationCount: newCount,
      };
    }
  }

  // 2. Check blocked phrases
  for (const phrase of config.blockedPhrases) {
    if (text.includes(phrase.toLowerCase())) {
      const newCount = violations + 1;
      sessionViolations.set(callSessionId, newCount);
      return {
        allowed: false,
        violation: `Blocked phrase: ${phrase}`,
        category: "phrase",
        suggestion: undefined,
        shouldEscalate: newCount >= config.escalationThreshold,
        violationCount: newCount,
      };
    }
  }

  // 3. Check compliance patterns
  const compliancePatterns = COMPLIANCE_PATTERNS[config.complianceMode ?? "general"] ?? [];
  for (const pattern of compliancePatterns) {
    if (pattern.test(proposedResponse)) {
      const newCount = violations + 1;
      sessionViolations.set(callSessionId, newCount);
      return {
        allowed: false,
        violation: `Compliance violation (${config.complianceMode}): pattern matched`,
        category: "compliance",
        suggestion: "I'm not able to provide advice on that topic. I'd recommend speaking with a qualified professional. How else can I help you?",
        shouldEscalate: newCount >= config.escalationThreshold,
        violationCount: newCount,
      };
    }
  }

  // 4. Check tone violations
  for (const pattern of TONE_VIOLATIONS) {
    if (pattern.test(proposedResponse)) {
      const newCount = violations + 1;
      sessionViolations.set(callSessionId, newCount);
      return {
        allowed: false,
        violation: "Inappropriate tone detected",
        category: "tone",
        suggestion: undefined, // Let the caller regenerate with a different tone
        shouldEscalate: newCount >= config.escalationThreshold,
        violationCount: newCount,
      };
    }
  }

  // 5. Check unauthorized promises
  // Discount check
  const discountMatch = PROMISE_PATTERNS.discount.exec(proposedResponse);
  if (discountMatch) {
    const discountPct = parseInt(discountMatch[1], 10);
    if (discountPct > config.maxDiscountPercent) {
      const newCount = violations + 1;
      sessionViolations.set(callSessionId, newCount);
      return {
        allowed: false,
        violation: `Unauthorized discount: ${discountPct}% exceeds max ${config.maxDiscountPercent}%`,
        category: "promise",
        suggestion: config.maxDiscountPercent > 0
          ? `I can offer up to ${config.maxDiscountPercent}% off. Would that work for you?`
          : "I'm not authorized to offer discounts, but I can connect you with someone who may be able to help with pricing.",
        shouldEscalate: newCount >= config.escalationThreshold,
        violationCount: newCount,
      };
    }
  }

  // Refund check
  if (!config.canPromiseRefund && PROMISE_PATTERNS.refund.test(proposedResponse)) {
    const newCount = violations + 1;
    sessionViolations.set(callSessionId, newCount);
    return {
      allowed: false,
      violation: "Unauthorized refund promise",
      category: "promise",
      suggestion: "I understand your concern about the charge. Let me have our billing team reach out to you to discuss your options.",
      shouldEscalate: newCount >= config.escalationThreshold,
      violationCount: newCount,
    };
  }

  // Price quoting check
  if (config.maxQuotablePrice !== undefined) {
    const priceMatch = PROMISE_PATTERNS.price.exec(proposedResponse);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (price > config.maxQuotablePrice) {
        const newCount = violations + 1;
        sessionViolations.set(callSessionId, newCount);
        return {
          allowed: false,
          violation: `Price $${price} exceeds max quotable $${config.maxQuotablePrice}`,
          category: "promise",
          suggestion: "For pricing on that service, I'd like to connect you with our team who can provide a custom quote.",
          shouldEscalate: newCount >= config.escalationThreshold,
          violationCount: newCount,
        };
      }
    }
  }

  return {
    allowed: true,
    shouldEscalate: false,
    violationCount: violations,
  };
}

/**
 * Reset violation count when a call ends.
 */
export function clearSessionGuardrails(callSessionId: string): void {
  sessionViolations.delete(callSessionId);
}

/**
 * Get current violation count for a session.
 */
export function getViolationCount(callSessionId: string): number {
  return sessionViolations.get(callSessionId) ?? 0;
}

/**
 * Load guardrail config for a workspace from the database.
 * Falls back to defaults if no custom config exists.
 */
export async function loadWorkspaceGuardrails(
  workspaceId: string
): Promise<GuardrailConfig> {
  try {
    const { getDb } = await import("@/lib/db/queries");
    const db = getDb();
    const { data } = await db
      .from("workspace_settings")
      .select("value")
      .eq("workspace_id", workspaceId)
      .eq("key", "conversation_guardrails")
      .maybeSingle();

    if (data && (data as { value?: unknown }).value) {
      const stored = (data as { value: Partial<GuardrailConfig> }).value;
      return { ...DEFAULT_GUARDRAILS, ...stored };
    }
  } catch {
    // Settings table may not exist — use defaults
  }

  return DEFAULT_GUARDRAILS;
}
