/**
 * Temporal stability: repeated coherent completion across time.
 * No scores, no ratings. Independent threads + multiple days required. Deterministic. ≤90 chars.
 */

import { describe, it, expect } from "vitest";
import {
  STATEMENT_WORK_CONSISTENT_ACROSS_OCCASIONS,
  STATEMENT_OUTCOME_OCCURRED_REPEATEDLY,
  STATEMENT_SIMILAR_OUTCOMES_SEPARATE_OCCASIONS,
  STATEMENT_PRESENCE_STABILITY,
  STATEMENT_PUBLIC_STABILITY,
  STATEMENT_PROOF_STABILITY,
  MAX_CHARS,
  trimDoctrine,
  workspaceHasTemporalStability,
  workspaceHasMultiDayStability,
  MIN_THREADS,
  MIN_DAYS,
} from "@/lib/temporal-stability";
import { isAdministrativeActivationAvailable } from "@/lib/operational-perception/settlement-context";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_STATEMENT_CHARS = 90;
const FORBIDDEN = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant|metric|percentage)\b/gi;

function hasDb(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" ||
      typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string")
  );
}

describe("temporal-stability", () => {
  describe("migration and schema", () => {
    it("migration file exists with temporal_stability_records table", () => {
      const content = readFileSync(
        path.join(ROOT, "supabase/migrations/temporal_stability_records.sql"),
        "utf-8"
      );
      expect(content).toContain("temporal_stability_records");
      expect(content).toContain("workspace_id");
      expect(content).toContain("stability_type");
      expect(content).toContain("first_observed_at");
      expect(content).toContain("last_confirmed_at");
      expect(content).toContain("occurrence_count");
      expect(content).toContain("independent_threads_count");
    });
    it("migration includes stability_type enum strings", () => {
      const content = readFileSync(
        path.join(ROOT, "supabase/migrations/temporal_stability_records.sql"),
        "utf-8"
      );
      expect(content).toContain("repeated_resolution");
      expect(content).toContain("repeated_confirmation");
      expect(content).toContain("repeated_settlement");
      expect(content).toContain("repeated_followthrough");
    });
  });

  describe("requires independent threads", () => {
    it("detector uses MIN_THREADS = 3", () => {
      expect(MIN_THREADS).toBe(3);
      const content = readFileSync(path.join(ROOT, "src/lib/temporal-stability/detect.ts"), "utf-8");
      expect(content).toMatch(/MIN_THREADS\s*=\s*3/);
    });
    it("detector only writes record when thread count >= MIN_THREADS", () => {
      const content = readFileSync(path.join(ROOT, "src/lib/temporal-stability/detect.ts"), "utf-8");
      expect(content).toMatch(/threadIds\.size\s*<\s*MIN_THREADS/);
    });
  });

  describe("requires multiple days", () => {
    it("detector uses MIN_DAYS = 2", () => {
      expect(MIN_DAYS).toBe(2);
      const content = readFileSync(path.join(ROOT, "src/lib/temporal-stability/detect.ts"), "utf-8");
      expect(content).toMatch(/MIN_DAYS\s*=\s*2/);
    });
    it("detector only writes record when day count >= MIN_DAYS", () => {
      const content = readFileSync(path.join(ROOT, "src/lib/temporal-stability/detect.ts"), "utf-8");
      expect(content).toMatch(/days\.size\s*<\s*MIN_DAYS/);
    });
    it("detector uses UTC date truncation", () => {
      const content = readFileSync(path.join(ROOT, "src/lib/temporal-stability/detect.ts"), "utf-8");
      expect(content).toMatch(/slice\(0,\s*10\)|utcDate/);
    });
    it("signals multi-day checks distinct UTC dates", () => {
      const content = readFileSync(path.join(ROOT, "src/lib/temporal-stability/signals.ts"), "utf-8");
      expect(content).toContain("first_observed_at");
      expect(content).toContain("last_confirmed_at");
      expect(content).toMatch(/slice\(0,\s*10\)/);
    });
  });

  describe("deterministic detection", () => {
    it("detector has no Math.random", () => {
      const content = readFileSync(path.join(ROOT, "src/lib/temporal-stability/detect.ts"), "utf-8");
      expect(content).not.toMatch(/Math\.random/);
    });
    it("workspaceHasTemporalStability and workspaceHasMultiDayStability are async booleans", async () => {
      expect(typeof workspaceHasTemporalStability).toBe("function");
      expect(typeof workspaceHasMultiDayStability).toBe("function");
      if (!hasDb()) return;
      const [hasStability, hasMultiDay] = await Promise.all([
        workspaceHasTemporalStability("00000000-0000-0000-0000-000000000000"),
        workspaceHasMultiDayStability("00000000-0000-0000-0000-000000000000"),
      ]);
      expect(typeof hasStability).toBe("boolean");
      expect(typeof hasMultiDay).toBe("boolean");
    });
  });

  describe("doctrine: no forbidden words, all lines ≤90", () => {
    it("presence statement is at most 90 chars", () => {
      expect(STATEMENT_PRESENCE_STABILITY.length).toBeLessThanOrEqual(MAX_STATEMENT_CHARS);
      expect(STATEMENT_WORK_CONSISTENT_ACROSS_OCCASIONS.length).toBeLessThanOrEqual(MAX_STATEMENT_CHARS);
    });
    it("public work statement is at most 90 chars", () => {
      expect(STATEMENT_PUBLIC_STABILITY.length).toBeLessThanOrEqual(MAX_STATEMENT_CHARS);
      expect(STATEMENT_OUTCOME_OCCURRED_REPEATEDLY.length).toBeLessThanOrEqual(MAX_STATEMENT_CHARS);
    });
    it("proof capsule statement is at most 90 chars", () => {
      expect(STATEMENT_PROOF_STABILITY.length).toBeLessThanOrEqual(MAX_STATEMENT_CHARS);
      expect(STATEMENT_SIMILAR_OUTCOMES_SEPARATE_OCCASIONS.length).toBeLessThanOrEqual(MAX_STATEMENT_CHARS);
    });
    it("MAX_CHARS is 90", () => {
      expect(MAX_CHARS).toBe(90);
    });
    it("doctrine statements have no forbidden words", () => {
      const statements = [
        STATEMENT_PRESENCE_STABILITY,
        STATEMENT_PUBLIC_STABILITY,
        STATEMENT_PROOF_STABILITY,
      ];
      for (const s of statements) {
        expect(FORBIDDEN.test(s), `statement should not contain forbidden word: ${s}`).toBe(false);
      }
    });
    it("trimDoctrine caps at MAX_CHARS and sanitizes", () => {
      const long = "a".repeat(100);
      expect(trimDoctrine(long).length).toBeLessThanOrEqual(MAX_CHARS);
      expect(trimDoctrine("  you  we  ")).not.toMatch(/\b(you|we)\b/);
    });
  });

  describe("cron route", () => {
    it("uses assertCronAuthorized", () => {
      const content = readFileSync(
        path.join(ROOT, "src/app/api/cron/temporal-stability/route.ts"),
        "utf-8"
      );
      expect(content).toContain("assertCronAuthorized");
    });
    it("uses runSafeCron with job name temporal-stability", () => {
      const content = readFileSync(
        path.join(ROOT, "src/app/api/cron/temporal-stability/route.ts"),
        "utf-8"
      );
      expect(content).toContain("runSafeCron");
      expect(content).toContain("temporal-stability");
    });
    it("records cron heartbeat for temporal-stability", () => {
      const content = readFileSync(
        path.join(ROOT, "src/app/api/cron/temporal-stability/route.ts"),
        "utf-8"
      );
      expect(content).toContain("recordCronHeartbeat");
      expect(content).toMatch(/recordCronHeartbeat\s*\(\s*["']temporal-stability["']\s*\)/);
    });
  });

  describe("operator-capsule presence stability", () => {
    it("operator-capsule adds presence stability line behind signal", () => {
      const content = readFileSync(
        path.join(ROOT, "src/app/api/operational/operator-capsule/route.ts"),
        "utf-8"
      );
      expect(content).toContain("workspaceHasTemporalStability");
      expect(content).toContain("STATEMENT_PRESENCE_STABILITY");
      expect(content).toMatch(/hasTemporalStability.*trim.*STATEMENT_PRESENCE_STABILITY/);
    });
  });

  describe("settlement gating uses stability", () => {
    it("settlement context imports workspaceHasMultiDayStability", () => {
      const content = readFileSync(path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"), "utf-8");
      expect(content).toContain("workspaceHasMultiDayStability");
      expect(content).toContain("@/lib/temporal-stability");
    });
    it("administrative activation requires multi-day stability", () => {
      const content = readFileSync(path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"), "utf-8");
      expect(content).toMatch(/multiDayStability/);
      expect(content).toMatch(/!multiDayStability.*return\s*false/);
    });
    it("isAdministrativeActivationAvailable returns false when multi-day stability absent", async () => {
      expect(typeof isAdministrativeActivationAvailable).toBe("function");
      if (!hasDb()) return;
      const result = await isAdministrativeActivationAvailable("00000000-0000-0000-0000-000000000000");
      expect(typeof result).toBe("boolean");
      expect(result).toBe(false);
    });
  });

  describe("multi-day stability gating (DB-optional)", () => {
    it("when DB available, workspace with no records has no multi-day stability", async () => {
      if (!hasDb()) return;
      const result = await workspaceHasMultiDayStability("00000000-0000-0000-0000-000000000000");
      expect(result).toBe(false);
    });
  });
});
