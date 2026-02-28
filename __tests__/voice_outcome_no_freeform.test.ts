/**
 * Invariant: voice outcome route does not store freeform notes in customer-facing surface.
 * notes_structured only.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice outcome no freeform", () => {
  it("outcome route uses notes_structured only for notes", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toContain("notes_structured");
    expect(route).not.toMatch(/notes\s*:|freeform|raw_notes|note_text/);
  });

  it("outcome route payload does not include unvalidated freeform text fields", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).not.toMatch(/payload\.notes\b|payload\.summary\s*=|body\.notes\s*\|\|/);
  });

  it("orientation lines are fixed factual strings only", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toContain("A call attempt occurred.");
    expect(route).toContain("A call connected.");
    expect(route).toContain("Consent was recorded on the call.");
    expect(route).toContain("Disclosure was delivered on the call.");
    expect(route).not.toMatch(/orientation\s*=\s*body\.|orientation\s*=\s*payload\./);
  });
});
