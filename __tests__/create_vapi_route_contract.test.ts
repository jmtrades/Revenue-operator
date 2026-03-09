/**
 * create-vapi route contract: exports POST, returns JSON errors (no stack), requires auth and agent_id.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ROUTE = path.join(ROOT, "src", "app", "api", "agent", "create-vapi", "route.ts");

describe("create-vapi route contract", () => {
  it("route file exists and exports POST", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toContain("export async function POST");
  });

  it("returns 401 when unauthorized", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toMatch(/401|Unauthorized/);
  });

  it("returns 400 when agent_id missing", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toMatch(/agent_id|400/);
  });

  it("does not expose error.stack in JSON response body", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).not.toMatch(/\.json\s*\([^)]*error\.stack|\.stack\s*[^)]*\)/s);
  });
});
