/**
 * Call-to-lead matching: deterministic mapping without manual work
 */

import { getDb } from "@/lib/db/queries";

export interface MatchResult {
  lead_id: string | null;
  confidence: number;
  method: "calendar" | "email" | "phone" | "name_fuzzy" | "unmatched";
}

function normalizeEmail(e: string | null | undefined): string {
  if (!e) return "";
  return e.toLowerCase().trim();
}

function fuzzyNameScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const sa = a.toLowerCase().replace(/\s+/g, " ").trim();
  const sb = b.toLowerCase().replace(/\s+/g, " ").trim();
  if (sa === sb) return 1;
  const wordsA = sa.split(" ");
  const wordsB = sb.split(" ");
  const matches = wordsA.filter((w) => wordsB.some((bw) => bw.includes(w) || w.includes(bw))).length;
  return matches / Math.max(wordsA.length, wordsB.length, 1);
}

export async function matchCallToLead(
  workspaceId: string,
  context: {
    participantEmails?: string[];
    participantPhones?: string[];
    inviteeEmail?: string;
    participantNames?: string[];
    calendarLeadId?: string;
  }
): Promise<MatchResult> {
  const db = getDb();

  if (context.calendarLeadId) {
    const { data: lead } = await db
      .from("leads")
      .select("id")
      .eq("id", context.calendarLeadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (lead) return { lead_id: (lead as { id: string }).id, confidence: 1, method: "calendar" };
  }

  const emails = [
    ...(context.participantEmails ?? []),
    ...(context.inviteeEmail ? [context.inviteeEmail] : []),
  ].map(normalizeEmail).filter(Boolean);

  for (const email of emails) {
    const { data: lead } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (lead) return { lead_id: (lead as { id: string }).id, confidence: 0.95, method: "email" };
  }

  for (const phone of context.participantPhones ?? []) {
    const normalized = phone.replace(/\D/g, "").slice(-10);
    if (normalized.length < 7) continue;
    const { data: leads } = await db
      .from("leads")
      .select("id, phone")
      .eq("workspace_id", workspaceId)
      .not("phone", "is", null);
    const found = (leads ?? []).find((l) => {
      const lp = (l as { phone?: string }).phone ?? "";
      return lp.replace(/\D/g, "").slice(-10) === normalized;
    });
    if (found) return { lead_id: (found as { id: string }).id, confidence: 0.9, method: "phone" };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  for (const name of context.participantNames ?? []) {
    const { data: leads } = await db
      .from("leads")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .gte("last_activity_at", sevenDaysAgo.toISOString());

    let best: { id: string; score: number } | null = null;
    for (const l of leads ?? []) {
      const ln = (l as { name?: string }).name ?? "";
      const score = fuzzyNameScore(name, ln);
      if (score >= 0.8 && (!best || score > best.score)) best = { id: (l as { id: string }).id, score };
    }
    if (best) return { lead_id: best.id, confidence: best.score, method: "name_fuzzy" };
  }

  return { lead_id: null, confidence: 0, method: "unmatched" };
}
