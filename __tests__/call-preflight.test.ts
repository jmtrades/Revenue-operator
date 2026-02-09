import { describe, it, expect, vi } from "vitest";

vi.mock("../src/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { opt_out: false },
            }),
        }),
      }),
    }),
  }),
}));

describe("Call preflight", () => {
  it("shouldRefuseCall returns refuse:false when lead not opted out", async () => {
    const { shouldRefuseCall } = await import("../src/lib/calls/preflight");
    const result = await shouldRefuseCall("lead-1");
    expect(result.refuse).toBe(false);
  });
});
