/**
 * Phase 78 / Task 9.1 — CRM incremental sync cursor.
 *
 * Defect (P0-12): `src/app/api/integrations/crm/[provider]/import/route.ts`
 * stores a per-connection pagination cursor that's cleared on completion;
 * the next "incremental" sync re-pulls every record. There is no
 * per-entity watermark.
 *
 * Fix under test:
 *   - Migration `20260422_crm_sync_cursor.sql` adds table
 *     `revenue_operator.crm_sync_cursor(workspace_id, provider, entity,
 *     cursor_at)` with a PK on the triple, a provider/entity CHECK,
 *     and tenant-isolation RLS.
 *   - `src/lib/crm/sync.ts` exposes `extractUpdatedAt`,
 *     `getIncrementalCursor`, `updateIncrementalCursor`, and
 *     `syncContactsIncrementally` which together implement:
 *       * stale-record drop:     pulled records with updated_at <= cursor
 *                                 are filtered out before returning
 *       * cursor advance:         stored cursor moves forward to
 *                                 max(updated_at) observed
 *       * monotonic cursor:       never moves backward
 *
 * Contract tests (no live Postgres) + in-memory db-mock tests cover the
 * contract end-to-end.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260422_crm_sync_cursor.sql",
);
const modulePath = path.join(repoRoot, "src/lib/crm/sync.ts");

// ---------------------------------------------------------------------------
// Migration contract tests (static SQL).
// ---------------------------------------------------------------------------
describe("Phase 78 Task 9.1 — crm_sync_cursor migration", () => {
  it("migration file exists", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("creates crm_sync_cursor with (workspace_id, provider, entity) PK", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(
      /CREATE\s+TABLE[\s\S]+revenue_operator\.crm_sync_cursor/i,
    );
    expect(sql).toMatch(
      /PRIMARY\s+KEY\s*\(\s*workspace_id\s*,\s*provider\s*,\s*entity\s*\)/i,
    );
  });

  it("FK to workspaces(id) ON DELETE CASCADE", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(
      /workspace_id[\s\S]+REFERENCES\s+revenue_operator\.workspaces\s*\(\s*id\s*\)[\s\S]+ON\s+DELETE\s+CASCADE/i,
    );
  });

  it("cursor_at is timestamptz NOT NULL", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/cursor_at\s+timestamptz\s+NOT\s+NULL/i);
  });

  it("CHECK constraint enumerates the supported provider list", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    // At least HubSpot, Salesforce, Pipedrive must be in the allowed set —
    // these are the three the plan calls out explicitly in Task 9.2.
    expect(sql).toMatch(/CHECK\s*\(\s*provider\s+IN\s*\(/i);
    expect(sql).toMatch(/'hubspot'/);
    expect(sql).toMatch(/'salesforce'/);
    expect(sql).toMatch(/'pipedrive'/);
  });

  it("CHECK constraint enumerates the supported entity taxonomy", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/CHECK\s*\(\s*entity\s+IN\s*\(/i);
    expect(sql).toMatch(/'contact'/);
    expect(sql).toMatch(/'deal'/);
  });

  it("enables RLS with a tenant-isolation policy delegating to workspace_owner_check", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+revenue_operator\.crm_sync_cursor\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+crm_sync_cursor_tenant_isolation[\s\S]+workspace_owner_check\s*\(\s*workspace_id\s*\)/i,
    );
  });

  it("DROP POLICY IF EXISTS before CREATE (idempotent re-runs)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+crm_sync_cursor_tenant_isolation/i,
    );
  });

  it("wrapped in BEGIN/COMMIT", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect((sql.match(/^\s*BEGIN\s*;/gim) || []).length).toBe(1);
    expect((sql.match(/^\s*COMMIT\s*;/gim) || []).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Module surface tests (static import).
// ---------------------------------------------------------------------------
describe("Phase 78 Task 9.1 — src/lib/crm/sync.ts module surface", () => {
  it("module file exists", () => {
    expect(fs.existsSync(modulePath)).toBe(true);
  });

  it("exports the documented public surface", () => {
    const src = fs.readFileSync(modulePath, "utf8");
    expect(src).toMatch(/export\s+(async\s+)?function\s+getIncrementalCursor/);
    expect(src).toMatch(/export\s+(async\s+)?function\s+updateIncrementalCursor/);
    expect(src).toMatch(/export\s+function\s+extractUpdatedAt/);
    expect(src).toMatch(/export\s+(async\s+)?function\s+syncContactsIncrementally/);
  });
});

// ---------------------------------------------------------------------------
// extractUpdatedAt — pure-function per-provider field extraction.
// ---------------------------------------------------------------------------
describe("Phase 78 Task 9.1 — extractUpdatedAt", () => {
  it("reads HubSpot's lastmodifieddate (flattened from properties)", async () => {
    const { extractUpdatedAt } = await import("@/lib/crm/sync");
    const d = extractUpdatedAt("hubspot", {
      id: "1",
      lastmodifieddate: "2026-04-22T10:00:00.000Z",
    });
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe("2026-04-22T10:00:00.000Z");
  });

  it("reads Salesforce's LastModifiedDate", async () => {
    const { extractUpdatedAt } = await import("@/lib/crm/sync");
    const d = extractUpdatedAt("salesforce", {
      Id: "0051x",
      LastModifiedDate: "2026-04-20T12:34:56.000Z",
    });
    expect(d!.toISOString()).toBe("2026-04-20T12:34:56.000Z");
  });

  it("reads Pipedrive's update_time", async () => {
    const { extractUpdatedAt } = await import("@/lib/crm/sync");
    const d = extractUpdatedAt("pipedrive", {
      id: 42,
      update_time: "2026-04-22T08:00:00.000Z",
    });
    expect(d!.toISOString()).toBe("2026-04-22T08:00:00.000Z");
  });

  it("reads Copper's date_modified as unix seconds", async () => {
    const { extractUpdatedAt } = await import("@/lib/crm/sync");
    const d = extractUpdatedAt("copper", { id: 1, date_modified: 1713775200 });
    expect(d!.getTime()).toBe(1713775200 * 1000);
  });

  it("returns null for Google Sheets (no per-row updated_at)", async () => {
    const { extractUpdatedAt } = await import("@/lib/crm/sync");
    const d = extractUpdatedAt("google_sheets", { Name: "Alice" });
    expect(d).toBeNull();
  });

  it("returns null when the field is missing", async () => {
    const { extractUpdatedAt } = await import("@/lib/crm/sync");
    expect(extractUpdatedAt("hubspot", { id: "x" })).toBeNull();
  });

  it("returns null when the field isn't a parseable date", async () => {
    const { extractUpdatedAt } = await import("@/lib/crm/sync");
    expect(
      extractUpdatedAt("hubspot", { lastmodifieddate: "not-a-date" }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// In-memory cursor table + mocked fetch — full incremental flow.
// ---------------------------------------------------------------------------

type CursorRow = {
  workspace_id: string;
  provider: string;
  entity: string;
  cursor_at: string;
};
let cursorTable: CursorRow[] = [];

function makeCursorDb() {
  function buildQuery(_table: string) {
    const filters: Array<(r: CursorRow) => boolean> = [];

    const api = {
      eq(col: string, val: unknown) {
        filters.push((r) => (r as unknown as Record<string, unknown>)[col] === val);
        return api;
      },
      select(_cols?: string) {
        return api;
      },
      maybeSingle() {
        const rows = cursorTable.filter((r) => filters.every((f) => f(r)));
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
    };
    return api;
  }

  return {
    from(table: string) {
      return {
        select(_cols?: string) {
          return buildQuery(table);
        },
        upsert(row: CursorRow, _opts?: { onConflict?: string }) {
          const idx = cursorTable.findIndex(
            (r) =>
              r.workspace_id === row.workspace_id &&
              r.provider === row.provider &&
              r.entity === row.entity,
          );
          if (idx >= 0) {
            cursorTable[idx] = { ...cursorTable[idx], ...row };
          } else {
            cursorTable.push({ ...row });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

vi.mock("@/lib/db/queries", () => ({
  getDb: () => makeCursorDb(),
}));

// Stub the HTTP fetcher so pullFromHubSpot returns a scripted batch.
type PullScript = Array<{
  results: Array<{ id: string; properties: Record<string, unknown> }>;
  paging?: { next?: { after: string } };
}>;

let pullScript: PullScript = [];
let pulledCursors: Array<string | null> = [];

beforeEach(() => {
  cursorTable = [];
  pullScript = [];
  pulledCursors = [];
  const realFetch = global.fetch;
  global.fetch = vi.fn(async (url: unknown, _init?: unknown) => {
    const u = String(url);
    const after = new URL(u).searchParams.get("after");
    pulledCursors.push(after);
    const payload = pullScript.shift() ?? { results: [], paging: undefined };
    return {
      ok: true,
      async json() {
        return payload;
      },
    } as unknown as Response;
  }) as unknown as typeof fetch;
  // Restore handle so afterEach can reset cleanly.
  (global as unknown as { __realFetch: typeof fetch }).__realFetch = realFetch;
});

afterEach(() => {
  const real = (global as unknown as { __realFetch?: typeof fetch }).__realFetch;
  if (real) global.fetch = real;
  vi.restoreAllMocks();
});

// Minimal tokens shape for HubSpot (the puller only reads access_token).
const TOKENS = {
  access_token: "test-token",
  refresh_token: null,
  expires_at: null,
  metadata: {},
  instance_url: null,
} as const;

const WS = "00000000-0000-0000-0000-000000000001";

describe("Phase 78 Task 9.1 — syncContactsIncrementally", () => {
  it("first run (no stored cursor): returns all pulled records and advances the cursor", async () => {
    const { syncContactsIncrementally } = await import("@/lib/crm/sync");
    pullScript = [
      {
        results: [
          {
            id: "A",
            properties: { email: "a@x.com", lastmodifieddate: "2026-04-20T00:00:00.000Z" },
          },
          {
            id: "B",
            properties: { email: "b@x.com", lastmodifieddate: "2026-04-21T00:00:00.000Z" },
          },
        ],
      },
    ];

    const result = await syncContactsIncrementally(WS, "hubspot", TOKENS);

    expect(result.records.map((r) => r.externalId)).toEqual(["A", "B"]);
    expect(result.filteredStale).toBe(0);
    expect(result.newCursor).toBeInstanceOf(Date);
    expect(result.newCursor!.toISOString()).toBe("2026-04-21T00:00:00.000Z");

    // Cursor row persisted at max(updated_at).
    expect(cursorTable).toHaveLength(1);
    expect(cursorTable[0].cursor_at).toBe("2026-04-21T00:00:00.000Z");
    expect(cursorTable[0].provider).toBe("hubspot");
    expect(cursorTable[0].entity).toBe("contact");
  });

  it("second run: records with updated_at <= cursor are filtered out", async () => {
    // Pre-seed cursor as if the first run finished at 2026-04-21.
    cursorTable = [
      {
        workspace_id: WS,
        provider: "hubspot",
        entity: "contact",
        cursor_at: "2026-04-21T00:00:00.000Z",
      },
    ];

    const { syncContactsIncrementally } = await import("@/lib/crm/sync");
    pullScript = [
      {
        results: [
          // Stale — equal to cursor; should be dropped (strictly >).
          {
            id: "A",
            properties: { email: "a@x.com", lastmodifieddate: "2026-04-21T00:00:00.000Z" },
          },
          // Stale — before cursor.
          {
            id: "B",
            properties: { email: "b@x.com", lastmodifieddate: "2026-04-20T00:00:00.000Z" },
          },
          // Fresh — after cursor.
          {
            id: "C",
            properties: { email: "c@x.com", lastmodifieddate: "2026-04-22T06:00:00.000Z" },
          },
        ],
      },
    ];

    const result = await syncContactsIncrementally(WS, "hubspot", TOKENS);

    expect(result.records.map((r) => r.externalId)).toEqual(["C"]);
    expect(result.filteredStale).toBe(2);
    expect(result.newCursor!.toISOString()).toBe("2026-04-22T06:00:00.000Z");
    // Cursor advanced.
    expect(cursorTable[0].cursor_at).toBe("2026-04-22T06:00:00.000Z");
  });

  it("empty batch does not move the cursor", async () => {
    cursorTable = [
      {
        workspace_id: WS,
        provider: "hubspot",
        entity: "contact",
        cursor_at: "2026-04-21T00:00:00.000Z",
      },
    ];

    const { syncContactsIncrementally } = await import("@/lib/crm/sync");
    pullScript = [{ results: [] }];

    const result = await syncContactsIncrementally(WS, "hubspot", TOKENS);
    expect(result.records).toEqual([]);
    expect(result.newCursor!.toISOString()).toBe("2026-04-21T00:00:00.000Z");
    // Still the same timestamp — nothing fresher seen.
    expect(cursorTable[0].cursor_at).toBe("2026-04-21T00:00:00.000Z");
  });

  it("cursor is monotonic — never moves backward", async () => {
    cursorTable = [
      {
        workspace_id: WS,
        provider: "hubspot",
        entity: "contact",
        cursor_at: "2026-04-22T00:00:00.000Z",
      },
    ];

    const { updateIncrementalCursor } = await import("@/lib/crm/sync");
    await updateIncrementalCursor(
      WS,
      "hubspot",
      "contact",
      new Date("2026-04-10T00:00:00.000Z"),
    );
    // Unchanged — backward write rejected.
    expect(cursorTable[0].cursor_at).toBe("2026-04-22T00:00:00.000Z");

    await updateIncrementalCursor(
      WS,
      "hubspot",
      "contact",
      new Date("2026-04-23T00:00:00.000Z"),
    );
    expect(cursorTable[0].cursor_at).toBe("2026-04-23T00:00:00.000Z");
  });

  it("paginates across pages and filters consistently on each one", async () => {
    const { syncContactsIncrementally } = await import("@/lib/crm/sync");
    pullScript = [
      {
        results: [
          {
            id: "A",
            properties: { lastmodifieddate: "2026-04-20T00:00:00.000Z" },
          },
        ],
        paging: { next: { after: "P2" } },
      },
      {
        results: [
          {
            id: "B",
            properties: { lastmodifieddate: "2026-04-22T00:00:00.000Z" },
          },
        ],
      },
    ];

    const result = await syncContactsIncrementally(WS, "hubspot", TOKENS, {
      pageLimit: 1,
      maxPages: 5,
    });
    expect(result.pages).toBe(2);
    expect(result.records.map((r) => r.externalId)).toEqual(["A", "B"]);
    expect(pulledCursors).toEqual([null, "P2"]);
    expect(result.newCursor!.toISOString()).toBe("2026-04-22T00:00:00.000Z");
  });

  it("cursorOverride takes precedence over the stored cursor", async () => {
    cursorTable = [
      {
        workspace_id: WS,
        provider: "hubspot",
        entity: "contact",
        cursor_at: "2026-04-21T00:00:00.000Z",
      },
    ];

    const { syncContactsIncrementally } = await import("@/lib/crm/sync");
    pullScript = [
      {
        results: [
          {
            id: "A",
            properties: { lastmodifieddate: "2026-04-21T00:00:00.000Z" },
          },
        ],
      },
    ];

    // Overriding cursor to null means we should accept everything.
    const result = await syncContactsIncrementally(WS, "hubspot", TOKENS, {
      cursorOverride: null,
    });
    expect(result.records.map((r) => r.externalId)).toEqual(["A"]);
    expect(result.filteredStale).toBe(0);
  });

  it("persistCursor:false skips the cursor update (dry run)", async () => {
    const { syncContactsIncrementally } = await import("@/lib/crm/sync");
    pullScript = [
      {
        results: [
          {
            id: "A",
            properties: { lastmodifieddate: "2026-04-22T00:00:00.000Z" },
          },
        ],
      },
    ];

    const result = await syncContactsIncrementally(WS, "hubspot", TOKENS, {
      persistCursor: false,
    });
    expect(result.records).toHaveLength(1);
    expect(cursorTable).toHaveLength(0);
  });
});
