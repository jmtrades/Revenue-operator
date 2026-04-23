/**
 * Phase 14 — Inbound SMS normalizer.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeTwilioSms,
  normalizeBandwidthSms,
  normalizeTelnyxSms,
  normalizeGenericSms,
  normalizeInboundSms,
  toSmsReplyEventData,
} from "../src/lib/integrations/inbound-sms";

describe("inbound-sms — Twilio", () => {
  it("normalizes a basic Twilio form payload", () => {
    const n = normalizeTwilioSms({
      From: "+15551234567",
      To: "+15557654321",
      Body: "Yes please",
      MessageSid: "SM123",
      NumSegments: "1",
      NumMedia: "0",
    });
    expect(n).not.toBeNull();
    expect(n!.provider).toBe("twilio");
    expect(n!.fromNumber).toBe("+15551234567");
    expect(n!.toNumber).toBe("+15557654321");
    expect(n!.body).toBe("Yes please");
    expect(n!.messageId).toBe("SM123");
    expect(n!.numSegments).toBe(1);
    expect(n!.mediaUrls).toEqual([]);
  });

  it("extracts MediaUrl0/1 when NumMedia > 0", () => {
    const n = normalizeTwilioSms({
      From: "5551234567",
      To: "5557654321",
      Body: "photo",
      MessageSid: "SM456",
      NumMedia: "2",
      MediaUrl0: "https://api.twilio.com/media/0",
      MediaUrl1: "https://api.twilio.com/media/1",
    });
    expect(n).not.toBeNull();
    expect(n!.mediaUrls).toEqual([
      "https://api.twilio.com/media/0",
      "https://api.twilio.com/media/1",
    ]);
    expect(n!.fromNumber).toBe("+15551234567");
  });

  it("falls back to SmsSid when MessageSid is absent", () => {
    const n = normalizeTwilioSms({
      From: "+15551234567",
      To: "+15557654321",
      Body: "hi",
      SmsSid: "SS999",
    });
    expect(n!.messageId).toBe("SS999");
  });

  it("returns null when From or To missing", () => {
    expect(normalizeTwilioSms({ To: "+15551234567", Body: "hi" })).toBeNull();
    expect(normalizeTwilioSms({ From: "+15551234567", Body: "hi" })).toBeNull();
  });
});

describe("inbound-sms — Bandwidth", () => {
  it("normalizes a Bandwidth message event", () => {
    const n = normalizeBandwidthSms({
      type: "message-received",
      time: "2026-04-22T12:00:00Z",
      message: {
        id: "msg-1",
        from: "+15551234567",
        to: ["+15557654321"],
        text: "hello",
        segmentCount: 1,
        media: ["https://bw.com/m/1"],
      },
    });
    expect(n!.provider).toBe("bandwidth");
    expect(n!.messageId).toBe("msg-1");
    expect(n!.receivedAt).toBe("2026-04-22T12:00:00Z");
    expect(n!.mediaUrls).toEqual(["https://bw.com/m/1"]);
  });

  it("handles to-as-string", () => {
    const n = normalizeBandwidthSms({
      type: "message-received",
      message: { from: "+15551234567", to: "+15557654321", text: "ok" },
    });
    expect(n!.toNumber).toBe("+15557654321");
  });

  it("returns null without message object", () => {
    expect(normalizeBandwidthSms({ type: "message-received" })).toBeNull();
  });
});

describe("inbound-sms — Telnyx", () => {
  it("normalizes a Telnyx message.received event", () => {
    const n = normalizeTelnyxSms({
      data: {
        event_type: "message.received",
        occurred_at: "2026-04-22T13:00:00Z",
        payload: {
          id: "tnx-1",
          from: { phone_number: "+15551234567" },
          to: [{ phone_number: "+15557654321" }],
          text: "test",
          parts: 2,
          media: [{ url: "https://telnyx.com/m/1" }, { url: "" }],
        },
      },
    });
    expect(n!.provider).toBe("telnyx");
    expect(n!.numSegments).toBe(2);
    expect(n!.mediaUrls).toEqual(["https://telnyx.com/m/1"]);
    expect(n!.receivedAt).toBe("2026-04-22T13:00:00Z");
  });

  it("rejects non-received events", () => {
    expect(
      normalizeTelnyxSms({
        data: {
          event_type: "message.sent",
          payload: {
            id: "tnx-2",
            from: { phone_number: "+15551234567" },
            to: [{ phone_number: "+15557654321" }],
            text: "sent",
          },
        },
      }),
    ).toBeNull();
  });

  it("returns null without payload", () => {
    expect(normalizeTelnyxSms({ data: { event_type: "message.received" } })).toBeNull();
  });
});

describe("inbound-sms — generic", () => {
  it("normalizes snake_case generic payload", () => {
    const n = normalizeGenericSms({
      from: "5551234567",
      to: "5557654321",
      text: "ok",
      message_id: "g-1",
      received_at: "2026-04-22T14:00:00Z",
      media_urls: ["https://cdn.example.com/1"],
      num_segments: 3,
    });
    expect(n!.provider).toBe("generic");
    expect(n!.fromNumber).toBe("+15551234567");
    expect(n!.numSegments).toBe(3);
  });

  it("prefers text over body", () => {
    const n = normalizeGenericSms({
      from: "+15551234567",
      to: "+15557654321",
      text: "from text",
      body: "from body",
    });
    expect(n!.body).toBe("from text");
  });

  it("falls back to body when text missing", () => {
    const n = normalizeGenericSms({
      from: "+15551234567",
      to: "+15557654321",
      body: "from body",
    });
    expect(n!.body).toBe("from body");
  });
});

describe("inbound-sms — auto-detect", () => {
  it("detects Twilio by PascalCase From/To", () => {
    const n = normalizeInboundSms({
      From: "+15551234567",
      To: "+15557654321",
      Body: "hi",
      MessageSid: "SM1",
    });
    expect(n!.provider).toBe("twilio");
  });

  it("detects Bandwidth by type+message", () => {
    const n = normalizeInboundSms({
      type: "message-received",
      message: { from: "+15551234567", to: "+15557654321", text: "hi" },
    });
    expect(n!.provider).toBe("bandwidth");
  });

  it("detects Telnyx by data.event_type", () => {
    const n = normalizeInboundSms({
      data: {
        event_type: "message.received",
        payload: {
          from: { phone_number: "+15551234567" },
          to: [{ phone_number: "+15557654321" }],
          text: "hi",
        },
      },
    });
    expect(n!.provider).toBe("telnyx");
  });

  it("detects generic by lowercase from/to", () => {
    const n = normalizeInboundSms({
      from: "+15551234567",
      to: "+15557654321",
      text: "hi",
    });
    expect(n!.provider).toBe("generic");
  });

  it("returns null for unrecognized payload", () => {
    expect(normalizeInboundSms({ foo: "bar" })).toBeNull();
  });
});

describe("inbound-sms — toSmsReplyEventData", () => {
  it("translates normalized SMS into event-data shape", () => {
    const data = toSmsReplyEventData({
      provider: "twilio",
      fromNumber: "+15551234567",
      toNumber: "+15557654321",
      body: "yes",
      messageId: "SM1",
      receivedAt: "2026-04-22T12:00:00Z",
      numSegments: 1,
      mediaUrls: [],
      raw: {},
    });
    expect(data).toEqual({
      text: "yes",
      from_number: "+15551234567",
      to_number: "+15557654321",
      message_id: "SM1",
      provider: "twilio",
      received_at: "2026-04-22T12:00:00Z",
      media_urls: [],
    });
  });
});

describe("inbound-sms — E.164 normalization edge cases", () => {
  it("US 10-digit → +1...", () => {
    const n = normalizeGenericSms({
      from: "(555) 123-4567",
      to: "555.765.4321",
    });
    expect(n!.fromNumber).toBe("+15551234567");
    expect(n!.toNumber).toBe("+15557654321");
  });

  it("11-digit starting with 1 → +1...", () => {
    const n = normalizeGenericSms({
      from: "15551234567",
      to: "15557654321",
    });
    expect(n!.fromNumber).toBe("+15551234567");
  });

  it("keeps existing + prefix", () => {
    const n = normalizeGenericSms({
      from: "+442071838750",
      to: "+15557654321",
    });
    expect(n!.fromNumber).toBe("+442071838750");
  });

  it("rejects <10 digit short codes for safety", () => {
    const n = normalizeGenericSms({ from: "12345", to: "+15557654321" });
    expect(n).toBeNull();
  });
});
