import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              single: () => Promise.resolve({ data: null }),
            }),
          }),
          is: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { burstDrain } from "@/lib/queue/burst-drain";

describe("burst-drain", () => {
  it("returns processed 0 when no jobs", async () => {
    const result = await burstDrain();
    expect(result.processed).toBe(0);
  });
});
