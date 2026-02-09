import { describe, it, expect, vi } from "vitest";

vi.mock("../src/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () =>
        Promise.resolve({
          data: [
            { channel: "email", can_send: true, can_receive: true, can_call: false, supports_optout: true },
            { channel: "sms", can_send: true, can_receive: true, can_call: false, supports_optout: true },
            { channel: "web", can_send: true, can_receive: true, can_call: false, supports_optout: true },
          ],
        }),
    }),
  }),
}));

describe("Channel fallback", () => {
  it("canSend returns true for supported channel", async () => {
    const { canSend } = await import("../src/lib/channels/capabilities");
    expect(await canSend("email")).toBe(true);
  });

  it("getFallbackChannel returns string or null", async () => {
    const { getFallbackChannel } = await import("../src/lib/channels/capabilities");
    const fallback = await getFallbackChannel("unknown");
    expect(fallback === null || typeof fallback === "string").toBe(true);
  });
});
