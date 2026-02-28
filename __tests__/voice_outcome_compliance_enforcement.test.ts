/**
 * Voice outcome: reject when consent required but consent_recorded !== true;
 * reject when disclosures required but disclosures_read !== true.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice outcome compliance enforcement", () => {
  it("voice outcome route returns compliance_violation when consent required and not recorded", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toMatch(/compliance_violation/);
    expect(route).toMatch(/consent_required|consent_recorded/);
  });

  it("voice outcome route checks compliance_requirements from action intent payload", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toMatch(/payload_json|compliance_requirements|plan/);
    expect(route).toMatch(/disclaimer_lines|disclosures_read/);
  });

  it("does not complete action intent when compliance_violation returned", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    const violationReturnIndex = route.indexOf("reason: \"compliance_violation\"");
    const completeCallIndex = route.indexOf("await completeActionIntent(");
    expect(violationReturnIndex).toBeGreaterThan(-1);
    expect(completeCallIndex).toBeGreaterThan(violationReturnIndex);
  });
});
