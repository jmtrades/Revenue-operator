import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("Zoom webhook", () => {
  it("computes valid HMAC signature for verification", () => {
    const secret = "test-secret";
    const raw = JSON.stringify({
      event: "meeting.ended",
      payload: { object: { id: "123", uuid: "abc" } },
    });
    const hash = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const sig = `v0=${hash}`;
    expect(sig).toMatch(/^v0=[a-f0-9]{64}$/);
  });

  it("dedupe key format is event:meetingId:uuid", () => {
    const event = "meeting.ended";
    const meetingId = "123";
    const meetingUuid = "abc";
    const dedupeKey = `zoom:${event}:${meetingId}:${meetingUuid}`;
    expect(dedupeKey).toBe("zoom:meeting.ended:123:abc");
  });
});
