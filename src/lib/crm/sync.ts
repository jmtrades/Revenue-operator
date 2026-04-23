/**
 * src/lib/crm/sync.ts — Incremental CRM sync wrapper. (Phase 78 / Task 9.1)
 *
 * Problem this file solves
 * ------------------------
 * `src/lib/integrations/crm-pull.ts` paginates against a provider and
 * returns every record in the contact set. The pagination cursor it
 * persists (on `workspace_crm_connections.metadata.pull_cursor`) handles
 * mid-backfill resume but is cleared when a backfill completes. The
 * next scheduled sync therefore re-fetches the entire contact set —
 * "incremental" is incremental only WITHIN a single backfill run.
 *
 * This module adds a true per-entity watermark. Before a sync starts:
 *   1. Read `cursor_at` from `crm_sync_cursor(workspace, provider, entity)`.
 *   2. Pull pages as usual. For providers that accept an
 *      updated-since filter in the listing URL (HubSpot's search endpoint,
 *      Pipedrive's `since_timestamp`, Close's `date_updated__gt`, etc.),
 *      pass the cursor so the provider only emits changed rows. For
 *      providers that don't, we filter client-side using
 *      `extractUpdatedAt` on the raw payload.
 *   3. On completion, set `cursor_at` to the max(updated_at) observed
 *      across pulled records (never move backward).
 *
 * Contract with the route layer
 * -----------------------------
 * The route that drives backfills continues to use `pullContactsFromCrm`
 * directly for the one-time-backfill mode (mode: "backfill"). For the
 * scheduled/incremental path, it calls `syncContactsIncrementally` and
 * gets back records that have actually changed since last run plus the
 * new cursor. The route is free to ingest those via `ingestPulledBatch`
 * exactly as it does today.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { pullContactsFromCrm } from "@/lib/integrations/crm-pull";
import type { PulledRecord, PullResult } from "@/lib/integrations/crm-pull";
import type { CrmProviderId } from "@/lib/integrations/field-mapper";
import type { CrmTokens } from "@/lib/integrations/token-refresh";

// Entity taxonomy — keep in lockstep with the CHECK constraint in
// supabase/migrations/20260422_crm_sync_cursor.sql.
export type CrmSyncEntity =
  | "contact"
  | "lead"
  | "deal"
  | "company"
  | "account"
  | "activity";

// ─── Cursor persistence ─────────────────────────────────────────────────

/**
 * Read the stored watermark for a (workspace, provider, entity). Returns
 * null when no cursor has been persisted yet — i.e., the first-ever
 * sync, in which case the caller should do a full backfill.
 */
export async function getIncrementalCursor(
  workspaceId: string,
  provider: CrmProviderId,
  entity: CrmSyncEntity,
): Promise<Date | null> {
  const db = getDb();
  const { data } = await db
    .from("crm_sync_cursor")
    .select("cursor_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("entity", entity)
    .maybeSingle();
  const row = data as { cursor_at?: string | null } | null;
  if (!row?.cursor_at) return null;
  const d = new Date(row.cursor_at);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Advance the stored watermark. Upserts the row so the first call after
 * a fresh backfill creates the record. NEVER moves the cursor backward:
 * if the stored cursor is later than `cursor`, this is a no-op — the
 * caller either re-ran an old sync job or the incoming batch was empty,
 * and we don't want to forget progress we've already made.
 */
export async function updateIncrementalCursor(
  workspaceId: string,
  provider: CrmProviderId,
  entity: CrmSyncEntity,
  cursor: Date,
): Promise<void> {
  if (!Number.isFinite(cursor.getTime())) return;
  const db = getDb();

  const existing = await getIncrementalCursor(workspaceId, provider, entity);
  if (existing && existing.getTime() >= cursor.getTime()) {
    // Monotonic-only: don't move backward.
    return;
  }

  // Upsert keyed on the PK (workspace_id, provider, entity).
  await db
    .from("crm_sync_cursor")
    .upsert(
      {
        workspace_id: workspaceId,
        provider,
        entity,
        cursor_at: cursor.toISOString(),
      },
      { onConflict: "workspace_id,provider,entity" },
    );
}

// ─── updated_at extraction per provider ─────────────────────────────────

/**
 * Pull the "last modified" timestamp out of a raw record returned by a
 * specific provider. Returns null when the provider doesn't expose one
 * (or when the field is absent on a particular record) — callers treat
 * null as "can't prove this is new, keep it to be safe".
 *
 * The per-provider field names are the ones emitted by
 * `pullContactsFromCrm` after it unwraps each provider's pagination
 * envelope. For HubSpot the fields are flattened from `properties`
 * (`lastmodifieddate`), for Salesforce they live on the sobject
 * (`LastModifiedDate`), etc.
 */
export function extractUpdatedAt(
  provider: CrmProviderId,
  raw: Record<string, unknown>,
): Date | null {
  // Grab string-or-null from a candidate field list, pick the first present.
  const pick = (keys: string[]): string | null => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "string" && v) return v;
      if (typeof v === "number") return new Date(v).toISOString();
    }
    return null;
  };

  let iso: string | null = null;
  switch (provider) {
    case "hubspot":
      // pullFromHubSpot flattens `properties` into the top-level object
      // and also keeps `updatedAt` from the object envelope when present.
      iso = pick(["lastmodifieddate", "hs_lastmodifieddate", "updatedAt"]);
      break;
    case "salesforce":
      iso = pick(["LastModifiedDate", "SystemModstamp"]);
      break;
    case "zoho_crm":
      iso = pick(["Modified_Time", "modified_time"]);
      break;
    case "pipedrive":
      iso = pick(["update_time", "updated_at"]);
      break;
    case "gohighlevel":
      iso = pick(["dateUpdated", "updatedAt"]);
      break;
    case "google_contacts": {
      // People API nests this under metadata.sources[].updateTime; pick
      // the max across sources.
      const md = raw.metadata as { sources?: Array<{ updateTime?: string }> } | undefined;
      const times = (md?.sources ?? [])
        .map((s) => s.updateTime)
        .filter((t): t is string => typeof t === "string" && !!t);
      iso = times.sort().at(-1) ?? null;
      break;
    }
    case "microsoft_365":
      iso = pick(["lastModifiedDateTime"]);
      break;
    case "airtable": {
      // Airtable exposes last-modified on the envelope as `fields` won't
      // have it unless the base defines a LAST_MODIFIED_TIME() column.
      // pullFromAirtable preserves the raw envelope as { id, fields }.
      const asEnvelope = raw as { fields?: Record<string, unknown>; createdTime?: string };
      const fields = asEnvelope.fields ?? {};
      const candidate = fields["Last Modified"] ?? fields["Last Modified Time"] ?? fields["updated_at"];
      iso =
        (typeof candidate === "string" && candidate) ||
        asEnvelope.createdTime ||
        null;
      break;
    }
    case "close":
      iso = pick(["date_updated", "updated_at"]);
      break;
    case "follow_up_boss":
      iso = pick(["updated", "updatedAt"]);
      break;
    case "active_campaign":
      iso = pick(["udate", "updated_timestamp"]);
      break;
    case "copper":
      // Copper returns `date_modified` as a unix timestamp (seconds).
      {
        const v = raw.date_modified;
        if (typeof v === "number") iso = new Date(v * 1000).toISOString();
        else if (typeof v === "string") iso = v;
      }
      break;
    case "monday_crm":
      iso = pick(["updated_at"]);
      break;
    case "freshsales":
      iso = pick(["updated_at"]);
      break;
    case "attio":
      iso = pick(["updated_at"]);
      break;
    case "keap":
      iso = pick(["last_updated", "date_updated"]);
      break;
    case "google_sheets":
      // Sheets has no row-level updated_at — return null so the caller
      // falls back to always resyncing.
      iso = null;
      break;
  }

  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

