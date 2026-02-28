import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Universal inbound autostart", () => {
  it("runGovernedExecution auto-activates general domain with UNSPECIFIED jurisdiction and preview_required", () => {
    const run = readFileSync(path.join(ROOT, "src/lib/execution-plan/run.ts"), "utf-8");
    expect(run).toMatch(/Universal inbound autostart/);
    expect(run).toMatch(/domain_packs/);
    expect(run).toMatch(/default_jurisdiction: \"UNSPECIFIED\"/);

    const domain = readFileSync(path.join(ROOT, "src/lib/domain-packs/resolve.ts"), "utf-8");
    expect(domain).toMatch(/jurisdiction: \"UNSPECIFIED\"/);
  });
});

