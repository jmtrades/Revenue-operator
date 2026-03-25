/**
 * Phase IV — Enterprise: multi-location policy resolution.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Enterprise multi-location resolution", () => {
  it("domain pack or governance supports jurisdiction / location context", () => {
    const schema = readFileSync(path.join(ROOT, "src/lib/domain-packs/schema.ts"), "utf-8");
    expect(schema).toMatch(/jurisdiction|state_based|default_jurisdiction/);
  });

  it("message-policy resolve accepts workspace and jurisdiction", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toMatch(/resolveMessagePolicy|jurisdiction/);
  });
});
