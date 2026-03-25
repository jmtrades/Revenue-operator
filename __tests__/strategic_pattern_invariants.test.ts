/**
 * Strategic pattern: deterministic guard, no DELETE/TRUNCATE, no random, no provider imports.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { evaluateStrategicGuard } from "../src/lib/intelligence/strategic-pattern";

const ROOT = path.resolve(__dirname, "..");

describe("Strategic pattern invariants", () => {
  it("migration has no DELETE FROM or TRUNCATE TABLE", () => {
    const p = path.join(ROOT, "supabase/migrations/strategic_pattern_registry.sql");
    const sql = readFileSync(p, "utf-8");
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\s+from\b/);
    expect(sql.toLowerCase()).not.toMatch(/\btruncate\s+table\b/);
  });

  it("strategic-pattern.ts has no .delete( or .truncate(", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/strategic-pattern.ts"), "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
    expect(content).not.toMatch(/\.truncate\s*\(/);
  });

  it("evaluateStrategicGuard is deterministic", () => {
    const pattern = {
      persuasion_attempts: 2,
      clarification_attempts: 0,
      compliance_forward_attempts: 0,
      hard_close_attempts: 0,
      escalation_attempts: 0,
      last_updated_at: "",
    };
    const a = evaluateStrategicGuard(pattern, 50, 0);
    const b = evaluateStrategicGuard(pattern, 50, 0);
    expect(a).toEqual(b);
  });

  it("persuasion_attempts >= 2 and no commitment delta → blockVariant persuasion", () => {
    const r = evaluateStrategicGuard(
      { persuasion_attempts: 2, clarification_attempts: 0, compliance_forward_attempts: 0, hard_close_attempts: 0, escalation_attempts: 0, last_updated_at: "" },
      50,
      0
    );
    expect(r.blockVariant).toBe("persuasion");
  });

  it("escalation_attempts >= 2 → forceEscalation", () => {
    const r = evaluateStrategicGuard(
      { persuasion_attempts: 0, clarification_attempts: 0, compliance_forward_attempts: 0, hard_close_attempts: 0, escalation_attempts: 2, last_updated_at: "" },
      50,
      0
    );
    expect(r.forceEscalation).toBe(true);
  });

  it("hard_close_attempts >= 2 and goodwill < 20 → forcePause", () => {
    const r = evaluateStrategicGuard(
      { persuasion_attempts: 0, clarification_attempts: 0, compliance_forward_attempts: 0, hard_close_attempts: 2, escalation_attempts: 0, last_updated_at: "" },
      15,
      0
    );
    expect(r.forcePause).toBe(true);
  });

  it("no Math.random or crypto.randomUUID in strategic-pattern.ts", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/strategic-pattern.ts"), "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
  });

  it("strategic-pattern does not import Twilio/Stripe/email SDKs", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/strategic-pattern.ts"), "utf-8");
    expect(content).not.toMatch(/from\s+["']twilio|@twilio/);
    expect(content).not.toMatch(/from\s+["']stripe|@stripe/);
    expect(content).not.toMatch(/nodemailer|sendgrid|resend/);
  });
});
