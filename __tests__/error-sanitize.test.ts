import { describe, it, expect } from "vitest";
import { sanitizeError, apiError } from "@/lib/errors/sanitize";

describe("error sanitization", () => {
  describe("sanitizeError", () => {
    it("returns fallback for null/undefined", () => {
      expect(sanitizeError(null)).toBe("An unexpected error occurred. Please try again.");
      expect(sanitizeError(undefined)).toBe("An unexpected error occurred. Please try again.");
    });

    it("strips database error messages", () => {
      expect(sanitizeError('relation "workspaces" does not exist')).toBe(
        "An unexpected error occurred. Please try again."
      );
      expect(sanitizeError("duplicate key value violates unique constraint")).toBe(
        "An unexpected error occurred. Please try again."
      );
    });

    it("strips provider names", () => {
      expect(sanitizeError("Supabase connection failed")).toBe(
        "An unexpected error occurred. Please try again."
      );
      expect(sanitizeError("Stripe API returned 500")).toBe(
        "An unexpected error occurred. Please try again."
      );
      expect(sanitizeError("Twilio SMS delivery error")).toBe(
        "An unexpected error occurred. Please try again."
      );
      expect(sanitizeError("OpenAI rate limit exceeded")).toBe(
        "An unexpected error occurred. Please try again."
      );
    });

    it("allows safe known messages through", () => {
      expect(sanitizeError("Unauthorized")).toBe("Unauthorized");
      expect(sanitizeError("Not found")).toBe("Not found");
      expect(sanitizeError("workspace_id required")).toBe("workspace_id required");
      expect(sanitizeError("Lead not found")).toBe("Lead not found");
    });

    it("strips stack traces", () => {
      const errorWithStack = "Error: something\n    at Object.fn (file.js:1:1)";
      expect(sanitizeError(errorWithStack)).toBe(
        "An unexpected error occurred. Please try again."
      );
    });

    it("strips very long messages", () => {
      const longMessage = "x".repeat(301);
      expect(sanitizeError(longMessage)).toBe(
        "An unexpected error occurred. Please try again."
      );
    });

    it("passes through short safe messages", () => {
      expect(sanitizeError("Something went wrong")).toBe("Something went wrong");
    });

    it("handles Error objects", () => {
      const err = new Error("Supabase timeout");
      expect(sanitizeError(err)).toBe("An unexpected error occurred. Please try again.");
    });

    it("uses custom fallback", () => {
      expect(sanitizeError(null, "Custom fallback")).toBe("Custom fallback");
    });
  });

  describe("apiError", () => {
    it("returns both sanitized and raw", () => {
      const result = apiError(new Error("connection refused"));
      expect(result.raw).toBe("connection refused");
      expect(result.sanitized).toBe("An unexpected error occurred. Please try again.");
    });

    it("passes through safe messages", () => {
      const result = apiError(new Error("Not found"));
      expect(result.sanitized).toBe("Not found");
    });

    it("handles string errors", () => {
      const result = apiError("simple error");
      expect(result.raw).toBe("simple error");
    });
  });
});
