/**
 * Participant org hints: soft clustering for multi-organization detection without accounts.
 * Sanitized, no PII, ≤40 chars.
 */

import { getDb } from "@/lib/db/queries";

const DENYLIST = /[@:\/\\<>"']/g;
const MAX_LENGTH = 40;

/**
 * Sanitize org hint: remove denylist chars, trim, cap length.
 */
export function sanitizeOrgHint(hint: string | null | undefined): string | null {
  if (!hint) return null;
  
  const sanitized = hint
    .replace(DENYLIST, "")
    .trim()
    .slice(0, MAX_LENGTH);
  
  return sanitized.length >= 2 ? sanitized : null;
}

/**
 * Store org hint for a thread and actor role.
 */
export async function storeOrgHint(
  threadId: string,
  actorRole: string,
  orgHint: string | null
): Promise<void> {
  if (!orgHint) return;
  
  const db = getDb();
  
  const sanitized = sanitizeOrgHint(orgHint);
  if (!sanitized) return;
  
  if (!["originator", "counterparty", "downstream", "observer"].includes(actorRole)) return;
  
  try {
    await db.from("participant_org_hints").insert({
      thread_id: threadId,
      actor_role: actorRole,
      org_hint: sanitized,
    });
  } catch {
    // Unique violation: already stored; ignore
  }
}

/**
 * True when same org hint appears across multiple threads on different days.
 */
export async function hasMultiThreadOrgHint(workspaceId: string): Promise<boolean> {
  const db = getDb();
  
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId);
  
  if (!threads || threads.length < 2) return false;
  
  const threadIds = (threads as { id: string }[]).map((t) => t.id);
  
  const { data: hints } = await db
    .from("participant_org_hints")
    .select("org_hint, first_seen_at")
    .in("thread_id", threadIds);
  
  if (!hints || hints.length < 2) return false;
  
  const hintDays = new Map<string, Set<string>>();
  
  for (const h of hints) {
    const orgHint = (h as { org_hint: string }).org_hint;
    const date = (h as { first_seen_at: string }).first_seen_at.slice(0, 10);
    
    if (!hintDays.has(orgHint)) {
      hintDays.set(orgHint, new Set());
    }
    hintDays.get(orgHint)!.add(date);
  }
  
  for (const [hint, days] of hintDays.entries()) {
    if (days.size >= 2) {
      const { data: threadsWithHint } = await db
        .from("participant_org_hints")
        .select("thread_id")
        .eq("org_hint", hint)
        .in("thread_id", threadIds);
      
      const uniqueThreads = new Set((threadsWithHint ?? []).map((t: { thread_id: string }) => t.thread_id));
      
      if (uniqueThreads.size >= 2) {
        return true;
      }
    }
  }
  
  return false;
}
