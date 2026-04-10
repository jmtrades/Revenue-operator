import { describe, it, expect } from "vitest";
import { redact, redactHeaders } from "@/lib/redact";

describe("redact", () => {
  describe("redact()", () => {
    it("redacts password fields", () => {
      const result = redact({ user: "admin", password: "s3cret123" });
      expect(result.user).toBe("admin");
      expect(result.password).toBe("[REDACTED]");
    });

    it("redacts api_key fields", () => {
      const result = redact({ api_key: "sk_live_xxx", name: "test" });
      expect(result.api_key).toBe("[REDACTED]");
      expect(result.name).toBe("test");
    });

    it("redacts token fields", () => {
      const result = redact({ access_token: "abc123", refresh_token: "def456" });
      expect(result.access_token).toBe("[REDACTED]");
      expect(result.refresh_token).toBe("[REDACTED]");
    });

    it("redacts authorization fields", () => {
      const result = redact({ authorization: "Bearer xyz" });
      expect(result.authorization).toBe("[REDACTED]");
    });

    it("preserves non-sensitive fields", () => {
      const result = redact({ name: "John", email: "j@example.com", status: "active" });
      expect(result.name).toBe("John");
      expect(result.email).toBe("j@example.com");
      expect(result.status).toBe("active");
    });

    it("handles nested objects", () => {
      const result = redact({
        config: { secret: "hidden", host: "localhost" },
      });
      expect((result.config as Record<string, unknown>).secret).toBe("[REDACTED]");
      expect((result.config as Record<string, unknown>).host).toBe("localhost");
    });

    it("handles empty object", () => {
      expect(redact({})).toEqual({});
    });
  });

  describe("redactHeaders()", () => {
    it("redacts authorization header", () => {
      const result = redactHeaders({ authorization: "Bearer token123", "content-type": "application/json" });
      expect(result.authorization).toBe("[REDACTED]");
      expect(result["content-type"]).toBe("application/json");
    });

    it("redacts cookie header", () => {
      const result = redactHeaders({ cookie: "session=abc123" });
      expect(result.cookie).toBe("[REDACTED]");
    });

    it("redacts x- prefixed headers", () => {
      const result = redactHeaders({ "x-api-key": "key123", accept: "text/html" });
      expect(result["x-api-key"]).toBe("[REDACTED]");
      expect(result.accept).toBe("text/html");
    });
  });
});
