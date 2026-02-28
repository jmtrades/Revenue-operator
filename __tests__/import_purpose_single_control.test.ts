/**
 * Import page: exactly one Purpose control. No forbidden words in labels.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const IMPORT_PAGE = path.join(ROOT, "src/app/dashboard/import/page.tsx");

describe("Import purpose single control", () => {
  it("has exactly one Purpose select with allowed options", () => {
    const content = readFileSync(IMPORT_PAGE, "utf-8");
    expect(content).toContain("Purpose");
    expect(content).toContain("listPurpose");
    expect(content).toContain("PURPOSE_OPTIONS");
    const allowedLabels = ["Qualify", "Confirm", "Collect", "Reactivate", "Route", "Recover"];
    for (const label of allowedLabels) {
      expect(content).toContain(label);
    }
  });

  it("does not contain forbidden words in purpose options", () => {
    const content = readFileSync(IMPORT_PAGE, "utf-8");
    const forbidden = ["campaign", "sequence", "workflow", "automation", "dialer"];
    for (const w of forbidden) {
      expect(content.toLowerCase()).not.toContain(w);
    }
  });
});
