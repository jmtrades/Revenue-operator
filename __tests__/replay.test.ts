import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();

vi.mock("../src/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

describe("Replay defense", () => {
  beforeEach(() => {
    mockInsert.mockReset();
  });

  it("claimReplayNonce returns true when insert succeeds", async () => {
    mockInsert.mockResolvedValue({ error: null });

    const { claimReplayNonce } = await import("../src/lib/security/replay");
    const result = await claimReplayNonce("ws-1", "sig-abc", 1700000000000);

    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      workspace_id: "ws-1",
      signature: "sig-abc",
      timestamp_ms: 1700000000000,
    });
  });

  it("claimReplayNonce returns false on duplicate (replay rejected)", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "duplicate key value violates unique constraint", code: "23505" },
    });

    const { claimReplayNonce } = await import("../src/lib/security/replay");
    const result = await claimReplayNonce("ws-1", "sig-dup", 1700000000000);

    expect(result).toBe(false);
  });
});
