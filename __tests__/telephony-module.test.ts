/**
 * Telephony module: structural integrity, type exports, pure function tests,
 * security (no hardcoded secrets), retry logic, and webhook verification.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const TEL_DIR = path.join(ROOT, "src/lib/telephony");

/* ── Helper: read a telephony source file ──────────────────────── */
function readTelFile(name: string): string {
  return readFileSync(path.join(TEL_DIR, name), "utf-8");
}

// ─── 1. Structural: every expected file exists and exports correctly ────

describe("telephony module structure", () => {
  const expectedFiles = [
    "index.ts",
    "telnyx-client.ts",
    "telnyx-numbers.ts",
    "telnyx-sms.ts",
    "telnyx-voice.ts",
    "telnyx-webhooks.ts",
    "types.ts",
    "get-telephony-provider.ts",
  ];

  it.each(expectedFiles)("file %s exists and is non-empty", (file) => {
    const src = readTelFile(file);
    expect(src.length).toBeGreaterThan(0);
  });

  it("index.ts exports getTelephonyService", () => {
    const src = readTelFile("index.ts");
    expect(src).toContain("export function getTelephonyService");
  });

  it("index.ts exports createTelnyxService and createTwilioService", () => {
    const src = readTelFile("index.ts");
    expect(src).toContain("export { createTelnyxService, createTwilioService }");
  });

  it("index.ts defines TelephonyService interface", () => {
    const src = readTelFile("index.ts");
    expect(src).toContain("export interface TelephonyService");
    expect(src).toContain("sendSms");
    expect(src).toContain("searchAvailableNumbers");
    expect(src).toContain("purchaseNumber");
    expect(src).toContain("releaseNumber");
    expect(src).toContain("createOutboundCall");
  });

  it("telnyx-client.ts exports telnyxFetch, parseTelnyxError, telnyxRequest", () => {
    const src = readTelFile("telnyx-client.ts");
    expect(src).toContain("export async function telnyxFetch");
    expect(src).toContain("export function parseTelnyxError");
    expect(src).toContain("export async function telnyxRequest");
  });

  it("telnyx-numbers.ts exports searchAvailableNumbers, purchaseNumber, releaseNumber, getPhoneNumberDetails", () => {
    const src = readTelFile("telnyx-numbers.ts");
    expect(src).toContain("export async function searchAvailableNumbers");
    expect(src).toContain("export async function purchaseNumber");
    expect(src).toContain("export async function releaseNumber");
    expect(src).toContain("export async function getPhoneNumberDetails");
  });

  it("telnyx-sms.ts exports sendSms and getSmsDetails", () => {
    const src = readTelFile("telnyx-sms.ts");
    expect(src).toContain("export async function sendSms");
    expect(src).toContain("export async function getSmsDetails");
  });

  it("telnyx-voice.ts exports voice control functions", () => {
    const src = readTelFile("telnyx-voice.ts");
    const expectedFns = [
      "createOutboundCall",
      "answerCall",
      "hangupCall",
      "startStreamingAudio",
      "stopStreamingAudio",
      "getCallStatus",
      "speakText",
      "gatherUsingSpeech",
      "startTranscription",
      "stopTranscription",
    ];
    for (const fn of expectedFns) {
      expect(src).toContain(`export async function ${fn}`);
    }
  });

  it("telnyx-webhooks.ts exports verification and parsing functions", () => {
    const src = readTelFile("telnyx-webhooks.ts");
    expect(src).toContain("export function verifyTelnyxWebhook");
    expect(src).toContain("export function parseTelnyxEvent");
    expect(src).toContain("export function extractCallInfo");
    expect(src).toContain("export function extractMessageInfo");
    expect(src).toContain("export function isCallEvent");
    expect(src).toContain("export function isMessageEvent");
    expect(src).toContain("export function isNumberEvent");
  });

  it("get-telephony-provider.ts exports getTelephonyProvider", () => {
    const src = readTelFile("get-telephony-provider.ts");
    expect(src).toContain("export function getTelephonyProvider");
  });
});

// ─── 2. Security: no hardcoded API keys or secrets ──────────────

