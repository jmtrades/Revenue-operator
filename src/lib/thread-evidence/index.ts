/**
 * Thread evidence: proof artifacts without accounts. No payload returned publicly.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

const MAX_TEXT_LEN = 140;
const MAX_POINTER_LEN = 120;

const PII_PATTERNS = [/@/, /\bhttps?:\/\//i];
function sanitizeText(s: string | null | undefined): string | null {
  if (s == null || typeof s !== "string") return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (PII_PATTERNS.some((p) => p.test(t))) return null;
  return t.slice(0, MAX_TEXT_LEN).trim() || null;
}

function sanitizePointer(s: string | null | undefined): string | null {
  if (s == null || typeof s !== "string") return null;
  const t = s.trim();
  return t.length > 0 && t.length <= MAX_POINTER_LEN ? t : null;
}

export type EvidenceType = "note" | "file_ref" | "external_ref";
export type ActorRole = "originator" | "counterparty" | "downstream" | "observer";

export async function recordEvidence(
  threadId: string,
  actorRole: ActorRole,
  evidenceType: EvidenceType,
  options?: { evidenceText?: string | null; evidencePointer?: string | null }
): Promise<void> {
  const db = getDb();
  const text = sanitizeText(options?.evidenceText);
  const pointer = sanitizePointer(options?.evidencePointer);
  await db.from("thread_evidence").insert({
    thread_id: threadId,
    actor_role: actorRole,
    evidence_type: evidenceType,
    evidence_text: text,
    evidence_pointer: pointer,
  });
  
  const { threadIsReliedUpon, recordThreadAmendment } = await import("@/lib/institutional-auditability");
  if (await threadIsReliedUpon(threadId)) {
    await recordThreadAmendment(threadId, "evidence_change", "Outcome evidence was added after reliance.", null).catch((e) => {
      log("error", "recordThreadAmendment failed", { error: e instanceof Error ? e.message : String(e) });
    });
  }
}

/** True if thread has at least one evidence row. */
export async function threadHasEvidence(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("thread_evidence")
    .select("id")
    .eq("thread_id", threadId)
    .limit(1)
    .maybeSingle();
  return !!data;
}