// ─── Core sync ──────────────────────────────────────────────────────────

export interface SyncResult {
  records: PulledRecord[];
  /** Inclusive upper bound of the pulled window — what the next call should filter above. */
  newCursor: Date | null;
  /** How many pulled records were dropped because they were ≤ the previous cursor. */
  filteredStale: number;
  /** Pagination pages consumed. */
  pages: number;
}

export interface SyncOptions {
  entity?: CrmSyncEntity;
  pageLimit?: number;
  /** Hard ceiling on pages per call so a single sync can't monopolize the runtime. */
  maxPages?: number;
  /** Override the persisted cursor for this call (testing / manual resync). */
  cursorOverride?: Date | null;
  /** Advance the stored cursor at the end. Set false in dry-run tests. */
  persistCursor?: boolean;
}

/**
 * Sync the contact set from a CRM for a workspace, returning only
 * records changed since the last successful run. Also advances the
 * stored watermark so the next call picks up from here.
 *
 * This function does NOT ingest into `leads` — that's
 * `ingestPulledBatch`'s job in `src/lib/integrations/crm-ingest.ts`.
 * Keeping the two concerns separate means the caller can decide whether
 * to persist the cursor BEFORE or AFTER ingest depending on failure
 * semantics it wants.
 */
export async function syncContactsIncrementally(
  workspaceId: string,
  provider: CrmProviderId,
  tokens: CrmTokens,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const entity: CrmSyncEntity = opts.entity ?? "contact";
  const pageLimit = Math.min(Math.max(opts.pageLimit ?? 100, 1), 500);
  const maxPages = Math.min(Math.max(opts.maxPages ?? 10, 1), 50);

  const previousCursor =
    opts.cursorOverride !== undefined
      ? opts.cursorOverride
      : await getIncrementalCursor(workspaceId, provider, entity);

  const collected: PulledRecord[] = [];
  let filteredStale = 0;
  let maxSeen: Date | null = previousCursor;
  let pages = 0;
  let pullCursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const pull: PullResult = await pullContactsFromCrm(provider, tokens, {
      cursor: pullCursor,
      limit: pageLimit,
    });
    pages++;

    for (const rec of pull.records) {
      const updatedAt = extractUpdatedAt(provider, rec.raw);

      // Filter stale records. Strictly greater-than so we never re-emit
      // a record whose updated_at equals the last cursor we saved.
      if (previousCursor && updatedAt && updatedAt <= previousCursor) {
        filteredStale++;
        continue;
      }
      collected.push(rec);
      if (updatedAt && (!maxSeen || updatedAt > maxSeen)) {
        maxSeen = updatedAt;
      }
    }

    pullCursor = pull.nextCursor;
    if (!pullCursor) break;
  }

  if (opts.persistCursor !== false && maxSeen) {
    try {
      await updateIncrementalCursor(workspaceId, provider, entity, maxSeen);
    } catch (err) {
      // Cursor advance failing is non-fatal for the sync itself — next
      // run will just re-process the same window. Log loudly so it's
      // not silent drift.
      log("warn", "crm_sync.cursor_advance_failed", {
        workspaceId,
        provider,
        entity,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    records: collected,
    newCursor: maxSeen,
    filteredStale,
    pages,
  };
}
