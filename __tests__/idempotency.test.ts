import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

function makeDedupeKey(body: Record<string, unknown>): string {
  const raw = JSON.stringify({
    workspace_id: body.workspace_id,
    channel: body.channel,
    external_lead_id: body.external_lead_id,
    thread_id: body.thread_id,
    message: body.message,
    external_message_id: body.external_message_id,
  });
  return createHash("sha256").update(raw).digest("hex");
}

describe("Idempotency", () => {
  it("same payload produces same dedupe_key", () => {
    const body = {
      workspace_id: "ws-1",
      channel: "email",
      external_lead_id: "lead-1",
      message: "Hello",
    };
    expect(makeDedupeKey(body)).toBe(makeDedupeKey(body));
  });

  it("different payload produces different dedupe_key", () => {
    const a = { workspace_id: "ws-1", channel: "email", external_lead_id: "lead-1", message: "A" };
    const b = { workspace_id: "ws-1", channel: "email", external_lead_id: "lead-1", message: "B" };
    expect(makeDedupeKey(a)).not.toBe(makeDedupeKey(b));
  });

  it("dedupe_key is deterministic", () => {
    const body = { workspace_id: "x", channel: "c", external_lead_id: "l", message: "m" };
    const k1 = makeDedupeKey(body);
    const k2 = makeDedupeKey({ ...body });
    expect(k1).toBe(k2);
  });
});
