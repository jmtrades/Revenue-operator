/**
 * Thread participants: multi-party identity without accounts.
 * Role + optional hint only. No PII. No internal ids returned publicly.
 */

import { getDb } from "@/lib/db/queries";

const MAX_HINT_LEN = 60;

/** Denylist: fragments that suggest PII. Doctrine-safe. */
const PII_PATTERNS = [
  /@/,
  /\bhttps?:\/\//i,
  /\b\+?\d{10,}/,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
];

function containsPII(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return PII_PATTERNS.some((p) => p.test(t));
}

/** Sanitize participant hint: one sentence fragment, ≤60 chars, no PII. */
export function sanitizeParticipantHint(hint: string | null | undefined): string | null {
  if (hint == null || typeof hint !== "string") return null;
  const t = hint.replace(/\s+/g, " ").trim();
  if (!t || containsPII(t)) return null;
  const capped = t.slice(0, MAX_HINT_LEN).trim();
  return capped.length > 0 ? capped : null;
}

export type ActorRole = "originator" | "counterparty" | "downstream" | "observer";

export async function upsertParticipant(
  threadId: string,
  role: ActorRole,
  hint?: string | null
): Promise<void> {
  const db = getDb();
  const sanitized = sanitizeParticipantHint(hint);
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("thread_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("actor_role", role)
    .maybeSingle();
  if (existing) {
    await db
      .from("thread_participants")
      .update({
        last_seen_at: now,
        ...(sanitized != null && { participant_hint: sanitized }),
      })
      .eq("thread_id", threadId)
      .eq("actor_role", role);
  } else {
    await db.from("thread_participants").insert({
      thread_id: threadId,
      actor_role: role,
      participant_hint: sanitized,
      first_seen_at: now,
      last_seen_at: now,
    });
  }
}

/** Returns role + hint only. No ids. Cap 4. */
export async function listParticipantsForThread(
  threadId: string
): Promise<{ role: string; hint?: string | null }[]> {
  const db = getDb();
  const { data } = await db
    .from("thread_participants")
    .select("actor_role, participant_hint")
    .eq("thread_id", threadId)
    .order("first_seen_at", { ascending: true })
    .limit(4);
  return (data ?? []).map((r: { actor_role: string; participant_hint: string | null }) => ({
    role: r.actor_role,
    hint: r.participant_hint ?? undefined,
  }));
}
