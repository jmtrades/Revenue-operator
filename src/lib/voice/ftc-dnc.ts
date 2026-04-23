/**
 * Phase 78 / Task 7.4 — FTC National DNC Registry sync.
 *
 * The FTC National Do Not Call Registry is the federal source of truth for
 * numbers that cannot lawfully receive telemarketing calls
 * (47 CFR 310.4(b)(1)(iii)(B)). Telemarketers must scrub their outbound
 * lists against it every 31 days at minimum, and each individual outbound
 * call must be checked — a single DNC-listed call can be a $43,792 FTC
 * penalty (per-violation, 2025 cap).
 *
 * This module owns the sync side of that story:
 *
 *   - `syncFtcDnc(fetcher?)` — pulls the federal (or vendor) feed, upserts
 *     every row into `ftc_dnc_cache(phone_number)`, writes a one-row audit
 *     entry into `ftc_dnc_sync_runs`, and returns `{ ok, rowsUpserted,
 *     batchId, error? }`. Idempotent per day — re-running the same day's
 *     sync upserts the same rows and results in no net change.
 *   - `parseFtcFeed(raw)` — pure parser for the line-delimited feed format
 *     produced by the federal registry (phone number, optional date of
 *     registration). Exposed so tests can pin the contract without stubbing
 *     a network layer.
 *
 * The READ side (`isDncSuppressed`) lives in `@/lib/voice/dnc.ts` and was
 * wired up in Task 7.3 — this module just keeps that cache fresh.
 *
 * Configuration (all optional; sync no-ops cleanly if missing):
 *   - `FTC_DNC_FEED_URL` — the URL to fetch. If a workspace contracts with
 *     a vendor that fronts the federal feed (most do — the federal API
 *     requires a registered organization ID and is rate-limited), point
 *     this at the vendor URL.
 *   - `FTC_DNC_API_KEY` — bearer token for the feed URL. Sent as
 *     `Authorization: Bearer …` if present.
 *   - `FTC_DNC_ORG_ID` — federal organization ID, sent as
 *     `X-FTC-Organization-ID` if present (the federal API wants this; most
 *     vendor feeds ignore it but it's harmless).
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { assertE164, normalizePhone } from "@/lib/security/phone";

export interface FtcFeedRow {
  /** Strict E.164 phone number. Normalized before emission. */
  phoneNumber: string;
  /** ISO-8601 date (YYYY-MM-DD) when the consumer added themselves, if known. */
  addedToRegistryAt: string | null;
}

export interface FtcSyncResult {
  ok: boolean;
  /** Opaque batch id stamped onto every row upserted by this run. */
  batchId: string;
  /** Number of rows the parser emitted AND we attempted to upsert. */
  rowsUpserted: number;
  /** Rows the feed contained but that failed E.164 normalization. */
  rowsSkippedInvalid: number;
  error?: string;
}

/**
 * Shape expected from a fetcher — purposefully narrow so tests can pass a
 * deterministic in-memory implementation without mocking global fetch.
 */
export type FtcFeedFetcher = () => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

/**
 * Build a batch id that's deterministic per (day, env). Two sync runs on
 * the same UTC day share a batch id so we don't pile up orphaned rows in
 * `ftc_dnc_sync_runs` on retries.
 */
function dailyBatchId(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `ftc_dnc_${yyyy}${mm}${dd}`;
}

/**
 * Parse the federal feed's line-delimited format. Each line is one of:
 *   "+15555551212"
 *   "+15555551212,2024-07-18"
 *   "5555551212"           (bare 10-digit US — normalized to +1…)
 *   "5555551212 2024-07-18"
 *   "" / "# comment"        — ignored
 *
 * Lines that can't be coerced to strict E.164 are skipped (caller receives
 * a count in `rowsSkippedInvalid`); we never throw on malformed input
 * because the federal feed has historically been scrappy and a single bad
 * row should not abort a 200k-row sync.
 *
 * Pure function: no I/O, no logging — safe to unit-test directly.
 */
export function parseFtcFeed(raw: string): {
  rows: FtcFeedRow[];
  skipped: number;
} {
  const rows: FtcFeedRow[] = [];
  let skipped = 0;
  const lines = raw.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    // Split on comma OR whitespace — both appear in historic federal dumps.
    const parts = line.split(/[\s,]+/).filter((s) => s.length > 0);
    if (parts.length === 0) continue;
    const [phoneRaw, dateRaw] = parts;
    const normalized = normalizePhone(phoneRaw);
    if (!normalized) {
      skipped += 1;
      continue;
    }
    let phone: string;
    try {
      phone = assertE164(normalized);
    } catch {
      skipped += 1;
      continue;
    }
    let addedToRegistryAt: string | null = null;
    if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      addedToRegistryAt = dateRaw;
    }
    rows.push({ phoneNumber: phone, addedToRegistryAt });
  }
  return { rows, skipped };
}

/**
 * Fetch the federal / vendor feed and upsert it into `ftc_dnc_cache`.
 *
 * Contract:
 *   - If `FTC_DNC_FEED_URL` is not configured, returns `ok: true` with
 *     `rowsUpserted: 0`. Logs a `warn` once per run — we don't want the
 *     cron to loop-fail in environments that haven't yet registered with
 *     the FTC.
 *   - A single audit row is written to `ftc_dnc_sync_runs` per call, with
 *     `status` set to `'running'` on entry and updated to `'success'` /
 *     `'failed'` before return.
 *   - Upserts happen in chunks (default 1000) to keep the PostgREST payload
 *     size bounded; chunk size is a knob rather than a constant because the
 *     real federal feed is ~250M rows and we want headroom to tune.
 *
 * The fetcher is injectable so tests don't touch the network. Production
 * callers don't pass one — we fall back to global `fetch` with the
 * configured URL + headers.
 */
