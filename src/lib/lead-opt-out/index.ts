/**
 * Lead opt-out: STOP/UNSUBSCRIBE. Unified check across all three opt-out sources:
 * 1. lead_opt_out table (generic opt-out registry)
 * 2. leads.opt_out column (set by Telnyx webhook)
 * 3. leads.metadata.sms_consent (set by Twilio webhook)
 */

import { getDb } from "@/lib/db/queries";

/**
 * Comprehensive opt-out check. Returns true if the lead has opted out via ANY method.
 * counterpartyIdentifier format: "lead:<lead_id>" or raw phone number.
 */
export async function isOptedOut(workspaceId: string, counterpartyIdentifier: string): Promise<boolean> {
  const db = getDb();

  // 1. Check lead_opt_out table (generic opt-out registry)
  const { data: optOutRow } = await db
    .from("lead_opt_out")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .maybeSingle();
  if (optOutRow) return true;

  // 2. If identifier is "lead:<id>", also check the leads table directly
  const leadIdMatch = counterpartyIdentifier.match(/^lead:(.+)$/);
  if (leadIdMatch) {
    const leadId = leadIdMatch[1];
    const { data: lead } = await db
      .from("leads")
      .select("opt_out, metadata")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (lead) {
      const leadRow = lead as { opt_out?: boolean; metadata?: Record<string, unknown> | null };
      // Check Telnyx column
      if (leadRow.opt_out === true) return true;
      // Check Twilio metadata
      if (leadRow.metadata?.sms_consent === false) return true;
    }
  }

  return false;
}

/**
 * Record an opt-out in the lead_opt_out table AND update the leads table for consistency.
 * Should be called from BOTH Twilio and Telnyx webhooks.
 */
export async function recordOptOut(workspaceId: string, counterpartyIdentifier: string, leadId?: string): Promise<void> {
  const db = getDb();

  // Always upsert into the canonical lead_opt_out table
  await db.from("lead_opt_out").upsert(
    {
      workspace_id: workspaceId,
      counterparty_identifier: counterpartyIdentifier,
      created_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,counterparty_identifier", ignoreDuplicates: true }
  );

  // If we know the lead ID, also update the leads table for backward compatibility
  if (leadId) {
    await db
      .from("leads")
      .update({ opt_out: true, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("workspace_id", workspaceId);
  }
}

/**
 * Remove opt-out (re-subscribe). Called when lead sends START/SUBSCRIBE.
 */
export async function removeOptOut(workspaceId: string, counterpartyIdentifier: string, leadId?: string): Promise<void> {
  const db = getDb();

  await db
    .from("lead_opt_out")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier);

  if (leadId) {
    await db
      .from("leads")
      .update({ opt_out: false, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("workspace_id", workspaceId);
  }
}

/** True if message body indicates opt-out (STOP, UNSUBSCRIBE, etc.). */
export function messageIndicatesOptOut(body: string): boolean {
  const normalized = (body ?? "").trim().toUpperCase();
  if (/^\s*STOP\s*$/.test(normalized)) return true;
  if (/^\s*UNSUBSCRIBE\s*$/.test(normalized)) return true;
  if (/\bSTOP\b/.test(normalized) && normalized.length < 20) return true;
  if (/\bUNSUBSCRIBE\b/.test(normalized) && normalized.length < 25) return true;
  return false;
}
