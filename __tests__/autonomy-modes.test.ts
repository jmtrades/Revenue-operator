/**
 * Autonomy modes: observe | assist | act
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => ({
      select: (...args: string[]) => ({
        eq: (col: string, val: string) => ({
          single: () => {
            if (table === "settings" && col === "workspace_id") {
              return {
                data: {
                  autonomy_mode: val === "observe-ws" ? "observe" : val === "assist-ws" ? "assist" : "act",
                  feature_flags: { followups: true, confirmations: true, winback: true, booking: true, triage: true },
                  autonomy_ramp_day: 0,
                },
                error: null,
              };
            }
            if (table === "workspaces") return { data: { created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }, error: null };
            return { data: null, error: null };
          },
        }),
      }),
    }),
  }),
}));

describe("Autonomy Modes", () => {
  it("observe mode: shouldSimulateOnly returns true", async () => {
    const { shouldSimulateOnly } = await import("@/lib/autonomy");
    const result = await shouldSimulateOnly("observe-ws");
    expect(result).toBe(true);
  });

  it("assist mode: shouldSimulateOnly returns false", async () => {
    const { shouldSimulateOnly } = await import("@/lib/autonomy");
    const result = await shouldSimulateOnly("assist-ws");
    expect(result).toBe(false);
  });

  it("act mode: shouldSimulateOnly returns false", async () => {
    const { shouldSimulateOnly } = await import("@/lib/autonomy");
    const result = await shouldSimulateOnly("act-ws");
    expect(result).toBe(false);
  });

  it("shouldRequireApproval: assist + sensitive returns true", async () => {
    const { shouldRequireApproval } = await import("@/lib/autonomy");
    const result = await shouldRequireApproval("assist-ws", "send_message", { isSensitive: true });
    expect(result).toBe(true);
  });

  it("shouldRequireApproval: act returns false", async () => {
    const { shouldRequireApproval } = await import("@/lib/autonomy");
    const result = await shouldRequireApproval("act-ws", "send_message");
    expect(result).toBe(false);
  });
});
