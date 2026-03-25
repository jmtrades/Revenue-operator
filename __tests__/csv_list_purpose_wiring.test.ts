/**
 * CSV list purpose wiring. Purpose influences scenario selection. List execution safety.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const BUILD = path.join(ROOT, "src/lib/execution-plan/build.ts");
const INGEST = path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts");

describe("CSV list purpose wiring", () => {
  it("build uses domainHints.list_purpose for scenario context", () => {
    const content = readFileSync(BUILD, "utf-8");
    expect(content).toContain("list_purpose");
    expect(content).toContain("list_run");
    expect(content).toContain("resolveScenarioProfile");
  });

  it("list_execution without profile forces emit_preview in build", () => {
    const content = readFileSync(BUILD, "utf-8");
    expect(content).toContain("list_execution");
    expect(content).toContain("emit_preview");
    expect(content).toContain("!scenarioProfile");
  });

  it("ingest accepts domain_hints from body", () => {
    const content = readFileSync(INGEST, "utf-8");
    expect(content).toContain("domain_hints");
  });
});
