import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => ({
      select: (...cols: string[]) => ({
        eq: (field: string, val: string) => ({
          single: () => Promise.resolve({ data: null }),
          in: (f: string, vals: string[]) => Promise.resolve({ data: [], count: 0 }),
        }),
        in: (field: string, vals: string[]) => ({
          eq: () => Promise.resolve({ count: 0 }),
        }),
      }),
    }),
  }),
}));

import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

describe("deal-prediction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns default when deal not found", async () => {
    const result = await predictDealOutcome("00000000-0000-0000-0000-000000000000");
    expect(result.deal_id).toBe("00000000-0000-0000-0000-000000000000");
    expect(result.probability).toBe(0);
    expect(result.signals).toEqual([]);
  });
});
