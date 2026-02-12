/**
 * Universal behavior contract: human-acceptable messaging.
 * Optimizes for comfort and reliability over persuasion.
 * Runs AFTER generation but BEFORE execution.
 */

import { filterAwkwardness } from "./awkwardness-filter";
import { checkOwnershipBoundary } from "./ownership-boundary";
import { applyBlameShield } from "./blame-shield";
import { enforceSimplicity } from "./simplicity-enforcer";

export interface SafetyContext {
  leadId?: string;
  workspaceId?: string;
  action?: string;
  confidence?: number;
  lastUserMessage?: string;
  leadUsedEmoji?: boolean;
  lowPressureMode?: boolean;
  channel?: string;
}

export interface SafetyResult {
  safeMessage: string;
  wasModified: boolean;
  reason?: string;
}

const UNCERTAINTY_FALLBACK = "Happy to leave this here — just let me know if you'd like to continue.";
const DISINTEREST_FALLBACK = "Just following up — no rush at all. Let me know if you'd like me to keep this open.";

/**
 * Enforce human acceptability. Runs all safety layers.
 * Safety runs LAST before send and can override everything.
 */
export function enforceHumanAcceptability(
  message: string,
  context: SafetyContext
): SafetyResult {
  if (!message || typeof message !== "string") {
    return {
      safeMessage: UNCERTAINTY_FALLBACK,
      wasModified: true,
      reason: "empty_message",
    };
  }

  const confidence = context.confidence ?? 1;
  const lowPressureMode = context.lowPressureMode ?? false;

  // Uncertainty: reduce activity
  if (confidence < 0.6) {
    return {
      safeMessage: UNCERTAINTY_FALLBACK,
      wasModified: true,
      reason: "low_confidence",
    };
  }

  // Low pressure mode: passive only
  if (lowPressureMode && !isPassiveCheckIn(message, context.action)) {
    return {
      safeMessage: DISINTEREST_FALLBACK,
      wasModified: true,
      reason: "low_pressure_mode",
    };
  }

  let current = message.trim();
  const reasons: string[] = [];

  // 1. Awkwardness filter
  const awkward = filterAwkwardness(current, context);
  if (awkward.modified) {
    current = awkward.message;
    if (awkward.reason) reasons.push(awkward.reason);
  }

  // 2. Ownership boundary
  const boundary = checkOwnershipBoundary(current, context);
  if (!boundary.allowed) {
    return {
      safeMessage: DISINTEREST_FALLBACK,
      wasModified: true,
      reason: boundary.reason ?? "ownership_boundary",
    };
  }
  if (boundary.neutralized) {
    current = boundary.message ?? current;
  }

  // 3. Blame shield
  const shielded = applyBlameShield(current, context);
  if (shielded.modified) {
    current = shielded.message;
    if (shielded.reason) reasons.push(shielded.reason);
  }

  // 4. Simplicity enforcer
  const simple = enforceSimplicity(current);
  if (simple.modified) {
    current = simple.message;
    if (simple.reason) reasons.push(simple.reason);
  }

  const wasModified = current !== message.trim();
  return {
    safeMessage: current,
    wasModified,
    reason: reasons.length > 0 ? reasons.join("; ") : undefined,
  };
}

function isPassiveCheckIn(message: string, action?: string): boolean {
  const passiveActions = ["clarifying_question", "follow_up"];
  if (action && passiveActions.includes(action)) {
    const lower = message.toLowerCase();
    return (
      lower.includes("no rush") ||
      lower.includes("let me know") ||
      lower.includes("keeping this open") ||
      lower.includes("when you're ready")
    );
  }
  return false;
}
