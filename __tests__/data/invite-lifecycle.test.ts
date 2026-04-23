/**
 * Phase 78 / Task 8.2 — workspace_invites lifecycle.
 *
 * Covers:
 *   (a) migration is present and applies the required hardening (FK,
 *       role CHECK, expires_at default + NOT NULL, unique partial
 *       index, RLS + tenant policy).
 *   (b) accept route uses an ATOMIC UPDATE…RETURNING — the second
 *       attempt against the same invite returns "already_accepted",
 *       NOT ok, because the first attempt already transitioned
 *       `accepted_at` from NULL to a timestamp so the guarded UPDATE
 *       matches no rows on the second call.
 *   (c) an expired invite is rejected (the `expires_at > now` gate in
 *       the UPDATE filter drops it).
 *   (d) role propagates from invite to workspace_roles on accept.
 *
 * We can't run Postgres in this sandbox so the route-level tests use
 * an in-memory fake DB that honors the PostgREST-like chain used in
 * the accept route.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260422_workspace_invites_hardening.sql",
);
const routePath = path.join(
  repoRoot,
  "src/app/api/invite/accept/route.ts",
);

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Migration contract tests (static SQL text).
// ---------------------------------------------------------------------------
describe("Phase 78 Task 8.2 — workspace_invites hardening migration", () => {
  it("migration file exists", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("adds FK on workspace_id referencing workspaces(id) ON DELETE CASCADE", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/FOREIGN KEY\s*\(\s*workspace_id\s*\)/i);
    expect(sql).toMatch(
      /REFERENCES\s+revenue_operator\.workspaces\s*\(\s*id\s*\)/i,
    );
    expect(sql).toMatch(/ON\s+DELETE\s+CASCADE/i);
  });

  it("adds the FK with NOT VALID then VALIDATE (non-blocking)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/NOT VALID/i);
    expect(sql).toMatch(/VALIDATE\s+CONSTRAINT\s+workspace_invites_workspace_id_fkey/i);
  });

  it("adds a role CHECK constraint", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(
      /CHECK\s*\(\s*role\s+IN\s*\([^)]+\)\s*\)/i,
    );
  });

  it("sets expires_at DEFAULT now()+14 days and NOT NULL", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/ALTER\s+COLUMN\s+expires_at\s+SET\s+DEFAULT/i);
    expect(sql).toMatch(/INTERVAL\s+'14\s+days'/i);
    expect(sql).toMatch(/ALTER\s+COLUMN\s+expires_at\s+SET\s+NOT\s+NULL/i);
  });

  it("backfills NULL expires_at BEFORE SET NOT NULL (otherwise ALTER fails)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    const backfillIdx = sql.search(
      /UPDATE\s+revenue_operator\.workspace_invites\s+SET\s+expires_at/i,
    );
    const notNullIdx = sql.search(
      /ALTER\s+COLUMN\s+expires_at\s+SET\s+NOT\s+NULL/i,
    );
    expect(backfillIdx).toBeGreaterThan(-1);
    expect(notNullIdx).toBeGreaterThan(-1);
    expect(backfillIdx).toBeLessThan(notNullIdx);
  });

  it("adds UNIQUE partial index on (workspace_id, lower(email)) where not accepted", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(
      /CREATE\s+UNIQUE\s+INDEX[\s\S]+workspace_invites[\s\S]+workspace_id[\s\S]+lower\s*\(\s*email\s*\)/i,
    );
    expect(sql).toMatch(/WHERE[\s\S]+accepted_at\s+IS\s+NULL/i);
  });

  it("enables RLS and creates a tenant-isolation policy", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(
      /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(sql).toMatch(/CREATE\s+POLICY\s+invites_tenant_isolation/i);
    expect(sql).toMatch(/workspace_roles[\s\S]+auth\.uid/i);
  });
});

// ---------------------------------------------------------------------------
// Route-level accept tests (atomic UPDATE…RETURNING contract).
// ---------------------------------------------------------------------------

/**
 * Minimal in-memory fake of the PostgREST chain used by the accept
 * route: UPDATE(patch).eq().is().eq().gt().select().maybeSingle().
 * Also supports SELECT().eq().maybeSingle() and INSERT().
 */
