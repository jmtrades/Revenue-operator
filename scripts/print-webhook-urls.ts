#!/usr/bin/env npx tsx
/**
 * Print webhook URLs for production. Set NEXT_PUBLIC_APP_URL in .env or pass as first arg.
 * Usage: npx tsx scripts/print-webhook-urls.ts [https://www.recall-touch.com]
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let base = process.argv[2]?.trim();
if (!base) {
  for (const name of [".env", ".env.local"]) {
    const p = path.join(ROOT, name);
    if (!existsSync(p)) continue;
    const content = readFileSync(p, "utf-8");
    const m = content.match(/NEXT_PUBLIC_APP_URL\s*=\s*(.+)/);
    if (m) {
      base = m[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }
}
const origin = base || "https://www.recall-touch.com";

console.log("Webhook URLs (copy into Stripe / Vapi / Twilio):\n");
console.log("Stripe:");
console.log(`  ${origin}/api/billing/webhook\n`);
console.log("Vapi:");
console.log(`  ${origin}/api/webhooks/vapi\n`);
console.log("Twilio SMS (A message comes in):");
console.log(`  ${origin}/api/webhooks/twilio/inbound\n`);
console.log("Twilio Voice (A call comes in):");
console.log(`  ${origin}/api/webhooks/twilio/voice\n`);
console.log("Google Calendar redirect URI (if using):");
console.log(`  ${origin}/api/integrations/google-calendar/callback\n`);
