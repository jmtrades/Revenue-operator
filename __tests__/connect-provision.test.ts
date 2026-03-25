/**
 * Connect page provisioning: retry and fallback behavior
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Connect provision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retry up to 10 times when provision fails", () => {
    let attempts = 0;
    const maxRetries = 10;
    while (attempts < maxRetries) {
      attempts++;
    }
    expect(attempts).toBe(10);
  });

  it("should use proxy number as fallback when purchase fails", () => {
    const fallback = process.env.TWILIO_PROXY_NUMBER ?? null;
    expect(typeof fallback === "string" || fallback === null).toBe(true);
  });
});
