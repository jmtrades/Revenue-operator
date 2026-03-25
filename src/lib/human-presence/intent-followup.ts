/**
 * Intent-Aware Followup Generator — followups depend on why conversation paused.
 * Uncertain → reassurance. Busy → short check-in. Comparing → soft reopen. Ghosted → casual re-entry.
 * Generate from behavioural category, not fixed template.
 */

import type { ConversationState } from "@/lib/conversation-state/resolver";

export type FollowupCategory = "uncertain" | "busy" | "comparing" | "ghosted" | "default";

const FOLLOWUP_POOL: Record<FollowupCategory, string[]> = {
  uncertain: [
    "No rush — just checking in.",
    "Worth a quick look when you have a sec.",
    "Whenever you're ready we can nail it down.",
  ],
  busy: [
    "Still on your radar?",
    "Quick ping — still relevant?",
    "No pressure, just checking.",
  ],
  comparing: [
    "Had a chance to compare?",
    "Still weighing options?",
    "Anything that would help decide?",
  ],
  ghosted: [
    "Still wanted help with this or sorted now?",
    "You'd asked about this before — still relevant?",
    "Quick one — still there?",
  ],
  default: [
    "Still wanted help with this or sorted now?",
    "Quick check — still relevant?",
  ],
};

/**
 * Map conversation state + optional signal to followup category.
 */
export function getFollowupCategory(
  state: ConversationState,
  signal?: { lastMessageShort?: boolean; daysSinceReply?: number }
): FollowupCategory {
  if (state === "DRIFT" || state === "COLD") {
    const days = signal?.daysSinceReply ?? 0;
    if (days > 7) return "ghosted";
    if (signal?.lastMessageShort && days > 2) return "busy";
    return "comparing";
  }
  if (state === "CONSIDERING" || state === "SOFT_OBJECTION") return "uncertain";
  return "default";
}

/**
 * Pick one followup from the category (randomized so not identical across leads).
 */
export function getIntentAwareFollowup(category: FollowupCategory): string {
  const pool = FOLLOWUP_POOL[category] ?? FOLLOWUP_POOL.default;
  return pool[Math.floor(Math.random() * pool.length)] ?? FOLLOWUP_POOL.default[0]!;
}
