import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Self-healing execution integrity", () => {
  it("self-healing cron exists and uses action intents only", () => {
    const file = path.join(ROOT, "src/app/api/cron/self-healing/route.ts");
    const content = readFileSync(file, "utf-8");
    expect(content).toMatch(/self-healing execution layer/);
    expect(content).toMatch(/createActionIntent/);
    expect(content).not.toMatch(/sendOutbound|sendViaTwilio/);
  });
});

