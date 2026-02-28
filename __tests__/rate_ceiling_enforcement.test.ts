import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Workspace rate ceiling enforcement", () => {
  it("rate limit helper exists and emit layer references it", () => {
    const helper = readFileSync(path.join(ROOT, "src/lib/execution-plan/rate-limits.ts"), "utf-8");
    expect(helper).toMatch(/workspace_rate_limits/);
    expect(helper).toMatch(/RateLimitExceededError/);

    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toMatch(/assertWithinRateLimit/);
    expect(emit).toMatch(/send_message/);
    expect(emit).toMatch(/place_outbound_call/);
  });
});

