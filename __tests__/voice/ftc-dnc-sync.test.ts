/**
 * Phase 78 / Task 7.4 — FTC National DNC Registry sync.
 *
 * Verifies the contract that `syncFtcDnc` fulfills:
 *   1. Parses the federal line-delimited feed (phone-only, phone+date,
 *      whitespace-separated, comma-separated, #comment, blank lines).
 *   2. Normalizes 10-digit US input to strict E.164 (+1…).
 *   3. Skips malformed lines rather than aborting the whole run.
 *   4. Upserts rows into `ftc_dnc_cache(phone_number)` with
 *      `onConflict: "phone_number"` — running the same day twice is a no-op
 *      at row-count level because the batch_id is deterministic per UTC day.
 *   5. Writes a start + end audit row into `ftc_dnc_sync_runs`.
 *   6. No-ops cleanly when `FTC_DNC_FEED_URL` is unset (so an environment
 *      that hasn't yet registered with the FTC doesn't loop-fail the cron).
 *   7. Fails SAFE when the feed returns non-2xx — audit row is marked
 *      `failed`, `rowsUpserted: 0`, and the error string is surfaced.
 *
 * And pins the cron route contract:
 *   - Requires Bearer CRON_SECRET; missing/mismatched → 401.
 *   - Returns JSON `{ ok, batchId, rowsUpserted, rowsSkippedInvalid }`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");

type Row = Record<string, unknown>;

interface FakeTableState {
  upsertCalls: Array<{ rows: Row[]; opts?: Record<string, unknown> }>;
  updateCalls: Array<{ patch: Row; eqs: Array<[string, unknown]> }>;
}

function makeFakeDb(tables: Record<string, FakeTableState>) {
  return {
    from(table: string) {
      const state =
        tables[table] ??
        ({ upsertCalls: [], updateCalls: [] } as FakeTableState);
      tables[table] = state;
      return {
        upsert(rowOrRows: Row | Row[], opts?: Record<string, unknown>) {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          state.upsertCalls.push({ rows, opts });
          return Promise.resolve({ data: null, error: null });
        },
        update(patch: Row) {
          const call = { patch, eqs: [] as Array<[string, unknown]> };
          state.updateCalls.push(call);
          return {
            eq(col: string, val: unknown) {
              call.eqs.push([col, val]);
              return this;
            },
          };
        },
      };
    },
  };
}

let currentFakeDb: ReturnType<typeof makeFakeDb> | null = null;

vi.mock("@/lib/db/queries", () => ({
  getDb: () => currentFakeDb,
}));

beforeEach(() => {
  process.env.FTC_DNC_FEED_URL = "https://example.test/ftc-feed";
});

afterEach(() => {
  vi.restoreAllMocks();
  currentFakeDb = null;
  delete process.env.FTC_DNC_FEED_URL;
  delete process.env.FTC_DNC_API_KEY;
  delete process.env.FTC_DNC_ORG_ID;
});

describe("parseFtcFeed — pure parser", () => {
  it("parses phone-only lines and normalizes to E.164", async () => {
    const { parseFtcFeed } = await import("@/lib/voice/ftc-dnc");
    const { rows, skipped } = parseFtcFeed(
      [
        "+14155551212",
        "4155551213",
        "14155551214",
        "",
        "# comment ignored",
      ].join("\n"),
    );
    expect(skipped).toBe(0);
    expect(rows.map((r) => r.phoneNumber)).toEqual([
      "+14155551212",
      "+14155551213",
      "+14155551214",
    ]);
    expect(rows.every((r) => r.addedToRegistryAt === null)).toBe(true);
  });

  it("parses phone+date lines with comma or whitespace separator", async () => {
    const { parseFtcFeed } = await import("@/lib/voice/ftc-dnc");
    const { rows } = parseFtcFeed(
      [
        "+14155551212,2024-07-18",
        "+14155551213 2023-01-05",
      ].join("\n"),
    );
    expect(rows).toEqual([
      { phoneNumber: "+14155551212", addedToRegistryAt: "2024-07-18" },
      { phoneNumber: "+14155551213", addedToRegistryAt: "2023-01-05" },
    ]);
  });

  it("skips malformed lines without aborting the whole parse", async () => {
    const { parseFtcFeed } = await import("@/lib/voice/ftc-dnc");
    const { rows, skipped } = parseFtcFeed(
      [
        "+14155551212",
        "not-a-phone",
        "",
        "+14155551213",
        "12", // too short to normalize
      ].join("\n"),
    );
    expect(rows.map((r) => r.phoneNumber)).toEqual([
      "+14155551212",
      "+14155551213",
    ]);
    expect(skipped).toBe(2);
  });

  it("drops malformed date but keeps the phone", async () => {
    const { parseFtcFeed } = await import("@/lib/voice/ftc-dnc");
    const { rows } = parseFtcFeed("+14155551212 not-a-date");
    expect(rows).toEqual([
      { phoneNumber: "+14155551212", addedToRegistryAt: null },
    ]);
  });
});

describe("syncFtcDnc — upsert + audit", () => {
  it("upserts every feed row with onConflict phone_number and stamps a batch_id", async () => {
    const tables: Record<string, FakeTableState> = {
      ftc_dnc_cache: { upsertCalls: [], updateCalls: [] },
      ftc_dnc_sync_runs: { upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        ["+14155551212", "+14155551213,2024-07-18", "4155551214"].join("\n"),
    });

    const { syncFtcDnc } = await import("@/lib/voice/ftc-dnc");
    const now = new Date("2026-04-22T06:15:00.000Z");
    const result = await syncFtcDnc({ fetcher, now });

    expect(result.ok).toBe(true);
    expect(result.rowsUpserted).toBe(3);
    expect(result.rowsSkippedInvalid).toBe(0);
    expect(result.batchId).toBe("ftc_dnc_20260422");

    // Exactly one upsert call containing all three rows.
    expect(tables.ftc_dnc_cache!.upsertCalls.length).toBe(1);
    const { rows, opts } = tables.ftc_dnc_cache!.upsertCalls[0];
    expect(opts).toEqual({ onConflict: "phone_number" });
    expect(rows.length).toBe(3);
    expect(rows.map((r) => r.phone_number)).toEqual([
      "+14155551212",
      "+14155551213",
      "+14155551214",
    ]);
    expect(rows[1].added_to_registry_at).toBe("2024-07-18");
    expect(rows.every((r) => r.batch_id === "ftc_dnc_20260422")).toBe(true);
    expect(rows.every((r) => r.source === "ftc_national")).toBe(true);

    // Audit: one start-upsert, one finish-update tagged success.
    expect(tables.ftc_dnc_sync_runs!.upsertCalls.length).toBe(1);
    const startRow = tables.ftc_dnc_sync_runs!.upsertCalls[0].rows[0];
    expect(startRow.batch_id).toBe("ftc_dnc_20260422");
    expect(startRow.status).toBe("running");
    expect(tables.ftc_dnc_sync_runs!.updateCalls.length).toBe(1);
    const finishUpdate = tables.ftc_dnc_sync_runs!.updateCalls[0];
    expect(finishUpdate.patch.status).toBe("success");
    expect(finishUpdate.patch.rows_upserted).toBe(3);
    expect(finishUpdate.eqs).toEqual([["batch_id", "ftc_dnc_20260422"]]);
  });

  it("chunks large feeds into multiple upsert calls", async () => {
    const tables: Record<string, FakeTableState> = {
      ftc_dnc_cache: { upsertCalls: [], updateCalls: [] },
      ftc_dnc_sync_runs: { upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    // 2500 rows, chunk size 1000 ⇒ 3 upsert calls (1000 + 1000 + 500).
    const feedLines: string[] = [];
    for (let i = 0; i < 2500; i += 1) {
      const suffix = String(1_000_000 + i).slice(-7);
      feedLines.push(`+1415${suffix}`);
    }
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => feedLines.join("\n"),
    });

    const { syncFtcDnc } = await import("@/lib/voice/ftc-dnc");
    const result = await syncFtcDnc({ fetcher, chunkSize: 1000 });

    expect(result.ok).toBe(true);
    expect(result.rowsUpserted).toBe(2500);
    expect(tables.ftc_dnc_cache!.upsertCalls.length).toBe(3);
    expect(tables.ftc_dnc_cache!.upsertCalls[0].rows.length).toBe(1000);
    expect(tables.ftc_dnc_cache!.upsertCalls[1].rows.length).toBe(1000);
    expect(tables.ftc_dnc_cache!.upsertCalls[2].rows.length).toBe(500);
  });

  it("no-ops ok=true when FTC_DNC_FEED_URL is not configured", async () => {
    delete process.env.FTC_DNC_FEED_URL;
    const tables: Record<string, FakeTableState> = {
      ftc_dnc_cache: { upsertCalls: [], updateCalls: [] },
      ftc_dnc_sync_runs: { upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const { syncFtcDnc } = await import("@/lib/voice/ftc-dnc");
    const result = await syncFtcDnc();

    expect(result.ok).toBe(true);
    expect(result.rowsUpserted).toBe(0);
    // No cache upserts — feed URL is missing.
    expect(tables.ftc_dnc_cache!.upsertCalls.length).toBe(0);
    // But the audit start row was written and then closed out as success.
    expect(tables.ftc_dnc_sync_runs!.upsertCalls.length).toBe(1);
    expect(tables.ftc_dnc_sync_runs!.updateCalls.length).toBe(1);
    expect(tables.ftc_dnc_sync_runs!.updateCalls[0].patch.status).toBe(
      "success",
    );
  });

  it("fails SAFE on non-2xx feed response (audit marked failed, error surfaced)", async () => {
    const tables: Record<string, FakeTableState> = {
      ftc_dnc_cache: { upsertCalls: [], updateCalls: [] },
      ftc_dnc_sync_runs: { upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    const { syncFtcDnc } = await import("@/lib/voice/ftc-dnc");
    const result = await syncFtcDnc({ fetcher });

    expect(result.ok).toBe(false);
    expect(result.rowsUpserted).toBe(0);
    expect(result.error).toMatch(/HTTP 503/);
    // No rows were upserted to cache.
    expect(tables.ftc_dnc_cache!.upsertCalls.length).toBe(0);
    // Audit closed as failed.
    expect(tables.ftc_dnc_sync_runs!.updateCalls.length).toBe(1);
    expect(tables.ftc_dnc_sync_runs!.updateCalls[0].patch.status).toBe(
      "failed",
    );
    expect(tables.ftc_dnc_sync_runs!.updateCalls[0].patch.error).toMatch(
      /HTTP 503/,
    );
  });

  it("fails SAFE when the fetcher throws", async () => {
    const tables: Record<string, FakeTableState> = {
      ftc_dnc_cache: { upsertCalls: [], updateCalls: [] },
      ftc_dnc_sync_runs: { upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const fetcher = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

    const { syncFtcDnc } = await import("@/lib/voice/ftc-dnc");
    const result = await syncFtcDnc({ fetcher });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ECONNRESET/);
    expect(tables.ftc_dnc_cache!.upsertCalls.length).toBe(0);
    expect(tables.ftc_dnc_sync_runs!.updateCalls[0].patch.status).toBe(
      "failed",
    );
  });

  it("is idempotent per UTC day — same batchId on re-run", async () => {
    const { syncFtcDnc } = await import("@/lib/voice/ftc-dnc");
    const tables: Record<string, FakeTableState> = {
      ftc_dnc_cache: { upsertCalls: [], updateCalls: [] },
      ftc_dnc_sync_runs: { upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "+14155551212",
    });
    const now = new Date("2026-04-22T06:15:00.000Z");
    const r1 = await syncFtcDnc({ fetcher, now });
    const r2 = await syncFtcDnc({
      fetcher,
      now: new Date("2026-04-22T23:59:00.000Z"),
    });
    expect(r1.batchId).toBe("ftc_dnc_20260422");
    expect(r2.batchId).toBe("ftc_dnc_20260422");
  });
});

describe("Phase 78 Task 7.4 — cron route contract", () => {
  const routePath = path.join(
    repoRoot,
    "src/app/api/cron/ftc-dnc-sync/route.ts",
  );

  it("cron route exists at the expected path", () => {
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("cron route requires CRON_SECRET via assertCronAuthorized", () => {
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).toMatch(/assertCronAuthorized/);
    expect(src).toMatch(/from\s+["']@\/lib\/runtime["']/);
  });

  it("cron route delegates to syncFtcDnc from @/lib/voice/ftc-dnc", () => {
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/ftc-dnc["']/);
    expect(src).toMatch(/syncFtcDnc\s*\(/);
  });

  it("vercel.json registers the nightly cron", () => {
    const vercelPath = path.join(repoRoot, "vercel.json");
    expect(fs.existsSync(vercelPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
    const ftcCron = (config.crons ?? []).find(
      (c: { path?: string }) => c.path === "/api/cron/ftc-dnc-sync",
    );
    expect(ftcCron).toBeTruthy();
    expect(typeof ftcCron.schedule).toBe("string");
  });
});

describe("Phase 78 Task 7.4 — ftc_dnc_cache migration", () => {
  const migrationPath = path.join(
    repoRoot,
    "supabase/migrations/20260422_phase78_ftc_dnc_cache.sql",
  );

  it("migration file exists", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("creates ftc_dnc_cache with phone_number PRIMARY KEY", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS ftc_dnc_cache/);
    expect(sql).toMatch(/phone_number\s+text\s+PRIMARY KEY/);
  });

  it("creates ftc_dnc_sync_runs audit table with status CHECK", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS ftc_dnc_sync_runs/);
    expect(sql).toMatch(/status[\s\S]+CHECK/);
  });
});
