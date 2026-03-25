/**
 * Environmental presence: proof reference for email footer, confirmation messages, public work link.
 * No popups or banners. Factual, natural presence.
 */

import { getDb } from "@/lib/db/queries";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";

/** Deterministic clause text; must match message-compiler renderer. */
export const RECORD_EXPECTATION_TEXT = "Outcome will appear in the record.";

/**
 * True if any prior outbound message in this conversation contained the proof reference (public work link).
 */
export async function conversationHadProofReference(workspaceId: string, conversationId: string): Promise<boolean> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("external_ref")
    .eq("workspace_id", workspaceId)
    .not("external_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const externalRef = (row as { external_ref?: string } | null)?.external_ref;
  if (!externalRef) return false;
  const needle = "/public/work/" + encodeURIComponent(externalRef);
  const { data: messages } = await db
    .from("outbound_messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .not("content", "is", null);
  const contents = (messages ?? []) as { content: string | null }[];
  return contents.some((m) => (m.content ?? "").includes(needle) || (m.content ?? "").includes("/public/work/"));
}

/**
 * True if any prior outbound in this conversation already contained the record expectation clause.
 */
export async function conversationAlreadyHadRecordExpectation(conversationId: string): Promise<boolean> {
  const db = getDb();
  const { data: messages } = await db
    .from("outbound_messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .not("content", "is", null);
  const contents = (messages ?? []) as { content: string | null }[];
  return contents.some((m) => (m.content ?? "").includes(RECORD_EXPECTATION_TEXT));
}

/**
 * Returns snippets to attach to outgoing messages. Use in email footer, confirmation body, etc.
 * publicWorkLink is null if workspace has no shared record with external_ref.
 */
export async function attachProofReferenceToOutgoingMessages(workspaceId: string): Promise<{
  emailFooter: string;
  confirmationSnippet: string;
  publicWorkLink: string | null;
}> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("external_ref")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const externalRef = (row as { external_ref?: string } | null)?.external_ref ?? null;
  const base = APP_URL.replace(/\/$/, "");
  const publicWorkLink =
    externalRef && base ? `${base}/public/work/${encodeURIComponent(externalRef)}` : null;

  const linkLine = publicWorkLink
    ? `Record: ${publicWorkLink}`
    : "Record available on request.";

  return {
    emailFooter: linkLine,
    confirmationSnippet: linkLine,
    publicWorkLink,
  };
}
