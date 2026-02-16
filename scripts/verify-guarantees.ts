#!/usr/bin/env npx tsx
/**
 * Pre-build guarantee verification. Exit 1 if any guarantee contract test fails.
 * Ensures the operator cannot be built in an unsafe state.
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function runVitest(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["vitest", "run", "__tests__/guarantee-contract.test.ts", "__tests__/guarantee-preservation.test.ts", "--reporter=verbose"],
      { cwd: root, stdio: "inherit", shell: true }
    );
    child.on("close", (code) => resolve(code === 0));
  });
}

async function main(): Promise<void> {
  console.log("Verifying guarantee contracts...");
  const ok = await runVitest();
  if (!ok) {
    console.error("Guarantee verification failed. Build aborted.");
    process.exit(1);
  }
  console.log("Guarantee verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
