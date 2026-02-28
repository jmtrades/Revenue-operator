/**
 * Invariant: Hosted executor never imports provider libraries (Twilio, Stripe client, etc.).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

const PROVIDER_IMPORTS = [
  "twilio",
  "stripe",
  "@twilio/",
  "sendgrid",
  "resend",
  "nodemailer",
  "createTransport",
  "twilioClient",
  "stripeClient",
];

describe("Hosted executor no provider imports", () => {
  it("hosted executor route does not import any delivery/provider library", () => {
    const route = read("src/app/api/cron/hosted-executor/route.ts");
    const lower = route.toLowerCase();
    for (const lib of PROVIDER_IMPORTS) {
      expect(lower).not.toMatch(new RegExp(`require\\(['"]${lib}|from ['"]${lib}|import.*${lib}`, "i"));
    }
  });
});
