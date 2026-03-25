/**
 * Strategy expansion: no Math.random, no crypto.randomUUID, no provider imports.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FILES = [
  "src/lib/intelligence/strategy-effectiveness.ts",
  "src/lib/intelligence/commitment-decay.ts",
  "src/lib/intelligence/strategic-horizon.ts",
];

describe("No random in strategy expansion", () => {
  for (const file of FILES) {
    it(`${file} has no Math.random() call`, () => {
      const content = readFileSync(path.join(ROOT, file), "utf-8");
      expect(content).not.toMatch(/Math\.random\s*\(/);
    });
    it(`${file} has no crypto.randomUUID() call`, () => {
      const content = readFileSync(path.join(ROOT, file), "utf-8");
      expect(content).not.toMatch(/randomUUID\s*\(/);
    });
    it(`${file} does not import Twilio/Stripe/email SDKs`, () => {
      const content = readFileSync(path.join(ROOT, file), "utf-8");
      expect(content).not.toMatch(/from\s+["']twilio|@twilio/);
      expect(content).not.toMatch(/from\s+["']stripe|@stripe/);
      expect(content).not.toMatch(/nodemailer|sendgrid|resend/);
    });
  }
});
