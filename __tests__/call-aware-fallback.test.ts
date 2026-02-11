import { describe, it, expect } from "vitest";
import { inferShowStatus } from "../src/lib/calls/show-inference";
import { createWrapupToken, hashToken } from "../src/lib/calls/wrapup-token";

describe("Call-aware fallback", () => {
  describe("show/no-show inference", () => {
    it("message 'missed it' => no_show", () => {
      const result = inferShowStatus({
        callSession: { call_started_at: "2025-01-01T10:00:00Z", call_ended_at: "2025-01-01T10:30:00Z" },
        recentMessages: [{ content: "Sorry I missed it, can we reschedule?", role: "user" }],
      });
      expect(result.status).toBe("no_show");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reason).toMatch(/missed|reschedule/i);
    });

    it("wrap-up interested => showed", () => {
      const result = inferShowStatus({
        callSession: {},
        wrapUp: { outcome: "interested" },
      });
      expect(result.status).toBe("showed");
      expect(result.confidence).toBe(1);
      expect(result.reason).toMatch(/wrap-up|interested/i);
    });

    it("wrap-up not_fit => showed", () => {
      const result = inferShowStatus({
        callSession: {},
        wrapUp: { outcome: "not_fit" },
      });
      expect(result.status).toBe("showed");
      expect(result.confidence).toBe(1);
    });

    it("unknown when no strong signals (duration 3 min)", () => {
      const result = inferShowStatus({
        callSession: { call_started_at: "2025-01-01T10:00:00Z", call_ended_at: "2025-01-01T10:03:00Z" },
        recentMessages: [],
      });
      expect(result.status).toBe("unknown");
      expect(result.reason).toMatch(/Insufficient|signal/i);
    });

    it("short duration (< 2 min) => no_show likelihood", () => {
      const result = inferShowStatus({
        callSession: {
          call_started_at: "2025-01-01T10:00:00Z",
          call_ended_at: "2025-01-01T10:01:00Z",
        },
        recentMessages: [],
      });
      expect(result.status).toBe("no_show");
      expect(result.reason).toMatch(/2 min|no-show/i);
    });

    it("cancelled calendar => no_show", () => {
      const result = inferShowStatus({
        callSession: { metadata: { status: "cancelled" } },
        recentMessages: [],
      });
      expect(result.status).toBe("no_show");
      expect(result.reason).toMatch(/cancelled/i);
    });
  });

  describe("wrap-up token", () => {
    it("creates token and hash", () => {
      const { token, tokenHash } = createWrapupToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(20);
      expect(tokenHash).toBe(hashToken(token));
    });

    it("hash is deterministic", () => {
      const t = "abc123";
      expect(hashToken(t)).toBe(hashToken(t));
    });
  });
});
