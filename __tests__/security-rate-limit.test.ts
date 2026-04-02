/**
 * Tests for src/lib/security/rate-limit.ts
 * Structural tests for rate limit configs and unit tests for hashIpForPublicRecord.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { hashIpForPublicRecord } from "@/lib/security/rate-limit";

const SRC = readFileSync(
  path.resolve(__dirname, "..", "src", "lib", "security", "rate-limit.ts"),
  "utf-8",
);

/* ------------------------------------------------------------------ */
/*  Structural tests — rate limit configurations                       */
/* ------------------------------------------------------------------ */

describe("rate-limit.ts structural: inbound webhook config", () => {
  it("has inbound limit of 100 requests", () => {
    expect(SRC).toContain("INBOUND_LIMIT = 100");
  });

  it("has inbound window of 60 seconds", () => {
    expect(SRC).toContain("INBOUND_WINDOW_SEC = 60");
  });
});

describe("rate-limit.ts structural: outbound message config", () => {
  it("has outbound limit of 5 per lead", () => {
    expect(SRC).toContain("OUTBOUND_LIMIT_PER_LEAD = 5");
  });

  it("has outbound window of 24 hours (86400 seconds)", () => {
    expect(SRC).toContain("OUTBOUND_WINDOW_SEC = 86400");
  });
});

describe("rate-limit.ts structural: public record config", () => {
  it("has public record limit of 30 requests", () => {
    expect(SRC).toContain("PUBLIC_RECORD_LIMIT = 30");
  });

  it("has public record window of 60 seconds", () => {
    expect(SRC).toContain("PUBLIC_RECORD_WINDOW_SEC = 60");
  });

  it("has 404 threshold of 15", () => {
    expect(SRC).toContain("PUBLIC_RECORD_404_THRESHOLD = 15");
  });

  it("has 404 window of 300 seconds", () => {
    expect(SRC).toContain("PUBLIC_RECORD_404_WINDOW_SEC = 300");
  });
});

/* ------------------------------------------------------------------ */
/*  Structural tests — security properties                             */
/* ------------------------------------------------------------------ */

describe("rate-limit.ts structural: security", () => {
  it("uses SHA-256 hashing for keys", () => {
    expect(SRC).toContain('createHash("sha256")');
  });

  it("imports createHash from crypto", () => {
    expect(SRC).toMatch(/import\s*\{[^}]*createHash[^}]*\}\s*from\s*["']crypto["']/);
  });

  it("hashes IP addresses before storage (never stores raw IPs)", () => {
    expect(SRC).toContain("hashKey(`inbound:${workspaceId}:${ip}`)");
    expect(SRC).toContain("hashIpForPublicRecord");
    expect(SRC).toContain("hashKey(`ip:${ip}`)");
  });

  it("does not expose raw IP in any exported function signature that stores data", () => {
    // checkInboundRateLimit and incrementInboundRateLimit accept ip but hash it internally
    expect(SRC).toContain("hashKey(`inbound:${workspaceId}:${ip}`)");
    // Public record functions accept ipHash (already hashed)
    expect(SRC).toMatch(/checkPublicRecordRateLimit\(ipHash/);
    expect(SRC).toMatch(/incrementPublicRecordRateLimit\(ipHash/);
    expect(SRC).toMatch(/recordPublicRecord404\(ipHash/);
  });

  it("truncates hashes to 32 characters", () => {
    expect(SRC).toContain(".slice(0, 32)");
  });

  it("documents that raw IPs should never be stored", () => {
    expect(SRC).toMatch(/never.*log.*store.*raw.*IP|never.*store.*raw.*IP/i);
  });
});

/* ------------------------------------------------------------------ */
/*  hashIpForPublicRecord unit tests                                   */
/* ------------------------------------------------------------------ */

describe("hashIpForPublicRecord", () => {
  it("returns a string", () => {
    const result = hashIpForPublicRecord("192.168.1.1");
    expect(result).toBeTypeOf("string");
  });

  it("returns a 32-character hex string", () => {
    const result = hashIpForPublicRecord("10.0.0.1");
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it("produces consistent output for the same input", () => {
    const a = hashIpForPublicRecord("192.168.1.1");
    const b = hashIpForPublicRecord("192.168.1.1");
    expect(a).toBe(b);
  });

  it("produces different output for different IPs", () => {
    const a = hashIpForPublicRecord("192.168.1.1");
    const b = hashIpForPublicRecord("192.168.1.2");
    expect(a).not.toBe(b);
  });

  it("handles IPv6 addresses", () => {
    const result = hashIpForPublicRecord("::1");
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it("produces different hashes for IPv4 vs IPv6 loopback", () => {
    const v4 = hashIpForPublicRecord("127.0.0.1");
    const v6 = hashIpForPublicRecord("::1");
    expect(v4).not.toBe(v6);
  });
});
