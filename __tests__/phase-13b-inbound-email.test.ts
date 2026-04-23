/**
 * Phase 13b — Inbound email normalization tests (pure, no DB).
 */

import { describe, it, expect } from "vitest";
import {
  normalizeGenericInbound,
  normalizeInboundEmail,
  normalizePostmarkInbound,
  normalizeResendInbound,
  normalizeSendgridInbound,
  parseEmailAddress,
  toEmailReplyEventData,
} from "../src/lib/integrations/inbound-email";

describe("inbound-email.parseEmailAddress", () => {
  it("parses a bracketed address", () => {
    expect(parseEmailAddress("Taylor <taylor@acme.co>")).toEqual({
      name: "Taylor",
      email: "taylor@acme.co",
    });
  });

  it("strips quotes around the name", () => {
    expect(parseEmailAddress('"Taylor S." <taylor@acme.co>')).toEqual({
      name: "Taylor S.",
      email: "taylor@acme.co",
    });
  });

  it("parses a bare address", () => {
    expect(parseEmailAddress("taylor@acme.co")).toEqual({
      name: null,
      email: "taylor@acme.co",
    });
  });

  it("lowercases emails", () => {
    expect(parseEmailAddress("Taylor@ACME.co")).toEqual({
      name: null,
      email: "taylor@acme.co",
    });
  });

  it("returns nulls for empty input", () => {
    expect(parseEmailAddress(undefined)).toEqual({ name: null, email: null });
    expect(parseEmailAddress("")).toEqual({ name: null, email: null });
  });
});

describe("inbound-email.normalizePostmarkInbound", () => {
  it("normalizes a Postmark payload", () => {
    const n = normalizePostmarkInbound({
      From: "Taylor <taylor@acme.co>",
      FromName: "Taylor",
      To: "sales@recall-touch.com",
      Subject: "Re: our call",
      TextBody: "Yes — let's set up a time.",
      HtmlBody: "<p>Yes — let's set up a time.</p>",
      MessageID: "pm-abc",
      Date: "2026-04-22T12:00:00.000Z",
      Headers: [
        { Name: "In-Reply-To", Value: "<orig@recall-touch.com>" },
        { Name: "References", Value: "<orig@recall-touch.com> <older@recall-touch.com>" },
      ],
    });
    expect(n).not.toBeNull();
    expect(n?.provider).toBe("postmark");
    expect(n?.fromEmail).toBe("taylor@acme.co");
    expect(n?.toEmail).toBe("sales@recall-touch.com");
    expect(n?.inReplyTo).toBe("<orig@recall-touch.com>");
    expect(n?.references.length).toBe(2);
    expect(n?.receivedAt).toBe("2026-04-22T12:00:00.000Z");
  });

  it("returns null if From is missing", () => {
    const n = normalizePostmarkInbound({ To: "a@b.co" });
    expect(n).toBeNull();
  });
});

describe("inbound-email.normalizeSendgridInbound", () => {
  it("normalizes a SendGrid Parse payload", () => {
    const n = normalizeSendgridInbound({
      from: "Taylor <taylor@acme.co>",
      to: "sales@recall-touch.com",
      subject: "Re: pricing",
      text: "How much is it?",
      html: "<p>How much is it?</p>",
      message_id: "<sg-1@acme.co>",
      in_reply_to: "<orig@recall-touch.com>",
      references: "<orig@recall-touch.com>",
    });
    expect(n?.provider).toBe("sendgrid");
    expect(n?.fromEmail).toBe("taylor@acme.co");
    expect(n?.text).toBe("How much is it?");
  });
});

describe("inbound-email.normalizeResendInbound", () => {
  it("normalizes a Resend email.received payload", () => {
    const n = normalizeResendInbound({
      type: "email.received",
      created_at: "2026-04-22T12:00:00.000Z",
      data: {
        email_id: "resend-1",
        from: "Taylor <taylor@acme.co>",
        to: ["sales@recall-touch.com"],
        subject: "Re: demo",
        text: "Thanks for reaching out — tell me more.",
        headers: [{ name: "In-Reply-To", value: "<orig@recall-touch.com>" }],
      },
    });
    expect(n?.provider).toBe("resend");
    expect(n?.fromEmail).toBe("taylor@acme.co");
    expect(n?.toEmail).toBe("sales@recall-touch.com");
    expect(n?.inReplyTo).toBe("<orig@recall-touch.com>");
  });

  it("returns null for non-received Resend events", () => {
    const n = normalizeResendInbound({
      type: "email.delivered",
      data: { from: "a@b.co", to: "c@d.co" },
    });
    expect(n).toBeNull();
  });
});

describe("inbound-email.normalizeGenericInbound", () => {
  it("normalizes a plain generic payload", () => {
    const n = normalizeGenericInbound({
      from: "taylor@acme.co",
      to: "sales@recall-touch.com",
      subject: "Re: thing",
      text: "Short reply.",
      received_at: "2026-04-22T12:00:00.000Z",
    });
    expect(n?.provider).toBe("generic");
    expect(n?.receivedAt).toBe("2026-04-22T12:00:00.000Z");
  });
});

describe("inbound-email.normalizeInboundEmail (auto-detect)", () => {
  it("auto-detects Resend", () => {
    const n = normalizeInboundEmail({
      type: "email.received",
      data: { from: "a@b.co", to: "c@d.co", text: "hi" },
    });
    expect(n?.provider).toBe("resend");
  });

  it("auto-detects Postmark", () => {
    const n = normalizeInboundEmail({
      From: "a@b.co",
      To: "c@d.co",
      TextBody: "hi",
    });
    expect(n?.provider).toBe("postmark");
  });

  it("auto-detects sendgrid/generic", () => {
    const n = normalizeInboundEmail({
      from: "a@b.co",
      to: "c@d.co",
      text: "hi",
    });
    expect(n).not.toBeNull();
    expect(["sendgrid", "generic"]).toContain(n?.provider);
  });

  it("returns null for unrecognized shapes", () => {
    expect(normalizeInboundEmail({ foo: "bar" })).toBeNull();
    expect(normalizeInboundEmail({})).toBeNull();
  });
});

describe("inbound-email.toEmailReplyEventData", () => {
  it("shapes the event data for reactive-event-processor consumption", () => {
    const n = normalizeInboundEmail({
      from: "taylor@acme.co",
      to: "sales@recall-touch.com",
      subject: "Re: pricing",
      text: "Yes let's schedule a time.",
    });
    expect(n).not.toBeNull();
    const data = toEmailReplyEventData(n!);
    expect(data.text).toBe("Yes let's schedule a time.");
    expect(data.from_email).toBe("taylor@acme.co");
    expect(data.subject).toBe("Re: pricing");
  });
});
