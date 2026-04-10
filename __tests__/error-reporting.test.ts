import { describe, it, expect } from "vitest";
import { categorizeError } from "@/lib/error-reporting";

describe("error reporting", () => {
  describe("categorizeError", () => {
    it("categorizes network errors", () => {
      expect(categorizeError(new Error("Failed to fetch"))).toBe("network");
      expect(categorizeError(new Error("Network error"))).toBe("network");
      expect(categorizeError(new Error("Connection timeout"))).toBe("network");
      expect(categorizeError(new Error("Failed to load resource"))).toBe("network");
    });

    it("categorizes auth errors", () => {
      expect(categorizeError(new Error("401 Unauthorized"))).toBe("auth");
      expect(categorizeError(new Error("403 Forbidden"))).toBe("auth");
      expect(categorizeError(new Error("Session expired"))).toBe("auth");
      expect(categorizeError(new Error("Auth token invalid"))).toBe("auth");
    });

    it("categorizes data errors", () => {
      expect(categorizeError(new Error("404 Not found"))).toBe("data");
      expect(categorizeError(new Error("500 Server error"))).toBe("data");
      expect(categorizeError(new Error("Invalid response body"))).toBe("data");
    });

    it("returns unknown for unrecognized errors", () => {
      expect(categorizeError(new Error("Something happened"))).toBe("unknown");
      expect(categorizeError(new Error(""))).toBe("unknown");
    });

    it("handles non-Error values", () => {
      expect(categorizeError("Network failure")).toBe("network");
      expect(categorizeError(42)).toBe("unknown");
      expect(categorizeError(null)).toBe("unknown");
    });
  });
});
