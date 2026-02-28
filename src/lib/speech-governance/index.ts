/**
 * Speech governance: deterministic templates, policies, preview, trace.
 */

export {
  MAX_SMS_CHARS,
  MAX_LINE_CHARS,
  sanitizeForbiddenWords,
  containsForbiddenLanguage,
  trimToMaxChars,
  normalizeWhitespace,
} from "./doctrine";

export { policySchema, templateSlotsSchema, traceOutputSchema } from "./schema";
export type { PolicySchema, TemplateSlots, CheckResult, TraceOutput } from "./schema";

export { getApprovedTemplate, renderTemplate, extractSlotNames } from "./templates";
export type { ApprovedTemplate } from "./templates";

export { getApprovedPolicies, evaluatePolicies } from "./policies";
export type { EvaluateInput, EvaluateResult } from "./policies";

export { compileGovernedMessage } from "./compiler";
export type { CompileGovernedMessageInput, CompileGovernedMessageOutput } from "./compiler";

export { requiresReview } from "./review";
export { recordMessageTrace } from "./trace";
export type { MessageTraceInput } from "./trace";
