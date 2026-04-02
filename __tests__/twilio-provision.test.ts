/**
 * Structural tests for src/lib/telephony/
 * Verifies: Telnyx as primary provider, fallback logic, number provisioning, types.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("telephony module shape", () => {
  const indexPath = path.join(ROOT, "src/lib/telephony/index.ts");

  it("telephony index exists", () => {
    expect(existsSync(indexPath)).toBe(true);
  });

  const src = readFileSync(indexPath, "utf-8");

  it("exports TelephonyService interface", () => {
    expect(src).toContain("export interface TelephonyService");
  });

  it("exports getTelephonyService function", () => {
    expect(src).toContain("export function getTelephonyService");
  });

  it("exports createTelnyxService", () => {
    expect(src).toContain("createTelnyxService");
  });

  it("exports createTwilioService", () => {
    expect(src).toContain("createTwilioService");
  });

  it("TelephonyService has sendSms method", () => {
    expect(src).toContain("sendSms(");
  });

  it("TelephonyService has searchAvailableNumbers method", () => {
    expect(src).toContain("searchAvailableNumbers(");
  });

  it("TelephonyService has purchaseNumber method", () => {
    expect(src).toContain("purchaseNumber(");
  });

  it("TelephonyService has releaseNumber method", () => {
    expect(src).toContain("releaseNumber(");
  });

  it("TelephonyService has createOutboundCall method", () => {
    expect(src).toContain("createOutboundCall(");
  });
});

describe("telephony provider selection", () => {
  const providerPath = path.join(ROOT, "src/lib/telephony/get-telephony-provider.ts");

  it("provider selector exists", () => {
    expect(existsSync(providerPath)).toBe(true);
  });

  const src = readFileSync(providerPath, "utf-8");

  it("exports getTelephonyProvider", () => {
    expect(src).toContain("export function getTelephonyProvider");
  });

  it("checks TELEPHONY_PROVIDER env var", () => {
    expect(src).toContain("TELEPHONY_PROVIDER");
  });

  it("defaults to telnyx when no config", () => {
    expect(src).toContain('return "telnyx"');
  });

  it("auto-detects Telnyx from TELNYX_API_KEY", () => {
    expect(src).toContain("TELNYX_API_KEY");
  });

  it("auto-detects Twilio from TWILIO_ACCOUNT_SID", () => {
    expect(src).toContain("TWILIO_ACCOUNT_SID");
  });

  it("prefers Telnyx over Twilio in auto-detection", () => {
    // Telnyx check comes before Twilio check
    const telnyxIdx = src.indexOf("TELNYX_API_KEY");
    const twilioIdx = src.indexOf("TWILIO_ACCOUNT_SID");
    expect(telnyxIdx).toBeLessThan(twilioIdx);
  });
});

describe("telephony fallback / retry logic", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/telephony/index.ts"), "utf-8");

  it("has createFallbackService for provider failover", () => {
    expect(src).toContain("createFallbackService");
  });

  it("fallback retries on primary failure for outbound calls", () => {
    expect(src).toContain("telephony-fallback");
    expect(src).toContain("trying");
  });

  it("fallback retries SMS on primary failure", () => {
    expect(src).toContain("SMS failed");
  });

  it("adjusts webhook URLs when falling back between providers", () => {
    expect(src).toContain("/webhooks/telnyx/voice");
    expect(src).toContain("/webhooks/twilio/voice");
  });

  it("checks TELEPHONY_FALLBACK_PROVIDER env var", () => {
    expect(src).toContain("TELEPHONY_FALLBACK_PROVIDER");
  });
});

describe("telnyx number provisioning", () => {
  const numbersPath = path.join(ROOT, "src/lib/telephony/telnyx-numbers.ts");

  it("telnyx-numbers module exists", () => {
    expect(existsSync(numbersPath)).toBe(true);
  });

  const src = readFileSync(numbersPath, "utf-8");

  it("exports searchAvailableNumbers", () => {
    expect(src).toContain("export async function searchAvailableNumbers");
  });

  it("exports purchaseNumber", () => {
    expect(src).toContain("export async function purchaseNumber");
  });

  it("exports releaseNumber", () => {
    expect(src).toContain("export async function releaseNumber");
  });

  it("exports getPhoneNumberDetails", () => {
    expect(src).toContain("export async function getPhoneNumberDetails");
  });

  it("uses Telnyx v2 API endpoints", () => {
    expect(src).toContain("api.telnyx.com/v2");
  });

  it("supports local, toll_free, mobile number types", () => {
    expect(src).toContain('"local"');
    expect(src).toContain('"toll_free"');
    expect(src).toContain('"mobile"');
  });

  it("extracts capabilities from Telnyx features array", () => {
    expect(src).toContain("extractCapabilities");
  });
});

describe("telephony types", () => {
  const typesPath = path.join(ROOT, "src/lib/telephony/types.ts");

  it("types module exists", () => {
    expect(existsSync(typesPath)).toBe(true);
  });

  const src = readFileSync(typesPath, "utf-8");

  it("exports TelephonyProvider type with telnyx and twilio", () => {
    expect(src).toContain("export type TelephonyProvider");
    expect(src).toContain('"twilio"');
    expect(src).toContain('"telnyx"');
  });

  it("exports AvailableNumber interface", () => {
    expect(src).toContain("export interface AvailableNumber");
  });

  it("exports PurchasedNumber interface", () => {
    expect(src).toContain("export interface PurchasedNumber");
  });

  it("exports SmsParams and SmsResult", () => {
    expect(src).toContain("export interface SmsParams");
    expect(src).toContain("export interface SmsResult");
  });

  it("exports CallParams and CallResult", () => {
    expect(src).toContain("export interface CallParams");
    expect(src).toContain("export interface CallResult");
  });
});
