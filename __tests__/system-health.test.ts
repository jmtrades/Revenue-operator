/**
 * Contract tests for GET /api/system/health
 * Public endpoint: exact keys, booleans only, safe defaults on failure.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHeartbeats: Record<string, string | undefined> = {};
let dbLimitReturnsError = false;

vi.mock("@/lib/runtime/cron-heartbeat", () => ({
  getCronHeartbeats: vi.fn(() => Promise.resolve(mockHeartbeats)),
}));

vi.mock("@/lib/db/queries", () => ({
  getDb: vi.fn(() => ({
    from: () => ({
      select: () => ({
        limit: () =>
          Promise.resolve(
            dbLimitReturnsError ? { error: new Error("db unavailable") } : { error: null }
          ),
      }),
    }),
  })),
}));

describe("GET /api/system/health", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    dbLimitReturnsError = false;
    mockHeartbeats["core"] = new Date().toISOString();
    const mod = await import("@/lib/runtime/cron-heartbeat");
    vi.mocked(mod.getCronHeartbeats).mockResolvedValue({ core: new Date().toISOString() });
  });

  it("returns 200 with exact keys: ok, core_recent, db_reachable, public_corridor_ok", async () => {
    const { GET } = await import("@/app/api/system/health/route");
    const res = await GET(new Request("http://localhost/api/system/health"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Object.keys(data).sort()).toEqual(["core_recent", "db_reachable", "ok", "public_corridor_ok"]);
  });

  it("returns only boolean values for all keys", async () => {
    const { GET } = await import("@/app/api/system/health/route");
    const res = await GET(new Request("http://localhost/api/system/health"));
    const data = await res.json();

    expect(typeof data.ok).toBe("boolean");
    expect(typeof data.core_recent).toBe("boolean");
    expect(typeof data.db_reachable).toBe("boolean");
    expect(typeof data.public_corridor_ok).toBe("boolean");
  });

  it("returns ok true when core is recent and db is reachable", async () => {
    const { GET } = await import("@/app/api/system/health/route");
    const res = await GET(new Request("http://localhost/api/system/health"));
    const data = await res.json();

    expect(data.core_recent).toBe(true);
    expect(data.db_reachable).toBe(true);
    expect(data.public_corridor_ok).toBe(true);
    expect(data.ok).toBe(true);
  });

  it("returns safe defaults (all false) when db fails", async () => {
    dbLimitReturnsError = true;

    const { GET } = await import("@/app/api/system/health/route");
    const res = await GET(new Request("http://localhost/api/system/health"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(false);
    expect(data.db_reachable).toBe(false);
    expect(typeof data.core_recent).toBe("boolean");
    expect(typeof data.public_corridor_ok).toBe("boolean");
  });

  it("returns no stack traces or internal ids", async () => {
    const { GET } = await import("@/app/api/system/health/route");
    const res = await GET(new Request("http://localhost/api/system/health"));
    const text = await res.text();

    expect(text).not.toMatch(/at\s+\S+\s+\(/);
    expect(text).not.toMatch(/\b[0-9a-f-]{36}\b/i);
  });
});
