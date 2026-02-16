/**
 * Deterministic renderer: MessagePlan + context -> final string. No raw LLM output.
 */

import type { MessagePlan, BusinessContextForCompiler } from "./types";
import { getFragment, applyEntitiesToFragment } from "./fragments";

const MAX_SMS = 320;
const MAX_EMAIL_BODY = 500;
const FORBIDDEN_PHRASES = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant|tool|platform)\b/gi;

function applyForbiddenFilter(text: string, forbidden_terms?: string[]): string {
  let out = text.replace(FORBIDDEN_PHRASES, "").replace(/\s+/g, " ").trim();
  if (forbidden_terms?.length) {
    for (const t of forbidden_terms) {
      out = out.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
    }
    out = out.replace(/\s+/g, " ").trim();
  }
  return out;
}

function applyMaxChars(text: string, channel: "sms" | "email" | "web", max_chars?: number): string {
  const cap = max_chars ?? (channel === "sms" ? MAX_SMS : MAX_EMAIL_BODY);
  return text.length <= cap ? text : text.slice(0, cap).trim();
}

/** Opt-out compliance suffix when required (e.g. marketing). Omitted for transactional. */
export function optOutSuffixIfRequired(required: boolean): string {
  return required ? " Reply STOP to opt out." : "";
}

const RECORD_EXPECTATION_CLAUSE = "Outcome will appear in the record.";

export function renderMessage(
  plan: MessagePlan,
  businessContext: BusinessContextForCompiler,
  channel: "sms" | "email" | "web",
  options?: { requireOptOut?: boolean }
): string {
  const fragment = getFragment(plan.intent, plan.stance, plan.tone);
  const withEntities = applyEntitiesToFragment(fragment, plan.entities as Record<string, string | undefined>);
  const filtered = applyForbiddenFilter(withEntities, plan.constraints.forbidden_terms);
  let capped = applyMaxChars(filtered, plan.constraints.channel ?? channel, plan.constraints.max_chars);
  const hasRecordExpectation = Array.isArray(plan.clauses) && plan.clauses.some((c) => c.type === "record_expectation");
  if (hasRecordExpectation) {
    const withClause = (capped + "\n" + RECORD_EXPECTATION_CLAUSE).trim();
    const maxChars = plan.constraints.max_chars ?? (channel === "sms" ? MAX_SMS : MAX_EMAIL_BODY);
    capped = withClause.length <= maxChars ? withClause : capped;
  }
  const suffix = optOutSuffixIfRequired(options?.requireOptOut ?? false);
  const final = (capped + suffix).trim();
  return applyMaxChars(final, channel, channel === "sms" ? MAX_SMS : MAX_EMAIL_BODY);
}