export async function syncFtcDnc(options: {
  fetcher?: FtcFeedFetcher;
  now?: Date;
  chunkSize?: number;
} = {}): Promise<FtcSyncResult> {
  const now = options.now ?? new Date();
  const batchId = dailyBatchId(now);
  const chunkSize = options.chunkSize ?? 1000;
  const db = getDb();

  // Record the run as "started" so we have an audit trail even if we crash.
  try {
    await db.from("ftc_dnc_sync_runs").upsert(
      {
        batch_id: batchId,
        started_at: now.toISOString(),
        status: "running",
        rows_upserted: 0,
      },
      { onConflict: "batch_id" },
    );
  } catch (err) {
    // Audit-table absence should not block the real sync (the table may not
    // be provisioned in a staging env yet). Keep going.
    log("warn", "ftc_dnc.audit_start_failed", {
      batchId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const feedUrl = process.env.FTC_DNC_FEED_URL;
  if (!feedUrl && !options.fetcher) {
    log("warn", "ftc_dnc.not_configured", { batchId });
    await finishAudit(db, batchId, now, "success", 0);
    return {
      ok: true,
      batchId,
      rowsUpserted: 0,
      rowsSkippedInvalid: 0,
    };
  }

  const fetcher: FtcFeedFetcher =
    options.fetcher ??
    (async () => {
      const headers: Record<string, string> = { Accept: "text/plain" };
      const apiKey = process.env.FTC_DNC_API_KEY;
      const orgId = process.env.FTC_DNC_ORG_ID;
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      if (orgId) headers["X-FTC-Organization-ID"] = orgId;
      const response = await fetch(feedUrl!, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(60_000),
      });
      return {
        ok: response.ok,
        status: response.status,
        text: () => response.text(),
      };
    });

  let raw: string;
  try {
    const response = await fetcher();
    if (!response.ok) {
      const errorText = `HTTP ${response.status}`;
      log("error", "ftc_dnc.fetch_failed", { batchId, error: errorText });
      await finishAudit(db, batchId, new Date(), "failed", 0, errorText);
      return {
        ok: false,
        batchId,
        rowsUpserted: 0,
        rowsSkippedInvalid: 0,
        error: errorText,
      };
    }
    raw = await response.text();
  } catch (err) {
    const errorText = err instanceof Error ? err.message : String(err);
    log("error", "ftc_dnc.fetch_threw", { batchId, error: errorText });
    await finishAudit(db, batchId, new Date(), "failed", 0, errorText);
    return {
      ok: false,
      batchId,
      rowsUpserted: 0,
      rowsSkippedInvalid: 0,
      error: errorText,
    };
  }

  const { rows, skipped } = parseFtcFeed(raw);
  if (rows.length === 0) {
    log("info", "ftc_dnc.empty_feed", { batchId, skipped });
    await finishAudit(db, batchId, new Date(), "success", 0);
    return {
      ok: true,
      batchId,
      rowsUpserted: 0,
      rowsSkippedInvalid: skipped,
    };
  }

  let upserted = 0;
  const syncedAt = new Date().toISOString();
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const payload = chunk.map((r) => ({
      phone_number: r.phoneNumber,
      added_to_registry_at: r.addedToRegistryAt,
      synced_at: syncedAt,
      source: "ftc_national",
      batch_id: batchId,
    }));
    try {
      await db
        .from("ftc_dnc_cache")
        .upsert(payload, { onConflict: "phone_number" });
      upserted += chunk.length;
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      log("error", "ftc_dnc.chunk_upsert_failed", {
        batchId,
        chunkStart: i,
        chunkSize: chunk.length,
        error: errorText,
      });
      await finishAudit(db, batchId, new Date(), "failed", upserted, errorText);
      return {
        ok: false,
        batchId,
        rowsUpserted: upserted,
        rowsSkippedInvalid: skipped,
        error: errorText,
      };
    }
  }

  await finishAudit(db, batchId, new Date(), "success", upserted);
  log("info", "ftc_dnc.sync_done", {
    batchId,
    rowsUpserted: upserted,
    rowsSkippedInvalid: skipped,
  });

  return {
    ok: true,
    batchId,
    rowsUpserted: upserted,
    rowsSkippedInvalid: skipped,
  };
}

/**
 * Close out the audit row. Best-effort — if the audit table isn't
 * provisioned, we already logged the start-failure warning and this
 * silently no-ops.
 */
async function finishAudit(
  db: ReturnType<typeof getDb>,
  batchId: string,
  finishedAt: Date,
  status: "success" | "failed",
  rowsUpserted: number,
  error?: string,
): Promise<void> {
  try {
    await db
      .from("ftc_dnc_sync_runs")
      .update({
        finished_at: finishedAt.toISOString(),
        status,
        rows_upserted: rowsUpserted,
        error: error ?? null,
      })
      .eq("batch_id", batchId);
  } catch (err) {
    log("warn", "ftc_dnc.audit_finish_failed", {
      batchId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
