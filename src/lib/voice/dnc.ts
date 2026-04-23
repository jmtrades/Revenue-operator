/**
 * Phase 78 / Task 7.3 — Unified DNC helper.
 *
 * The codebase previously wrote DNC entries to `dnc_list` with two
 * incompatible column conventions — `phone` (canonical helper in
 * `@/lib/compliance/dnc-check.ts` and the `revokeAndHangup` path) and
 * `phone_number` (consent-revocation, wrong-number, the REST API). Readers
 * picked one side or the other and missed the writes from the other. That
 * split is a live TCPA defect: a STOP-keyword entry recorded to `phone`
 * was invisible to the dashboard reading `phone_number`, and vice-versa.
 *
 * This module is the single write/read path going forward. It targets a
 * new canonical table `dnc_entries(phone_number)` introduced by
 * `supabase/migrations/20260422_phase78_dnc_unify.sql`.
 *
 * Contract:
 *   - `isDncSuppressed(workspace_id, phoneE164)` — returns `true` iff the
 *     phone is present in `dnc_entries` for that workspace, OR (fallback)
 *     in the federal `ftc_dnc_cache` (if that table exists in this env).
 *   - `addDncEntry({ workspace_id, phone, reason, source, notes, added_by })`
 *     — upserts into `dnc_entries` keyed on `(workspace_id, phone_number)`.
 *
 * Both helpers run phones through `assertE164`, which guarantees a
 * PostgREST-safe strict E.164 string before any `.eq(...)` interpolation.
 * Callers that accept loose user input should normalize first with
 * `normalizePhone` from `@/lib/security/phone`.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { assertE164, normalizePhone } from "@/lib/security/phone";

/**
 * Allowed reasons for a DNC entry — mirrored in the migration's CHECK
 * constraint. Keep the two lists in sync.
 */
export type DncReason =
  | "user_request"
  | "stop_keyword"
  | "ftc_registry"
  | "complaint"
  | "manual"
  | "consent_revoked"
  | "wrong_number"
  | "reassigned_number";

export interface AddDncEntryParams {
  workspaceId: string;
  /** Phone number in either loose or strict E.164; will be normalized. */
  phone: string;
  reason: DncReason;
  source?: string;
  notes?: string | null;
  addedBy?: string | null;
}

export interface AddDncEntryResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/**
 * Normalize phone input to strict E.164, throwing on anything the E.164
 * assertion rejects. Loose formats like "(415) 555-1234" are accepted via
 * `normalizePhone`; already-strict inputs pass straight through.
 */
function toE164(phone: string): string {
  // Accept both loose and strict input. `normalizePhone` returns `null` on
  // anything that can't be rendered as valid E.164; we surface that as a
  // thrown error so callers handle it explicitly.
  if (typeof phone !== "string" || phone.length === 0) {
    throw new Error("DNC phone must be a non-empty string");
  }
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error(`DNC phone could not be normalized to E.164: ${phone}`);
  }
  return assertE164(normalized);
}

/**
 * Is this phone suppressed for the given workspace?
 *
 * Reads:
 *   1. `dnc_entries` — the canonical table (workspace-scoped).
 *   2. `ftc_dnc_cache` — federal registry cache (global; table may not
 *      exist in every environment — absence is treated as "not suppressed
 *      federally").
 *
 * Fails OPEN on internal errors: if the DNC check itself throws, we log
 * but return `false`. The outbound dialer's defense-in-depth DNC check
 * in `@/lib/compliance/dnc-check.ts` ALSO runs per-call, and its failure
 * mode is fail-CLOSED. So here we prefer availability.
 */
export async function isDncSuppressed(
  workspaceId: string,
  phoneE164: string,
): Promise<boolean> {
  let phone: string;
  try {
    phone = toE164(phoneE164);
  } catch (err) {
    log("warn", "dnc.is_suppressed.invalid_phone", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }

  const db = getDb();

  // Workspace-scoped check.
  try {
    const { data } = await db
      .from("dnc_entries")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("phone_number", phone)
      .limit(1)
      .maybeSingle();
    if (data) return true;
  } catch (err) {
    log("warn", "dnc.is_suppressed.lookup_failed", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Federal FTC registry cache (table may not exist yet — Task 7.4 lands
  // it; until then we just skip on any error).
  try {
    const { data: ftc } = await db
      .from("ftc_dnc_cache")
      .select("id")
      .eq("phone_number", phone)
      .limit(1)
      .maybeSingle();
    if (ftc) return true;
  } catch {
    // Table missing or RLS blocked — not suppressed federally per this check.
  }

  return false;
}

/**
 * Upsert a DNC entry. Idempotent on `(workspace_id, phone_number)`.
 *
 * On success returns `ok: true` and the row's UUID. On failure, logs and
 * returns `ok: false` with the error string — callers handling compliance
 * flows should surface this (the DNC write is the primary compliance
 * evidence; if it fails we need to know).
 */
export async function addDncEntry(
  params: AddDncEntryParams,
): Promise<AddDncEntryResult> {
  let phone: string;
  try {
    phone = toE164(params.phone);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const db = getDb();
  const row: Record<string, unknown> = {
    workspace_id: params.workspaceId,
    phone_number: phone,
    reason: params.reason,
    source: params.source ?? "internal",
  };
  if (params.notes !== undefined) row.notes = params.notes;
  if (params.addedBy !== undefined) row.added_by = params.addedBy;

  try {
    // Supabase query-builder: we only touch the two methods we care about.
    type UpsertQuery = PromiseLike<{
      data: unknown;
      error: { message?: string } | null;
    }> & {
      select?: (cols: string) => {
        maybeSingle: () => Promise<{
          data: unknown;
          error: { message?: string } | null;
        }>;
      };
    };
    const q = db.from("dnc_entries").upsert(row, {
      onConflict: "workspace_id,phone_number",
    }) as unknown as UpsertQuery;
    // Some builders require `.select().maybeSingle()` to return the row;
    // others resolve the upsert directly. We try `.select()` and fall back
    // to treating the upsert as a void-resolving thenable.
    let data: { id?: string } | null = null;
    if (typeof q.select === "function") {
      const res = await q.select("id").maybeSingle();
      data = (res?.data ?? null) as { id?: string } | null;
      if (res?.error) {
        throw new Error(res.error.message ?? String(res.error));
      }
    } else {
      await q;
    }

    log("info", "dnc.added", {
      workspaceId: params.workspaceId,
      phone_last4: phone.slice(-4),
      reason: params.reason,
    });
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "dnc.add_failed", {
      workspaceId: params.workspaceId,
      phone_last4: phone.slice(-4),
      error: message,
    });
    return { ok: false, error: message };
  }
}

/**
 * Remove a DNC entry (typically after a re-subscribe / START keyword).
 * Idempotent — removing a non-existent entry is a no-op that returns ok.
 */
export async function removeDncEntry(
  workspaceId: string,
  phoneE164: string,
): Promise<{ ok: boolean; error?: string }> {
  let phone: string;
  try {
    phone = toE164(phoneE164);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const db = getDb();
  try {
    await db
      .from("dnc_entries")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("phone_number", phone);
    log("info", "dnc.removed", {
      workspaceId,
      phone_last4: phone.slice(-4),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "dnc.remove_failed", {
      workspaceId,
      phone_last4: phone.slice(-4),
      error: message,
    });
    return { ok: false, error: message };
  }
}
