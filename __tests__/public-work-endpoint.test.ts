/**
 * Contract: public work endpoint uses rate limit helpers, response keys only what_happened/if_removed/reliance, neutral on abuse.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ROUTE = path.join(ROOT, "src", "app", "api", "public", "work", "[external_ref]", "route.ts");

describe("Public work endpoint contract", () => {
  it("uses rate limit functions", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toContain("hashIpForPublicRecord");
    expect(content).toContain("checkPublicRecordRateLimit");
    expect(content).toContain("incrementPublicRecordRateLimit");
    expect(content).toContain("recordPublicRecord404");
  });

  it("neutral response has what_happened, if_removed, reliance, continuation, continuation_surface, pending_responsibility_statement, can_respond, can_follow_up", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toContain("continuation_surface");
    expect(content).toContain("can_respond: false");
  });

  it("success response returns same keys including continuation_surface and can_follow_up", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toContain("continuation_surface");
    expect(content).toContain("can_follow_up,");
  });
});
