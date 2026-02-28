#!/usr/bin/env tsx
/**
 * Production gate: verify config, then self-check against live BASE_URL.
 * Fails fast if BASE_URL missing or not recall-touch.com.
 * Usage: BASE_URL=https://recall-touch.com npm run prod:gate
 */

import { spawnSync } from "child_process";
import path from "path";

const BASE_URL = process.env.BASE_URL?.trim();

if (!BASE_URL) {
  console.error("BASE_URL is required. Example: BASE_URL=https://recall-touch.com npm run prod:gate");
  process.exit(1);
}

const allowedHosts = ["recall-touch.com", "www.recall-touch.com"];
let host: string;
try {
  host = new URL(BASE_URL).hostname.toLowerCase();
} catch {
  console.error("[prod:gate] BASE_URL is not a valid URL");
  process.exit(1);
}

if (!allowedHosts.includes(host)) {
  console.error("[prod:gate] BASE_URL must be https://recall-touch.com or https://www.recall-touch.com");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const tsx = "tsx";

function run(name: string, script: string): boolean {
  const r = spawnSync(tsx, [path.join(root, script)], {
    stdio: "inherit",
    env: { ...process.env, BASE_URL },
    cwd: root,
  });
  if (r.status !== 0) {
    console.error(`[prod:gate] ${name} exited with ${r.status}`);
    return false;
  }
  return true;
}

if (!run("verify-prod-config", "scripts/verify-prod-config.ts")) process.exit(1);
if (!run("self-check", "scripts/self-check.ts")) process.exit(1);
process.exit(0);
