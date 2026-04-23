/**
 * Phase 71 — Observability: logger request-id correlation.
 *
 * Every log line emitted inside an App Router handler must carry the
 * `request_id` set on the request by middleware so an operator can grep one
 * id end-to-end across the app, the voice server, and any background job a
 * handler kicks off.
 *
 * We mock `next/headers` because `headers()` only works inside a real
 * request scope; in vitest we stand it up manually.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type HeaderFake = { get: (k: string) => string | null };
let fakeHeaders: HeaderFake | null = null;

vi.mock("next/headers", () => ({
  headers: async () => {
    if (!fakeHeaders) throw new Error("no request scope");
    return fakeHeaders;
  },
}));

// Import AFTER the mock so the logger's dynamic import picks up the fake.
import { getRequestId, requestLogger, log, withContext } from "@/lib/logger";

describe("logger — X-Request-ID correlation", () => {
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const logged: string[] = [];

  beforeEach(() => {
    logged.length = 0;
    fakeHeaders = null;
    // Capture all three streams into a single list so tests can assert on
    // whatever the level happened to be.
    const cap = (line: unknown) => {
      if (typeof line === "string") logged.push(line);
    };
    console.info = cap;
    console.warn = cap;
    console.error = cap;
  });

  afterEach(() => {
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
  });

  it("getRequestId returns the middleware-set id when inside a request scope", async () => {
    fakeHeaders = { get: (k: string) => (k === "x-request-id" ? "req-abc-123" : null) };
    const rid = await getRequestId();
    expect(rid).toBe("req-abc-123");
  });

  it("getRequestId returns null outside a request scope (e.g., cron / CLI)", async () => {
    fakeHeaders = null; // headers() throws — logger swallows it
    const rid = await getRequestId();
    expect(rid).toBeNull();
  });

  it("requestLogger auto-attaches request_id to every log line", async () => {
    fakeHeaders = { get: (k: string) => (k === "x-request-id" ? "req-xyz-42" : null) };
    const rlog = await requestLogger();
    rlog.info("hello", { step: "handshake" });
    rlog.warn("slow");
    rlog.error("boom", { code: 500 });

    expect(logged).toHaveLength(3);
    for (const line of logged) {
      const parsed = JSON.parse(line);
      expect(parsed.request_id).toBe("req-xyz-42");
    }
  });

  it("requestLogger still works (just without request_id) outside a request scope", async () => {
    fakeHeaders = null;
    const rlog = await requestLogger({ job_id: "job-1" });
    rlog.info("background task");

    expect(logged).toHaveLength(1);
    const parsed = JSON.parse(logged[0] ?? "{}");
    expect(parsed.request_id).toBeUndefined();
    expect(parsed.job_id).toBe("job-1");
    expect(parsed.msg).toBe("background task");
  });

  it("log() preserves structured JSON shape — ts, level, msg", () => {
    log("info", "ping", { route: "/api/ping" });
    const parsed = JSON.parse(logged[0] ?? "{}");
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("ping");
    expect(parsed.route).toBe("/api/ping");
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("log() redacts sensitive keys in meta so tokens never hit stdout", () => {
    log("warn", "config dump", {
      api_key: "sk_live_abc123",
      authorization: "Bearer xyz",
      safe_field: "ok",
    });
    const parsed = JSON.parse(logged[0] ?? "{}");
    expect(parsed.api_key).toBe("[REDACTED]");
    expect(parsed.authorization).toBe("[REDACTED]");
    expect(parsed.safe_field).toBe("ok");
  });

  it("withContext threads request_id and job_id through without a request scope", () => {
    const ctx = withContext("rid-1", "job-9");
    ctx.info("tick", { step: 2 });
    const parsed = JSON.parse(logged[0] ?? "{}");
    expect(parsed.request_id).toBe("rid-1");
    expect(parsed.job_id).toBe("job-9");
    expect(parsed.step).toBe(2);
  });
});