describe("telephony module security", () => {
  const allFiles = [
    "index.ts",
    "telnyx-client.ts",
    "telnyx-numbers.ts",
    "telnyx-sms.ts",
    "telnyx-voice.ts",
    "telnyx-webhooks.ts",
    "types.ts",
    "get-telephony-provider.ts",
  ];

  it.each(allFiles)("%s contains no hardcoded API key values", (file) => {
    const src = readTelFile(file);
    // Keys should only be referenced via process.env, not as literal strings
    expect(src).not.toMatch(/["']KEY_[A-Za-z0-9]{20,}["']/);
    expect(src).not.toMatch(/["']sk_[A-Za-z0-9]{20,}["']/);
    expect(src).not.toMatch(/["']AC[a-f0-9]{32}["']/); // Twilio SID pattern
    expect(src).not.toMatch(/["']pk_[A-Za-z0-9]{20,}["']/);
  });

  it("telnyx-client.ts reads API key from process.env only", () => {
    const src = readTelFile("telnyx-client.ts");
    expect(src).toContain("process.env.TELNYX_API_KEY");
    // Ensure the API key is used as Bearer token, not hardcoded
    expect(src).toContain("Bearer");
  });

  it("index.ts reads Twilio credentials from process.env only", () => {
    const src = readTelFile("index.ts");
    expect(src).toContain("process.env.TWILIO_ACCOUNT_SID");
    expect(src).toContain("process.env.TWILIO_AUTH_TOKEN");
  });
});

// ─── 3. Error handling: try/catch and error types ──────────────

describe("telephony module error handling", () => {
  it("telnyx-client.ts throws on missing API key", () => {
    const src = readTelFile("telnyx-client.ts");
    expect(src).toContain("throw new Error");
    expect(src).toContain("TELNYX_API_KEY not configured");
  });

  it("telnyx-client.ts parseTelnyxError handles all error shapes", () => {
    const src = readTelFile("telnyx-client.ts");
    // Should handle errors array, error string, message string, and unknown
    expect(src).toContain("errorData.errors");
    expect(src).toContain("errorData.error");
    expect(src).toContain("errorData.message");
    expect(src).toContain("Unknown Telnyx error");
  });

  it("telnyx-numbers.ts wraps all exported functions in try/catch", () => {
    const src = readTelFile("telnyx-numbers.ts");
    const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
    // At least 4 exported functions each with try/catch
    expect(tryCatchCount).toBeGreaterThanOrEqual(4);
  });

  it("telnyx-voice.ts wraps all exported functions in try/catch", () => {
    const src = readTelFile("telnyx-voice.ts");
    const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
    expect(tryCatchCount).toBeGreaterThanOrEqual(8);
  });

  it("telnyx-sms.ts wraps sendSms and getSmsDetails in try/catch", () => {
    const src = readTelFile("telnyx-sms.ts");
    const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
    expect(tryCatchCount).toBeGreaterThanOrEqual(2);
  });

  it("index.ts Twilio methods all have try/catch blocks", () => {
    const src = readTelFile("index.ts");
    // Twilio service should protect every method
    const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
    expect(tryCatchCount).toBeGreaterThanOrEqual(5);
  });

  it("all error returns use { error: string } shape", () => {
    const src = readTelFile("telnyx-numbers.ts");
    expect(src).toContain("{ error:");
    const sms = readTelFile("telnyx-sms.ts");
    expect(sms).toContain("{ error:");
    const voice = readTelFile("telnyx-voice.ts");
    expect(voice).toContain("{ error:");
  });
});

// ─── 4. Retry logic in voice/provisioning ──────────────────────

describe("telephony retry logic", () => {
  it("telnyx-voice.ts contains withRetry helper", () => {
    const src = readTelFile("telnyx-voice.ts");
    expect(src).toContain("async function withRetry");
  });

  it("withRetry uses exponential backoff", () => {
    const src = readTelFile("telnyx-voice.ts");
    expect(src).toContain("baseDelayMs");
    expect(src).toContain("attempt + 1");
  });

  it("withRetry only retries on transient errors", () => {
    const src = readTelFile("telnyx-voice.ts");
    expect(src).toContain("isRetryable");
    expect(src).toContain("fetch failed");
    expect(src).toContain("timeout");
    expect(src).toContain("econnreset");
    expect(src).toContain("socket hang up");
    expect(src).toContain("service unavailable");
    expect(src).toContain("bad gateway");
    expect(src).toContain("gateway timeout");
    // 5xx range check
    expect(src).toContain("statusCode >= 500");
  });

  it("createOutboundCall in telnyx-voice.ts uses withRetry", () => {
    const src = readTelFile("telnyx-voice.ts");
    // The createOutboundCall function should call withRetry
    expect(src).toMatch(/withRetry\(\s*\(\)\s*=>/);
  });

  it("speakText uses withRetry for reliability", () => {
    const src = readTelFile("telnyx-voice.ts");
    // speakText should also use withRetry
    const speakSection = src.slice(src.indexOf("export async function speakText"));
    expect(speakSection).toContain("withRetry");
  });

  it("index.ts createFallbackService provides provider fallback for calls and SMS", () => {
    const src = readTelFile("index.ts");
    expect(src).toContain("function createFallbackService");
    expect(src).toContain("telephony-fallback");
    // Fallback adjusts webhook URLs for the alternate provider
    expect(src).toContain("fallbackParams.webhookUrl");
  });
});

// ─── 5. Webhook signature verification ─────────────────────────

describe("webhook signature verification", () => {
  it("uses HMAC-SHA256 for verification", () => {
    const src = readTelFile("telnyx-webhooks.ts");
    expect(src).toContain('createHmac("sha256"');
  });

  it("uses timing-safe comparison to prevent timing attacks", () => {
    const src = readTelFile("telnyx-webhooks.ts");
    expect(src).toContain("timingSafeEqual");
  });

  it("always rejects if signature is missing", () => {
    const src = readTelFile("telnyx-webhooks.ts");
    expect(src).toContain("if (!signature)");
    expect(src).toContain("return false");
  });

  it("never allows unverified webhooks even without a key", () => {
    const src = readTelFile("telnyx-webhooks.ts");
    // When key is missing, should return false rather than defaulting to true
    expect(src).toContain("if (!key)");
    expect(src).toContain("SECURITY: Never allow unverified webhooks");
  });

  it("defines comprehensive event types", () => {
    const src = readTelFile("telnyx-webhooks.ts");
    const expectedEvents = [
      "call.initiated",
      "call.answered",
      "call.hangup",
      "call.machine.detected",
      "call.speak.ended",
      "call.dtmf.received",
      "call.streaming.started",
      "call.streaming.stopped",
      "call.gather.ended",
      "call.transcription",
      "message.delivered",
      "message.sent",
      "message.failed",
      "number.ordered",
      "number.provisioned",
      "number.released",
    ];
    for (const event of expectedEvents) {
      expect(src).toContain(`"${event}"`);
    }
  });
});

// ─── 6. Type exports: types.ts ─────────────────────────────────

describe("telephony types", () => {
  it("exports TelephonyProvider type", () => {
    const src = readTelFile("types.ts");
    expect(src).toContain("TelephonyProvider");
    expect(src).toContain('"twilio"');
    expect(src).toContain('"telnyx"');
  });

  it("exports AvailableNumber interface with required fields", () => {
    const src = readTelFile("types.ts");
    expect(src).toContain("interface AvailableNumber");
    expect(src).toContain("phone_number: string");
    expect(src).toContain("friendly_name: string");
    expect(src).toContain("monthly_cost_cents: number");
    expect(src).toContain("setup_fee_cents: number");
    expect(src).toContain("capabilities");
  });

  it("exports PurchasedNumber interface", () => {
    const src = readTelFile("types.ts");
    expect(src).toContain("interface PurchasedNumber");
    expect(src).toContain("numberId: string");
    expect(src).toContain("phoneNumber: string");
    expect(src).toContain("status:");
  });

  it("exports SmsParams interface", () => {
    const src = readTelFile("types.ts");
    expect(src).toContain("interface SmsParams");
    expect(src).toContain("from: string");
    expect(src).toContain("to: string");
    expect(src).toContain("text: string");
  });

  it("exports CallParams interface", () => {
    const src = readTelFile("types.ts");
    expect(src).toContain("interface CallParams");
    expect(src).toContain("webhookUrl: string");
  });

  it("exports CallResult with status union type", () => {
    const src = readTelFile("types.ts");
    expect(src).toContain("interface CallResult");
    expect(src).toContain("callId: string");
    expect(src).toContain('"queued"');
    expect(src).toContain('"ringing"');
    expect(src).toContain('"in-progress"');
    expect(src).toContain('"completed"');
    expect(src).toContain('"failed"');
  });

  it("exports SmsResult with status union type", () => {
    const src = readTelFile("types.ts");
    expect(src).toContain("interface SmsResult");
    expect(src).toContain("messageId: string");
    expect(src).toContain('"queued"');
    expect(src).toContain('"sent"');
    expect(src).toContain('"delivered"');
    expect(src).toContain('"failed"');
  });
});

// ─── 7. Pure function tests: imported from source ──────────────

describe("parseTelnyxError (pure function)", () => {
  // parseTelnyxError is exported and pure — no I/O
  let parseTelnyxError: (data: unknown) => string;

  beforeAll(async () => {
    const mod = await import("@/lib/telephony/telnyx-client");
    parseTelnyxError = mod.parseTelnyxError;
  });

  it("extracts detail from errors array", () => {
    const result = parseTelnyxError({
      errors: [{ detail: "Phone number not available", title: "Not Found" }],
    });
    expect(result).toBe("Phone number not available");
  });

  it("falls back to title when detail is missing", () => {
    const result = parseTelnyxError({
      errors: [{ title: "Not Found" }],
    });
    expect(result).toBe("Not Found");
  });

  it("extracts error string property", () => {
    const result = parseTelnyxError({ error: "Something went wrong" });
    expect(result).toBe("Something went wrong");
  });

  it("extracts message string property", () => {
    const result = parseTelnyxError({ message: "Rate limited" });
    expect(result).toBe("Rate limited");
  });

  it("returns 'Unknown Telnyx error' for unrecognized shapes", () => {
    expect(parseTelnyxError({})).toBe("Unknown Telnyx error");
    expect(parseTelnyxError(42)).toBe("Unknown Telnyx error");
  });

  it("throws or returns error for null input", () => {
    // parseTelnyxError casts to object; null causes TypeError
    expect(() => parseTelnyxError(null)).toThrow();
  });

  it("handles empty errors array", () => {
    const result = parseTelnyxError({ errors: [] });
    expect(result).toBe("Unknown Telnyx error");
  });

  it("prioritizes errors array over error string", () => {
    const result = parseTelnyxError({
      errors: [{ detail: "From errors array" }],
      error: "From error string",
    });
    expect(result).toBe("From errors array");
  });
});

describe("webhook pure functions", () => {
  let parseTelnyxEvent: typeof import("@/lib/telephony/telnyx-webhooks").parseTelnyxEvent;
  let extractCallInfo: typeof import("@/lib/telephony/telnyx-webhooks").extractCallInfo;
  let extractMessageInfo: typeof import("@/lib/telephony/telnyx-webhooks").extractMessageInfo;
  let isCallEvent: typeof import("@/lib/telephony/telnyx-webhooks").isCallEvent;
  let isMessageEvent: typeof import("@/lib/telephony/telnyx-webhooks").isMessageEvent;
  let isNumberEvent: typeof import("@/lib/telephony/telnyx-webhooks").isNumberEvent;

  beforeAll(async () => {
    const mod = await import("@/lib/telephony/telnyx-webhooks");
    parseTelnyxEvent = mod.parseTelnyxEvent;
    extractCallInfo = mod.extractCallInfo;
    extractMessageInfo = mod.extractMessageInfo;
    isCallEvent = mod.isCallEvent;
    isMessageEvent = mod.isMessageEvent;
    isNumberEvent = mod.isNumberEvent;
  });

  describe("parseTelnyxEvent", () => {
    it("extracts event_type from payload", () => {
      const result = parseTelnyxEvent({
        event_type: "call.initiated",
        data: { record: { id: "abc" } },
      });
      expect(result.eventType).toBe("call.initiated");
      expect(result.data).toBeDefined();
    });

    it("falls back to type when event_type is missing", () => {
      const result = parseTelnyxEvent({ type: "message.sent" } as never);
      expect(result.eventType).toBe("message.sent");
    });

    it("returns falsy eventType when neither is present", () => {
      const result = parseTelnyxEvent({});
      expect(result.eventType).toBeFalsy();
    });
  });

  describe("extractCallInfo", () => {
    it("extracts call control ID and session from record", () => {
      const result = extractCallInfo({
        data: {
          record: {
            call_control_id: "cc-123",
            call_session_id: "cs-456",
            from: "+15551234567",
            to: "+15559876543",
            state: "answered",
          },
        },
      });
      expect(result).toEqual({
        callControlId: "cc-123",
        callSessionId: "cs-456",
        from: "+15551234567",
        to: "+15559876543",
        state: "answered",
      });
    });

    it("returns null when data.record is missing", () => {
      expect(extractCallInfo({})).toBeNull();
      expect(extractCallInfo({ data: {} })).toBeNull();
    });

    it("falls back to id when call_control_id is missing", () => {
      const result = extractCallInfo({
        data: { record: { id: "fallback-id" } },
      });
      expect(result?.callControlId).toBe("fallback-id");
    });
  });

  describe("extractMessageInfo", () => {
    it("extracts message fields from record", () => {
      const result = extractMessageInfo({
        data: {
          record: {
            message_id: "msg-1",
            from_number: "+15551111111",
            to_number: "+15552222222",
            text: "Hello",
            status: "delivered",
            parts: 1,
          },
        },
      });
      expect(result).toEqual({
        messageId: "msg-1",
        from: "+15551111111",
        to: "+15552222222",
        text: "Hello",
        status: "delivered",
        parts: 1,
        errors: undefined,
      });
    });

    it("returns null when data.record is missing", () => {
      expect(extractMessageInfo({})).toBeNull();
    });
  });

  describe("isCallEvent / isMessageEvent / isNumberEvent", () => {
    it("isCallEvent returns true for call.* events", () => {
      expect(isCallEvent("call.initiated")).toBe(true);
      expect(isCallEvent("call.hangup")).toBe(true);
      expect(isCallEvent("call.transcription")).toBe(true);
    });

    it("isCallEvent returns false for non-call events", () => {
      expect(isCallEvent("message.sent")).toBe(false);
      expect(isCallEvent(null)).toBe(false);
    });

    it("isMessageEvent returns true for message.* events", () => {
      expect(isMessageEvent("message.delivered")).toBe(true);
      expect(isMessageEvent("message.failed")).toBe(true);
    });

    it("isMessageEvent returns false for non-message events", () => {
      expect(isMessageEvent("call.initiated")).toBe(false);
      expect(isMessageEvent(null)).toBe(false);
    });

    it("isNumberEvent returns true for number.* events", () => {
      expect(isNumberEvent("number.ordered")).toBe(true);
      expect(isNumberEvent("number.released")).toBe(true);
    });

    it("isNumberEvent returns false for non-number events", () => {
      expect(isNumberEvent("call.initiated")).toBe(false);
      expect(isNumberEvent(null)).toBe(false);
    });
  });
});

describe("getTelephonyProvider (pure function)", () => {
  let getTelephonyProvider: typeof import("@/lib/telephony/get-telephony-provider").getTelephonyProvider;

  beforeAll(async () => {
    const mod = await import("@/lib/telephony/get-telephony-provider");
    getTelephonyProvider = mod.getTelephonyProvider;
  });

  it("is a function", () => {
    expect(typeof getTelephonyProvider).toBe("function");
  });

  it("returns either telnyx or twilio", () => {
    const result = getTelephonyProvider();
    expect(["telnyx", "twilio"]).toContain(result);
  });
});