function makeFakeDb(initial: { workspace_invites: Row[]; workspaces: Row[]; users: Row[] }) {
  const tables: Record<string, Row[]> = {
    workspace_invites: [...initial.workspace_invites],
    workspaces: [...initial.workspaces],
    users: [...initial.users],
    workspace_roles: [],
    team_members: [],
  };

  function buildQuery(table: string, op: "select" | "update", patch?: Row) {
    const filters: Array<(r: Row) => boolean> = [];
    let selectMode = op === "select";

    const api = {
      eq(col: string, val: unknown) {
        filters.push((r) => r[col] === val);
        return api;
      },
      is(col: string, val: unknown) {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val));
        return api;
      },
      gt(col: string, val: unknown) {
        filters.push((r) => {
          const rv = r[col];
          if (rv == null) return false;
          return String(rv) > String(val);
        });
        return api;
      },
      select(_cols?: string) {
        selectMode = true;
        return api;
      },
      maybeSingle() {
        const rows = tables[table].filter((r) => filters.every((f) => f(r)));
        if (op === "update" && patch) {
          if (rows.length === 0) {
            return Promise.resolve({ data: null, error: null });
          }
          Object.assign(rows[0], patch);
          return Promise.resolve({ data: selectMode ? rows[0] : null, error: null });
        }
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
    };
    return api;
  }

  return {
    _tables: tables,
    from(table: string) {
      return {
        select(_cols?: string) {
          return buildQuery(table, "select");
        },
        update(patch: Row) {
          return buildQuery(table, "update", patch);
        },
        insert(row: Row) {
          tables[table] ??= [];
          tables[table].push({ ...row });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

let currentFakeDb: ReturnType<typeof makeFakeDb> | null = null;

vi.mock("@/lib/db/queries", () => ({
  getDb: () => currentFakeDb,
}));
vi.mock("@/lib/auth/request-session", () => ({
  getSession: () =>
    Promise.resolve({ userId: "00000000-0000-0000-0000-000000000001" }),
}));
vi.mock("@/lib/http/csrf", () => ({
  assertSameOrigin: () => null,
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  currentFakeDb = null;
});

function makeReq(body: unknown) {
  return {
    json: async () => body,
  } as unknown as Request;
}

describe("Phase 78 Task 8.2 — accept route atomic claim", () => {
  it("accepts a pending invite exactly once (first call succeeds)", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    currentFakeDb = makeFakeDb({
      workspace_invites: [
        {
          id: "inv-1",
          workspace_id: "ws-1",
          email: "invitee@example.com",
          role: "operator",
          status: "pending",
          expires_at: future,
          accepted_at: null,
          invite_token: "tok-alpha",
        },
      ],
      workspaces: [{ id: "ws-1", name: "Acme Sales" }],
      users: [{ id: "00000000-0000-0000-0000-000000000001", email: "u@example.com" }],
    });
    const { POST } = await import("@/app/api/invite/accept/route");
    const res = await POST(makeReq({ token: "tok-alpha" }) as never);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.redirectUrl).toContain("welcome=");
    const invite = currentFakeDb!._tables.workspace_invites[0];
    expect(invite.accepted_at).toBeTruthy();
    expect(invite.accepted_by).toBe("00000000-0000-0000-0000-000000000001");
    expect(invite.status).toBe("accepted");
    expect(currentFakeDb!._tables.workspace_roles.length).toBe(1);
    expect(currentFakeDb!._tables.workspace_roles[0]).toMatchObject({
      workspace_id: "ws-1",
      role: "operator",
    });
  });

  it("refuses a SECOND accept of the same invite with already_accepted", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    currentFakeDb = makeFakeDb({
      workspace_invites: [
        {
          id: "inv-2",
          workspace_id: "ws-1",
          email: "invitee@example.com",
          role: "operator",
          status: "pending",
          expires_at: future,
          accepted_at: null,
          invite_token: "tok-beta",
        },
      ],
      workspaces: [{ id: "ws-1", name: "Acme Sales" }],
      users: [{ id: "00000000-0000-0000-0000-000000000001", email: "u@example.com" }],
    });
    const { POST } = await import("@/app/api/invite/accept/route");

    const first = await POST(makeReq({ token: "tok-beta" }) as never);
    expect((await first.json()).ok).toBe(true);

    const second = await POST(makeReq({ token: "tok-beta" }) as never);
    const body = await second.json();
    expect(body.ok).toBeUndefined();
    expect(body.error).toBe("already_accepted");
    // Invariant: the second accept must NOT create a duplicate role row.
    expect(currentFakeDb!._tables.workspace_roles.length).toBe(1);
  });

  it("rejects an expired invite without flipping accepted_at", async () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    currentFakeDb = makeFakeDb({
      workspace_invites: [
        {
          id: "inv-3",
          workspace_id: "ws-1",
          email: "invitee@example.com",
          role: "operator",
          status: "pending",
          expires_at: past,
          accepted_at: null,
          invite_token: "tok-expired",
        },
      ],
      workspaces: [{ id: "ws-1", name: "Acme Sales" }],
      users: [{ id: "00000000-0000-0000-0000-000000000001", email: "u@example.com" }],
    });
    const { POST } = await import("@/app/api/invite/accept/route");
    const res = await POST(makeReq({ token: "tok-expired" }) as never);
    const body = await res.json();
    expect(body.error).toBe("expired");
    const invite = currentFakeDb!._tables.workspace_invites[0];
    expect(invite.accepted_at).toBeNull();
    expect(currentFakeDb!._tables.workspace_roles.length).toBe(0);
  });

  it("returns invalid for an unknown token", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    currentFakeDb = makeFakeDb({
      workspace_invites: [
        {
          id: "inv-4",
          workspace_id: "ws-1",
          email: "x@example.com",
          role: "operator",
          status: "pending",
          expires_at: future,
          accepted_at: null,
          invite_token: "tok-real",
        },
      ],
      workspaces: [{ id: "ws-1", name: "Acme" }],
      users: [{ id: "00000000-0000-0000-0000-000000000001", email: "u@example.com" }],
    });
    const { POST } = await import("@/app/api/invite/accept/route");
    const res = await POST(makeReq({ token: "tok-not-a-token" }) as never);
    const body = await res.json();
    expect(body.error).toBe("invalid");
  });

  it("propagates the invite role onto the new workspace_roles row (admin)", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    currentFakeDb = makeFakeDb({
      workspace_invites: [
        {
          id: "inv-5",
          workspace_id: "ws-1",
          email: "admin-invitee@example.com",
          role: "admin",
          status: "pending",
          expires_at: future,
          accepted_at: null,
          invite_token: "tok-admin",
        },
      ],
      workspaces: [{ id: "ws-1", name: "Acme" }],
      users: [{ id: "00000000-0000-0000-0000-000000000001", email: "u@example.com" }],
    });
    const { POST } = await import("@/app/api/invite/accept/route");
    await POST(makeReq({ token: "tok-admin" }) as never);
    expect(currentFakeDb!._tables.workspace_roles[0]).toMatchObject({
      workspace_id: "ws-1",
      role: "admin",
    });
  });

  it("static-text guard: accept route uses atomic gate chain and RETURNING select", () => {
    const src = fs.readFileSync(routePath, "utf8");
    // The essential atomic pattern — an UPDATE with all four gates
    // (token, accepted_at IS NULL, status pending, expires_at > now)
    // AND a chained .select() to get RETURNING. Miss any one of these
    // and we slip back into the old TOCTOU pattern.
    expect(src).toMatch(/\.update\s*\(\s*\{[\s\S]+accepted_at[\s\S]+\}\s*\)/);
    expect(src).toMatch(/\.eq\(\s*["']invite_token["']/);
    expect(src).toMatch(/\.is\(\s*["']accepted_at["']\s*,\s*null\s*\)/);
    expect(src).toMatch(/\.gt\(\s*["']expires_at["']/);
    expect(src).toMatch(/\.select\s*\(\s*["'][^"']*workspace_id[^"']*["']\s*\)/);
  });
});
