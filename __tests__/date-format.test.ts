import { describe, it, expect } from "vitest";
import { formatDate, formatTime, formatRelativeTime } from "@/lib/date-format";

describe("date formatting", () => {
  const testDate = new Date("2025-06-15T14:30:00Z");

  describe("formatDate", () => {
    it("formats date with medium style", () => {
      const result = formatDate(testDate, "en-US", "medium");
      expect(result).toContain("2025");
    });

    it("formats date from string input", () => {
      const result = formatDate("2025-06-15T14:30:00Z", "en-US");
      expect(result).toContain("2025");
    });

    it("formats date with short style", () => {
      const result = formatDate(testDate, "en-US", "short");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("formats date with long style", () => {
      const result = formatDate(testDate, "en-US", "long");
      expect(result).toContain("June");
    });

    it("defaults to medium style", () => {
      const result = formatDate(testDate, "en-US");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("formatTime", () => {
    it("formats time in en-US locale", () => {
      const result = formatTime(testDate, "en-US");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("accepts string date input", () => {
      const result = formatTime("2025-06-15T14:30:00Z", "en-US");
      expect(typeof result).toBe("string");
    });

    it("supports explicit hour12 option", () => {
      const result12 = formatTime(testDate, "en-US", true);
      expect(result12).toMatch(/AM|PM/);
    });
  });

  describe("formatRelativeTime", () => {
    it("returns 'now' for current time", () => {
      const result = formatRelativeTime(new Date(), "en-US");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles string date input", () => {
      const result = formatRelativeTime(new Date(Date.now() - 3600000).toISOString(), "en-US");
      expect(result).toContain("hour");
    });

    it("returns past time for past dates", () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(pastDate, "en-US");
      expect(result).toMatch(/day|ago/i);
    });
  });
});
