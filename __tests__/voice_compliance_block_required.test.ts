/**
 * Phase III — Voice compliance: required disclosures and consent; no freeform.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice compliance block required", () => {
  it("speech-governance compiler applies required_disclaimers before send", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("required_disclaimers");
    expect(compiler).toContain("resolveCompliancePack");
  });

  it("domain pack schema has recording_consent_required in regulatory_matrix", () => {
    const schema = readFileSync(path.join(ROOT, "src/lib/domain-packs/schema.ts"), "utf-8");
    expect(schema).toContain("recording_consent_required");
  });
});
