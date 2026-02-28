/**
 * Triage reason determinism. Same input → same output. Unknown routes safely.
 */

import { describe, it, expect } from "vitest";
import { resolveTriageReason } from "../src/lib/scenarios/triage";

describe("Triage reason determinism", () => {
  it("same input yields same output", () => {
    const input = { intent_type: "question", risk_flags: [] };
    expect(resolveTriageReason(input)).toEqual(resolveTriageReason(input));
  });

  it("unknown yields recommended_primary route (safe)", () => {
    const out = resolveTriageReason({ intent_type: "other", risk_flags: [] });
    expect(out.triage_reason).toBe("unknown");
    expect(out.recommended_primary).toBe("route");
  });

  it("hostile risk flag yields escalate", () => {
    const out = resolveTriageReason({ risk_flags: ["anger"] });
    expect(out.triage_reason).toBe("hostile");
    expect(out.recommended_primary).toBe("escalate");
  });

  it("no Math.random or crypto in triage", () => {
    const path = require("path");
    const fs = require("fs");
    const full = path.resolve(__dirname, "../src/lib/scenarios/triage.ts");
    const content = fs.readFileSync(full, "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
  });
});
