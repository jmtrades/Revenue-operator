/**
 * Contract: public work respond route uses rate limit helpers, neutral when over limit, no internal ids in response.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ROUTE = path.join(ROOT, "src", "app", "api", "public", "work", "[external_ref]", "respond", "route.ts");

describe("Public work respond route contract", () => {
  it("uses rate limit helpers", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toContain("hashIpForPublicRecord");
    expect(content).toContain("checkPublicRecordRateLimit");
    expect(content).toContain("incrementPublicRecordRateLimit");
  });

  it("returns neutral response when over limit", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toContain("neutralResponse");
    expect(content).toMatch(/!allowed.*neutralResponse|if\s*\(\s*!allowed\s*\)/);
  });

  it("does not expose internal ids in response", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).not.toMatch(/NextResponse\.json\([^)]*transactionId|transaction_id|workspace_id\s*:/);
    expect(content).toContain("NextResponse.json({ ok: false })");
    expect(content).toContain("ok: true");
  });

  it("accepts confirm, dispute, info and post-confirmation action types", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toContain("confirm");
    expect(content).toContain("dispute");
    expect(content).toContain("info");
    expect(content).toContain("request_adjustment");
    expect(content).toContain("acknowledge_responsibility");
  });
});
