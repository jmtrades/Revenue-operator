/**
 * Phase 78 / Task 7.3 — Unified DNC helper test.
 *
 * The helper `@/lib/voice/dnc.ts` is the single write/read path for DNC
 * entries going forward. It targets `dnc_entries(phone_number)` — the
 * unified table introduced by
 * `supabase/migrations/20260422_phase78_dnc_unify.sql`.
 *
 * Coverage:
 *   1. `addDncEntry` upserts with `phone_number` column + E.164 normalization.
 *   2. `addDncEntry` rejects bad phone inputs with `ok: false`.
 *   3. `isDncSuppressed` returns true when `dnc_entries` has a match.
 *   4. `isDncSuppressed` returns true on FTC fallback when workspace is clean.
 *   5. `isDncSuppressed` returns false when neither table matches.
 *   6. `removeDncEntry` deletes by (workspace_id, phone_number).
 *   7. Call-site migration — consent-revocation / SMS-revocation / wrong-number
 *      / dnc-check / dnc API route all import from `@/lib/voice/dnc`.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");

// ---- Minimal supabase-ish query-builder stub ----------------------------
//
// Records upserts / updates / deletes per table; returns pre-staged select
// results. The shape matches what `@/lib/voice/dnc.ts` uses:
//   db.from(t).select().eq().eq().limit().maybeSingle()   // isDncSuppressed
//   db.from(t).upsert(row, {onConflict}).select().maybeSingle()  // addDncEntry
//   db.from(t).delete().eq().eq()                          // removeDncEntry

type Row = Record<string, unknown>;

interface FakeTableState {
  selectResult?: Row | null;
  upsertCalls: Array<{ row: Row; opts?: Record<string, unknown> }>;
  deleteCalls: Array<{ eqs: Array<[string, unknown]> }>;
}

function makeFakeDb(tables: Record<string, FakeTableState>) {
  return {
    from(table: string) {
      const state =
        tables[table] ??
        (tables[table] = { upsertCalls: [], deleteCalls: [] });

      const selectBuilder = {
        _eqs: [] as Array<[string, unknown]>,
        eq(_col: string, _val: unknown) {
          this._eqs.push([_col, _val]);
          return this;
        },
        in(_col: string, _vals: unknown[]) {
          return this;
        },
        is(_col: string, _val: unknown) {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({
            data: state.selectResult ?? null,
            error: null,
          });
        },
        then(resolve: (v: { data: Row[] | null; error: null }) => void) {
          // For builders that resolve without .maybeSingle().
          const arr = state.selectResult ? [state.selectResult] : [];
          resolve({ data: arr, error: null });
        },
      };

      return {
        select(_cols?: string) {
          return selectBuilder;
        },
        upsert(row: Row, opts?: Record<string, unknown>) {
          state.upsertCalls.push({ row, opts });
          return {
            select: (_cols?: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: "dnc-entry-uuid-1" },
                  error: null,
                }),
            }),
            then: (
              resolve: (v: { data: null; error: null }) => void,
            ) => resolve({ data: null, error: null }),
          };
        },
        delete() {
          const call = { eqs: [] as Array<[string, unknown]> };
          state.deleteCalls.push(call);
          return {
            eq(col: string, val: unknown) {
              call.eqs.push([col, val]);
              return this;
            },
            then(resolve: (v: { data: null; error: null }) => void) {
              resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };
}

// ---- Shared mock state -------------------------------------------------

vi.mock("@/lib/db/queries", () => ({
  getDb: () => currentFakeDb,
}));

let currentFakeDb: ReturnType<typeof makeFakeDb> | null = null;

beforeEach(() => {
  currentFakeDb = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Tests -------------------------------------------------------------

describe("Phase 78 Task 7.3 — addDncEntry", () => {
  it("upserts into dnc_entries with phone_number column + normalized E.164", async () => {
    const tables: Record<string, FakeTableState> = {
      dnc_entries: { upsertCalls: [], deleteCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const { addDncEntry } = await import("@/lib/voice/dnc");
    const result = await addDncEntry({
      workspaceId: "ws-1",
      phone: "(415) 555-1234", // loose input must normalize to +14155551234
      reason: "stop_keyword",
      source: "sms_stop",
    });

    expect(result.ok).toBe(true);
    expect(result.id).toBe("dnc-entry-uuid-1");
    expect(tables.dnc_entries!.upsertCalls).toHaveLength(1);

    const { row, opts } = tables.dnc_entries!.upsertCalls[0];
    expect(row.workspace_id).toBe("ws-1");
    expect(row.phone_number).toBe("+14155551234");
    expect(row.reason).toBe("stop_keyword");
    expect(row.source).toBe("sms_stop");
    expect(opts).toEqual({ onConflict: "workspace_id,phone_number" });
  });

  it("returns ok:false on un-normalizable phone input", async () => {
    currentFakeDb = makeFakeDb({});
    const { addDncEntry } = await import("@/lib/voice/dnc");
    const result = await addDncEntry({
      workspaceId: "ws-1",
      phone: "not-a-phone",
      reason: "manual",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/normalized|E\.164|phone/i);
  });
});

describe("Phase 78 Task 7.3 — isDncSuppressed", () => {
  it("returns true when dnc_entries has a workspace match", async () => {
    const tables: Record<string, FakeTableState> = {
      dnc_entries: {
        selectResult: { id: "dnc-1" },
        upsertCalls: [],
        deleteCalls: [],
      },
      ftc_dnc_cache: {
        selectResult: null,
        upsertCalls: [],
        deleteCalls: [],
      },
    };
    currentFakeDb = makeFakeDb(tables);

    const { isDncSuppressed } = await import("@/lib/voice/dnc");
    const suppressed = await isDncSuppressed("ws-1", "+14155551234");
    expect(suppressed).toBe(true);
  });

  it("returns true on FTC fallback when workspace is clean", async () => {
    const tables: Record<string, FakeTableState> = {
      dnc_entries: {
        selectResult: null,
        upsertCalls: [],
        deleteCalls: [],
      },
      ftc_dnc_cache: {
        selectResult: { id: "ftc-1" },
        upsertCalls: [],
        deleteCalls: [],
      },
    };
    currentFakeDb = makeFakeDb(tables);

    const { isDncSuppressed } = await import("@/lib/voice/dnc");
    const suppressed = await isDncSuppressed("ws-1", "+14155551234");
    expect(suppressed).toBe(true);
  });

  it("returns false when neither table matches", async () => {
    const tables: Record<string, FakeTableState> = {
      dnc_entries: {
        selectResult: null,
        upsertCalls: [],
        deleteCalls: [],
      },
      ftc_dnc_cache: {
        selectResult: null,
        upsertCalls: [],
        deleteCalls: [],
      },
    };
    currentFakeDb = makeFakeDb(tables);

    const { isDncSuppressed } = await import("@/lib/voice/dnc");
    const suppressed = await isDncSuppressed("ws-1", "+14155551234");
    expect(suppressed).toBe(false);
  });

  it("returns false (fail-open) on bad phone input — caller-level guards catch it", async () => {
    currentFakeDb = makeFakeDb({
      dnc_entries: { upsertCalls: [], deleteCalls: [] },
    });
    const { isDncSuppressed } = await import("@/lib/voice/dnc");
    const suppressed = await isDncSuppressed("ws-1", "not-a-phone");
    // Fail-open for the canonical helper — the dialer's defense-in-depth
    // check in `@/lib/compliance/dnc-check.ts` fails CLOSED, which is the
    // final safety net.
    expect(suppressed).toBe(false);
  });
});

describe("Phase 78 Task 7.3 — removeDncEntry", () => {
  it("deletes by (workspace_id, phone_number)", async () => {
    const tables: Record<string, FakeTableState> = {
      dnc_entries: { upsertCalls: [], deleteCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const { removeDncEntry } = await import("@/lib/voice/dnc");
    const result = await removeDncEntry("ws-1", "+14155551234");

    expect(result.ok).toBe(true);
    expect(tables.dnc_entries!.deleteCalls).toHaveLength(1);
    const eqs = tables.dnc_entries!.deleteCalls[0].eqs;
    expect(eqs).toContainEqual(["workspace_id", "ws-1"]);
    expect(eqs).toContainEqual(["phone_number", "+14155551234"]);
  });
});

describe("Phase 78 Task 7.3 — call-site migration", () => {
  function read(relPath: string): string {
    return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
  }

  it("dnc-check.ts uses the unified voice/dnc helper", () => {
    const src = read("src/lib/compliance/dnc-check.ts");
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/dnc["']/);
    // Legacy table name must no longer be read in this file's data path.
    // (We still allow the word to appear in comments; we only gate against
    // fresh table lookups like `.from("dnc_list"` inside the source.)
    expect(src).not.toMatch(/\.from\s*\(\s*["']dnc_list["']/);
  });

  it("consent-revocation.ts uses the unified helper (not a direct dnc_list upsert)", () => {
    const src = read("src/lib/compliance/consent-revocation.ts");
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/dnc["']/);
    expect(src).not.toMatch(/\.from\s*\(\s*["']dnc_list["']/);
  });

  it("voice/revocation.ts (SMS STOP hangup) uses the unified helper", () => {
    const src = read("src/lib/voice/revocation.ts");
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/dnc["']/);
    expect(src).not.toMatch(/\.from\s*\(\s*["']dnc_list["']/);
  });

  it("wrong-number.ts uses the unified helper for its DNC fallback", () => {
    const src = read("src/lib/compliance/wrong-number.ts");
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/dnc["']/);
    expect(src).not.toMatch(/\.from\s*\(\s*["']dnc_list["']/);
  });

  it("/api/dnc route targets dnc_entries, not dnc_list", () => {
    const src = read("src/app/api/dnc/route.ts");
    expect(src).toMatch(/\.from\s*\(\s*["']dnc_entries["']/);
    expect(src).not.toMatch(/\.from\s*\(\s*["']dnc_list["']/);
  });
});
