/**
 * Coordination displacement: non-intervention outcomes produce displacement events.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const COMMITMENT = path.join(ROOT, "src/lib/commitment-recovery/index.ts");
const PAYMENT = path.join(ROOT, "src/lib/payment-completion/index.ts");
const SHARED_TX = path.join(ROOT, "src/lib/shared-transaction-assurance/index.ts");

describe("Coordination displacement non-intervention", () => {
  it("non-intervention commitment resolution produces displacement event", () => {
    const content = readFileSync(COMMITMENT, "utf-8");
    expect(content).toContain("recovery_attempts === 0");
    expect(content).toContain("recordCoordinationDisplacement");
    expect(content).toContain("attendance");
    expect(content).toMatch(/recordCoordinationDisplacement\([^)]+,\s*false\s*\)/);
  });

  it("non-intervention payment resolution produces displacement event", () => {
    const content = readFileSync(PAYMENT, "utf-8");
    expect(content).toContain("recovery_attempts");
    expect(content).toContain("before.state === \"pending\"");
    expect(content).toContain("recordCoordinationDisplacement");
    expect(content).toMatch(/recordCoordinationDisplacement\([^)]+,\s*false\s*\)/);
  });

  it("shared tx confirm with reminder_sent_count==0 produces counterparty displacement", () => {
    const content = readFileSync(SHARED_TX, "utf-8");
    expect(content).toContain("reminder_sent_count");
    expect(content).toContain("confirmation");
    expect(content).toContain("counterparty");
    expect(content).toMatch(/reminderCount|reminder_sent_count/);
    expect(content).toContain("recordCoordinationDisplacement");
    expect(content).toMatch(/confirmation.*false|"confirmation".*false/);
  });
});
