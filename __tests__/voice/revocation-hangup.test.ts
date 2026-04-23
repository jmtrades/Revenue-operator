/**
 * Phase 78 / Task 7.2 — STOP keyword hangs up active call.
 *
 * Prior to this task, when a recipient replied STOP to an SMS while an
 * outbound call was still in-flight, the SMS webhook marked the lead
 * opted-out but the Twilio call kept running until it naturally ended.
 * TCPA requires *immediate* cessation upon revocation — the window between
 * STOP and natural call-end is a live wiretap + TCPA violation.
 *
 * `revokeAndHangup(workspaceId, phone)` closes that gap:
 *   1. Inserts a DNC row (fail-safe: unknown keeps blocking forward outreach).
 *   2. Finds every open `call_sessions` row for that phone in the workspace.
 *   3. Issues a Twilio REST hangup
 *      (POST /Accounts/{sid}/Calls/{sid}.json with Status=completed).
 *   4. Stamps call_ended_at on the session.
 *
 * This suite pins that contract with a mocked `getDb` and a stubbed
 * global fetch; it asserts both the Twilio REST call and the downstream
 * session update happen, and that the SMS route invokes the helper
 * inside the STOP branch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");

// ---- Minimal supabase-ish query-builder stub ----------------------------
//
// The modules under test call:
//   db.from("leads").select("id, workspace_id").eq("workspace_id", ws).eq("phone", p)
//   db.from("call_sessions").select("...").in("lead_id", [...]).is("call_ended_at", null)
//   db.from("dnc_entries").upsert(...)
//   db.from("call_sessions").update({...}).eq("id", sid)
//
// We only need a tiny thenable-chain mock that records calls and returns
// the data we pre-stage for the given .from() table name.

type Row = Record<string, unknown>;

interface FakeTableState {
  selectResult?: Row[];
  upsertCalls: Row[];
  updateCalls: Array<{ patch: Row; eqs: Array<[string, unknown]> }>;
}

function makeFakeDb(tables: Record<string, FakeTableState>) {
  return {
    from(table: string) {
      const state = tables[table] ?? {
        selectResult: [],
        upsertCalls: [],
        updateCalls: [],
      };
      tables[table] = state;

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
            data: state.selectResult?.[0] ?? null,
            error: null,
          });
        },
        then(resolve: (v: { data: Row[] | null; error: null }) => void) {
          resolve({ data: state.selectResult ?? [], error: null });
        },
      };

      return {
        select(_cols?: string) {
          return selectBuilder;
        },
        upsert(row: Row, _opts?: Record<string, unknown>) {
          state.upsertCalls.push(row);
          return {
            select: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: "dnc-id-1" }, error: null }),
            }),
          };
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

// ---- Mock the db module at import-time ----------------------------------
vi.mock("@/lib/db/queries", () => ({
  getDb: () => currentFakeDb,
}));

// Shared, swapped-per-test.
let currentFakeDb: ReturnType<typeof makeFakeDb> | null = null;

beforeEach(() => {
  // Default Twilio creds so the code path that checks them passes.
  process.env.TWILIO_ACCOUNT_SID = "ACtest000000000000000000000000000";
  process.env.TWILIO_AUTH_TOKEN = "testtoken";
});

afterEach(() => {
  vi.restoreAllMocks();
  currentFakeDb = null;
});

describe("Phase 78 Task 7.2 — revokeAndHangup", () => {
  it("issues a Twilio REST hangup for an open call_session matching the phone", async () => {
    const tables: Record<string, FakeTableState> = {
      leads: {
        selectResult: [
          { id: "lead-1", workspace_id: "ws-1", phone: "+15551234567" },
        ],
        upsertCalls: [],
        updateCalls: [],
      },
      call_sessions: {
        selectResult: [
          {
            id: "sess-1",
            external_meeting_id: "CA1234567890abcdef1234567890abcd",
            lead_id: "lead-1",
            call_started_at: "2026-04-22T00:00:00.000Z",
            call_ended_at: null,
          },
        ],
        upsertCalls: [],
        updateCalls: [],
      },
      // Phase 78 / Task 7.3 — DNC writes now land on the unified
      // `dnc_entries(phone_number)` table via `@/lib/voice/dnc`.
      dnc_entries: { selectResult: [], upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sid: "CA1234567890abcdef1234567890abcd", status: "completed" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { revokeAndHangup } = await import("@/lib/voice/revocation");
    const result = await revokeAndHangup("ws-1", "+15551234567");

    expect(result.ok).toBe(true);
    expect(result.hungUpCallSids).toContain("CA1234567890abcdef1234567890abcd");

    // Twilio REST hangup was POSTed.
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(
      /api\.twilio\.com\/2010-04-01\/Accounts\/ACtest[^/]+\/Calls\/CA1234567890abcdef1234567890abcd\.json/,
    );
    expect(init.method).toBe("POST");
    // Basic auth header present
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("Authorization")).toMatch(/^Basic /);
    // Body carries Status=completed
    const body = typeof init.body === "string" ? init.body : "";
    expect(body).toMatch(/Status=completed/);

    // DNC was upserted into the unified `dnc_entries` table.
    expect(tables.dnc_entries!.upsertCalls.length).toBe(1);
    const dncRow = tables.dnc_entries!.upsertCalls[0];
    expect(dncRow.workspace_id).toBe("ws-1");
    // Either schema column name (phone vs phone_number) is acceptable so long
    // as it carries the normalized number.
    expect(
      dncRow.phone === "+15551234567" || dncRow.phone_number === "+15551234567"
        ? true
        : false,
    ).toBe(true);

    // call_sessions row was stamped with call_ended_at.
    const sessUpdate = tables.call_sessions!.updateCalls.find((u) =>
      u.eqs.some(([c, v]) => c === "id" && v === "sess-1"),
    );
    expect(sessUpdate).toBeTruthy();
    expect(sessUpdate?.patch.call_ended_at).toBeTruthy();
    expect(sessUpdate?.patch.outcome).toBe("revoked");
  });

  it("is a no-op for Twilio hangup when there are no open call_sessions", async () => {
    const tables: Record<string, FakeTableState> = {
      leads: {
        selectResult: [
          { id: "lead-2", workspace_id: "ws-1", phone: "+15557654321" },
        ],
        upsertCalls: [],
        updateCalls: [],
      },
      call_sessions: { selectResult: [], upsertCalls: [], updateCalls: [] },
      // Phase 78 / Task 7.3 — DNC writes now land on the unified
      // `dnc_entries(phone_number)` table via `@/lib/voice/dnc`.
      dnc_entries: { selectResult: [], upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { revokeAndHangup } = await import("@/lib/voice/revocation");
    const result = await revokeAndHangup("ws-1", "+15557654321");

    expect(result.ok).toBe(true);
    expect(result.hungUpCallSids).toEqual([]);
    // Twilio REST was not called — no active calls to hang up.
    expect(fetchMock).not.toHaveBeenCalled();
    // DNC was still upserted.
    expect(tables.dnc_entries!.upsertCalls.length).toBe(1);
  });

  it("fails SAFE: returns ok=true on Twilio hangup error (DNC still persists)", async () => {
    // Rationale: the DNC insert and session-end stamp are the compliance
    // evidence. A Twilio REST failure is logged, but we must not abort the
    // whole revocation — future outreach is still blocked.
    const tables: Record<string, FakeTableState> = {
      leads: {
        selectResult: [
          { id: "lead-3", workspace_id: "ws-1", phone: "+15550000001" },
        ],
        upsertCalls: [],
        updateCalls: [],
      },
      call_sessions: {
        selectResult: [
          {
            id: "sess-2",
            external_meeting_id: "CAfailfailfailfailfailfailfailfail",
            lead_id: "lead-3",
            call_started_at: "2026-04-22T00:00:00.000Z",
            call_ended_at: null,
          },
        ],
        upsertCalls: [],
        updateCalls: [],
      },
      // Phase 78 / Task 7.3 — DNC writes now land on the unified
      // `dnc_entries(phone_number)` table via `@/lib/voice/dnc`.
      dnc_entries: { selectResult: [], upsertCalls: [], updateCalls: [] },
    };
    currentFakeDb = makeFakeDb(tables);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Twilio exploded" }),
      text: async () => "Twilio exploded",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { revokeAndHangup } = await import("@/lib/voice/revocation");
    const result = await revokeAndHangup("ws-1", "+15550000001");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // DNC still persisted.
    expect(tables.dnc_entries!.upsertCalls.length).toBe(1);
  });
});

describe("Phase 78 Task 7.2 — SMS STOP handler wires revokeAndHangup", () => {
  it("sms webhook route imports revokeAndHangup from voice/revocation", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/webhooks/twilio/sms/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/revocation["']/);
    expect(src).toMatch(/revokeAndHangup/);
  });

  it("sms webhook route calls revokeAndHangup inside the STOP branch", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/webhooks/twilio/sms/route.ts"),
      "utf8",
    );
    // STOP branch is gated on `STOP_WORDS.has(...)` — the hangup call must
    // be inside that block. We assert the helper is invoked in the file and
    // that the relevant region between the STOP check and the end of its
    // early-return contains it.
    const stopIdx = src.indexOf("STOP_WORDS.has(");
    expect(stopIdx).toBeGreaterThan(-1);
    // The STOP branch ends with the CTIA confirmation response.
    const stopEndIdx = src.indexOf(
      "You have been unsubscribed",
      stopIdx,
    );
    expect(stopEndIdx).toBeGreaterThan(stopIdx);
    const region = src.slice(stopIdx, stopEndIdx);
    expect(region).toMatch(/revokeAndHangup\s*\(/);
  });
});
