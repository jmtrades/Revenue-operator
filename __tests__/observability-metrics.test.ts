import { describe, it, expect } from "vitest";
import { METRIC_KEYS } from "@/lib/observability/metrics";

describe("observability metrics", () => {
  describe("METRIC_KEYS", () => {
    it("contains all expected metric keys", () => {
      expect(METRIC_KEYS.REPLIES_SENT).toBe("replies_sent");
      expect(METRIC_KEYS.FALLBACK_USED).toBe("fallback_used");
      expect(METRIC_KEYS.DELIVERY_FAILED).toBe("delivery_failed");
      expect(METRIC_KEYS.OPT_OUT).toBe("opt_out");
      expect(METRIC_KEYS.BOOKINGS).toBe("bookings");
    });

    it("has 5 metric keys", () => {
      expect(Object.keys(METRIC_KEYS)).toHaveLength(5);
    });

    it("all values are unique strings", () => {
      const values = Object.values(METRIC_KEYS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
      values.forEach((v) => expect(typeof v).toBe("string"));
    });
  });
});
