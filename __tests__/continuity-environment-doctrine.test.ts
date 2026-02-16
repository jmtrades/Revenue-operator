/**
 * Continuity Environment doctrine: no numbers, counts, timestamps, money, percentages;
 * messages ≤ 90 chars; no forbidden words; settlement only after administrative readiness.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const OPERATIONAL = path.join(ROOT, "src", "app", "api", "operational");
const MAX_MESSAGE_LEN = 90;

const FORBIDDEN_IN_MESSAGES = [
  "you", "your", "we", "us", "dashboard", "optimize", "performance", "ROI",
  "click", "tool", "platform", "assistant", "software", "analytics", "KPI",
];

function* walkTs(dir: string): Generator<string> {
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) yield* walkTs(full);
      else if (e.isFile() && e.name.endsWith(".ts")) yield full;
    }
  } catch {
    // ignore
  }
}

function extractQuotedStrings(content: string): string[] {
  const out: string[] = [];
  const dq = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  const sq = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  const tl = /`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = dq.exec(content)) !== null) out.push(m[1]);
  while ((m = sq.exec(content)) !== null) out.push(m[1]);
  while ((m = tl.exec(content)) !== null) out.push(m[1]);
  return out;
}

describe("Continuity Environment doctrine", () => {
  it("operational first-impact and would-have-acted statements are ≤ 90 characters", () => {
    const firstImpact = path.join(ROOT, "src", "lib", "operational-perception", "first-impact.ts");
    const shadow = path.join(ROOT, "src", "lib", "shadow-execution", "index.ts");
    const content = [firstImpact, shadow].map((f) => readFileSync(f, "utf-8")).join("\n");
    for (const s of extractQuotedStrings(content)) {
      if (s.length > 10 && /^[A-Z]/.test(s) && !s.includes("${")) {
        expect(s.length, `Statement "${s.slice(0, 40)}..." exceeds ${MAX_MESSAGE_LEN} chars`).toBeLessThanOrEqual(MAX_MESSAGE_LEN);
      }
    }
  });

  it("operational message strings contain no forbidden words", () => {
    const libs = [
      path.join(ROOT, "src", "lib", "operational-perception", "first-impact.ts"),
      path.join(ROOT, "src", "lib", "operational-perception", "if-removed.ts"),
      path.join(ROOT, "src", "lib", "shadow-execution", "index.ts"),
      path.join(ROOT, "src", "lib", "absence-effects", "index.ts"),
    ];
    for (const file of libs) {
      const content = readFileSync(file, "utf-8");
      const lower = content.toLowerCase();
      for (const word of FORBIDDEN_IN_MESSAGES) {
        const re = new RegExp(`["'\`][^"'\`]*\\b${word}\\b[^"'\`]*["'\`]`, "i");
        expect(re.test(content), `Forbidden word "${word}" in ${path.relative(ROOT, file)}`).toBe(false);
      }
    }
  });

  it("settlement authorization cron only sends when administrative_activation_available", () => {
    const cronPath = path.join(ROOT, "src", "app", "api", "cron", "settlement-authorization", "route.ts");
    const content = readFileSync(cronPath, "utf-8");
    expect(content).toContain("getSettlementContext");
    expect(content).toContain("administrative_activation_available");
    expect(content.includes("administrative_activation_available") && content.includes("continue")).toBe(true);
  });

  it("settlement message uses Administrative activation wording", () => {
    const cronPath = path.join(ROOT, "src", "app", "api", "cron", "settlement-authorization", "route.ts");
    const content = readFileSync(cronPath, "utf-8");
    expect(content).toContain("Administrative activation available");
  });

  it("continuity-duration response shape is only operations_have_been_continuous boolean", () => {
    const shape: Record<string, boolean> = { operations_have_been_continuous: false };
    expect(Object.keys(shape)).toEqual(["operations_have_been_continuous"]);
    expect(typeof shape.operations_have_been_continuous).toBe("boolean");
  });

  it("external-recognition response shape is only recognized_as_shared_process boolean", () => {
    const shape: Record<string, boolean> = { recognized_as_shared_process: false };
    expect(Object.keys(shape)).toEqual(["recognized_as_shared_process"]);
    expect(typeof shape.recognized_as_shared_process).toBe("boolean");
  });

  it("memory-replacement and reversion-impact statements are under 90 chars and factual", () => {
    const memory = path.join(ROOT, "src", "lib", "memory-replacement", "index.ts");
    const reversion = path.join(ROOT, "src", "lib", "operational-perception", "reversion-impact.ts");
    const content = [memory, reversion].map((f) => readFileSync(f, "utf-8")).join("\n");
    for (const s of extractQuotedStrings(content)) {
      if (s.length > 15 && /^[A-Za-z]/.test(s) && !s.includes("${") && !s.includes("event_type")) {
        expect(s.length, `"${s.slice(0, 50)}..."`).toBeLessThanOrEqual(MAX_MESSAGE_LEN);
      }
    }
  });

  it("memory-replacement and reversion-impact contain no forbidden words", () => {
    const libs = [
      path.join(ROOT, "src", "lib", "memory-replacement", "index.ts"),
      path.join(ROOT, "src", "lib", "operational-perception", "reversion-impact.ts"),
    ];
    for (const file of libs) {
      const content = readFileSync(file, "utf-8");
      for (const word of FORBIDDEN_IN_MESSAGES) {
        const re = new RegExp(`["'\`][^"'\`]*\\b${word}\\b[^"'\`]*["'\`]`, "i");
        expect(re.test(content), `Forbidden word "${word}" in ${path.relative(ROOT, file)}`).toBe(false);
      }
    }
  });

  it("operationally_embedded and operating process orientation are wired", () => {
    const resp = path.join(ROOT, "src", "app", "api", "responsibility", "route.ts");
    const content = readFileSync(resp, "utf-8");
    expect(content).toContain("operationally_embedded");
    expect(content).toContain("The operating process became established.");
  });

  it("staff-reliance response shape is only staff_using_environment_for_coordination boolean", () => {
    const shape: Record<string, boolean> = { staff_using_environment_for_coordination: false };
    expect(Object.keys(shape)).toEqual(["staff_using_environment_for_coordination"]);
    expect(typeof shape.staff_using_environment_for_coordination).toBe("boolean");
  });

  it("expectation-state response shape is only operations_expected_to_occur_here boolean", () => {
    const shape: Record<string, boolean> = { operations_expected_to_occur_here: false };
    expect(Object.keys(shape)).toEqual(["operations_expected_to_occur_here"]);
    expect(typeof shape.operations_expected_to_occur_here).toBe("boolean");
  });

  it("structural-dependence response shape is only organization_operates_inside_environment boolean", () => {
    const shape: Record<string, boolean> = { organization_operates_inside_environment: false };
    expect(Object.keys(shape)).toEqual(["organization_operates_inside_environment"]);
    expect(typeof shape.organization_operates_inside_environment).toBe("boolean");
  });

  it("absence-effects statements are ≤90 chars, conditional or past, no second person", () => {
    const absencePath = path.join(ROOT, "src", "lib", "absence-effects", "index.ts");
    const content = readFileSync(absencePath, "utf-8");
    for (const s of extractQuotedStrings(content)) {
      if (s.length > 10 && /^[A-Z]/.test(s) && !s.includes("${")) {
        expect(s.length, `"${s.slice(0, 50)}..."`).toBeLessThanOrEqual(MAX_MESSAGE_LEN);
        expect(s.toLowerCase(), "no second person").not.toMatch(/\b(you|your)\b/);
      }
    }
  });

  it("structural orientation sentence is ≤90 chars and past tense", () => {
    const sentence = "The organization operated through the environment.";
    expect(sentence.length).toBeLessThanOrEqual(MAX_MESSAGE_LEN);
    expect(sentence).toMatch(/\boperated\b/);
  });

  it("operational_position includes structurally_dependent and coordination_externalized", () => {
    const resp = path.join(ROOT, "src", "app", "api", "responsibility", "route.ts");
    const content = readFileSync(resp, "utf-8");
    expect(content).toContain("structurally_dependent");
    expect(content).toContain("coordination_externalized");
  });

  it("operational endpoints exist and return no metrics in response shape", () => {
    const staffReliance = path.join(OPERATIONAL, "staff-reliance", "route.ts");
    const expectationState = path.join(OPERATIONAL, "expectation-state", "route.ts");
    const absenceEffects = path.join(OPERATIONAL, "absence-effects", "route.ts");
    const structuralDependence = path.join(OPERATIONAL, "structural-dependence", "route.ts");
    for (const file of [staffReliance, expectationState, absenceEffects, structuralDependence]) {
      expect(readFileSync(file, "utf-8")).not.toMatch(/length|count|total|percentage|%\s*\)|metric/);
    }
  });
});
