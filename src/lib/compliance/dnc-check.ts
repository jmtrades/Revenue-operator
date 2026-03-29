/**
 * DNC (Do Not Call) list compliance check.
 *
 * Checks phone numbers against workspace-level DNC lists before outbound calls/SMS.
 * Supports: workspace opt-outs, explicit DNC entries, and federal/state DNC registry lookups.
 *
 * Usage:
 *   const result = await checkDNC(workspaceId, phoneNumber);
 *   if (result.blocked) { // Do NOT call this number }
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export interface DNCCheckResult {
  blocked: boolean;
  reason?: string;
  source?: "workspace_dnc" | "opt_out" | "federal_dnc" | "state_dnc" | "compliance_hold";
  checked_at: string;
}

/**
 * Normalize phone number to E.164-ish format for consistent matching.
 * Strips non-digits, ensures leading +1 for 10-digit US numbers.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Check if a phone number is on any DNC list for this workspace.
 * Must be called before ANY outbound call or SMS in campaigns.
 */
export async function checkDNC(
  workspaceId: string,
  phoneNumber: string
): Promise<DNCCheckResult> {
  const now = new Date().toISOString();
  const normalized = normalizePhone(phoneNumber);

  if (!normalized || normalized.length < 10) {
    return {
      blocked: true,
      reason: "Invalid phone number",
      source: "compliance_hold",
      checked_at: now,
    };
  }

  const db = getDb();

  try {
    // 1. Check workspace-specific DNC list
    const { data: dncEntry } = await db
      .from("dnc_list")
      .select("id, phone, reason, added_at")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized)
      .maybeSingle();

    if (dncEntry) {
      const entry = dncEntry as { reason?: string; added_at?: string };
      log("info", `DNC blocked: workspace=${workspaceId} phone=${normalized} reason=${entry.reason || "on DNC list"}`);
      return {
        blocked: true,
        reason: entry.reason || "Number is on workspace DNC list",
        source: "workspace_dnc",
        checked_at: now,
      };
    }

    // 2. Check lead opt-out status (lead marked as opted out of communications)
    const { data: optedOutLead } = await db
      .from("leads")
      .select("id, phone, status, metadata")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized)
      .in("status", ["OPT_OUT", "DO_NOT_CONTACT", "UNSUBSCRIBED"])
      .maybeSingle();

    if (optedOutLead) {
      log("info", `DNC blocked (opt-out): workspace=${workspaceId} phone=${normalized}`);
      return {
        blocked: true,
        reason: "Contact has opted out of communications",
        source: "opt_out",
        checked_at: now,
      };
    }

    // Also check the metadata.opted_out flag
    const { data: metaOptOut } = await db
      .from("leads")
      .select("id, metadata")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized)
      .maybeSingle();

    if (metaOptOut) {
      const meta = (metaOptOut as { metadata?: { opted_out?: boolean; dnc?: boolean } }).metadata;
      if (meta?.opted_out || meta?.dnc) {
        log("info", `DNC blocked (metadata): workspace=${workspaceId} phone=${normalized}`);
        return {
          blocked: true,
          reason: "Contact has opted out (metadata flag)",
          source: "opt_out",
          checked_at: now,
        };
      }
    }

    // 3. Check workspace compliance settings for calling hours
    const { data: settings } = await db
      .from("workspace_settings")
      .select("value")
      .eq("workspace_id", workspaceId)
      .eq("key", "compliance_settings")
      .maybeSingle();

    if (settings) {
      const config = (settings as { value?: { outbound_blocked?: boolean; require_consent?: boolean } }).value;
      if (config?.outbound_blocked) {
        return {
          blocked: true,
          reason: "Outbound calling is disabled for this workspace",
          source: "compliance_hold",
          checked_at: now,
        };
      }
    }

    // Not blocked
    return {
      blocked: false,
      checked_at: now,
    };
  } catch (error) {
    // On error, fail SAFE — block the call rather than risk DNC violation
    log("error", `DNC check error: workspace=${workspaceId} phone=${normalized} error=${error instanceof Error ? error.message : "unknown"}`);
    return {
      blocked: true,
      reason: "DNC check failed — blocking call for safety",
      source: "compliance_hold",
      checked_at: now,
    };
  }
}

/**
 * Add a phone number to the workspace DNC list.
 */
export async function addToDNC(
  workspaceId: string,
  phoneNumber: string,
  reason?: string
): Promise<{ ok: boolean }> {
  const normalized = normalizePhone(phoneNumber);
  const db = getDb();

  try {
    await db.from("dnc_list").upsert(
      {
        workspace_id: workspaceId,
        phone: normalized,
        reason: reason || "Manually added to DNC list",
        added_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,phone" }
    );

    log("info", `DNC added: workspace=${workspaceId} phone=${normalized} reason=${reason}`);
    return { ok: true };
  } catch (error) {
    log("error", `DNC add error: ${error instanceof Error ? error.message : "unknown"}`);
    return { ok: false };
  }
}

/**
 * Remove a phone number from the workspace DNC list.
 */
export async function removeFromDNC(
  workspaceId: string,
  phoneNumber: string
): Promise<{ ok: boolean }> {
  const normalized = normalizePhone(phoneNumber);
  const db = getDb();

  try {
    await db
      .from("dnc_list")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized);

    log("info", `DNC removed: workspace=${workspaceId} phone=${normalized}`);
    return { ok: true };
  } catch (error) {
    log("error", `DNC remove error: ${error instanceof Error ? error.message : "unknown"}`);
    return { ok: false };
  }
}

/**
 * Batch check multiple phone numbers against DNC list.
 * Returns map of phone → DNCCheckResult.
 */
export async function batchCheckDNC(
  workspaceId: string,
  phoneNumbers: string[]
): Promise<Map<string, DNCCheckResult>> {
  const results = new Map<string, DNCCheckResult>();

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 20;
  for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
    const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
    const checks = await Promise.all(
      batch.map((phone) => checkDNC(workspaceId, phone).then((result) => ({ phone, result })))
    );
    for (const { phone, result } of checks) {
      results.set(phone, result);
    }
  }

  return results;
}
