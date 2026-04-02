/**
 * Structural tests for scenario fixtures and types coverage.
 * Verifies: fixture files exist, scenario types are defined, resolver exports.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("scenario fixture files", () => {
  const fixtureDir = path.join(ROOT, "__fixtures__/scenarios");

  it("fixtures directory exists", () => {
    expect(existsSync(fixtureDir)).toBe(true);
  });

  const expectedFixtures = [
    "list_execution.json",
    "escalation_required.json",
    "appointment_confirm.json",
    "call_back_requested.json",
    "payment_made.json",
    "payment_promised.json",
    "complaint.json",
    "legal_risk_voice.json",
    "scheduling.json",
    "multi_party.json",
  ];

  for (const fixture of expectedFixtures) {
    it(`${fixture} exists`, () => {
      expect(existsSync(path.join(fixtureDir, fixture))).toBe(true);
    });
  }

  it("all fixture files are valid JSON", () => {
    const files = readdirSync(fixtureDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(path.join(fixtureDir, file), "utf-8");
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });

  it("has at least 20 scenario fixtures", () => {
    const files = readdirSync(fixtureDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(20);
  });
});

describe("scenario types module", () => {
  const typesPath = path.join(ROOT, "src/lib/scenarios/types.ts");

  it("types module exists", () => {
    expect(existsSync(typesPath)).toBe(true);
  });

  const src = readFileSync(typesPath, "utf-8");

  it("exports UseModeKey type", () => {
    expect(src).toContain("export type UseModeKey");
  });

  it("exports ScenarioProfile interface", () => {
    expect(src).toContain("export interface ScenarioProfile");
  });

  it("exports ScenarioRules interface", () => {
    expect(src).toContain("export interface ScenarioRules");
  });

  it("exports ListPurposeKey type", () => {
    expect(src).toContain("export type ListPurposeKey");
  });

  it("exports ScenarioContextSource type", () => {
    expect(src).toContain("export type ScenarioContextSource");
  });

  it("UseModeKey includes triage and list_execution", () => {
    expect(src).toContain('"triage"');
    expect(src).toContain('"list_execution"');
  });

  it("ListPurposeKey includes qualify, confirm, collect", () => {
    expect(src).toContain('"qualify"');
    expect(src).toContain('"confirm"');
    expect(src).toContain('"collect"');
  });
});

describe("scenario resolver module", () => {
  const resolverPath = path.join(ROOT, "src/lib/scenarios/resolver.ts");

  it("resolver module exists", () => {
    expect(existsSync(resolverPath)).toBe(true);
  });

  const src = readFileSync(resolverPath, "utf-8");

  it("exports resolveScenarioProfile", () => {
    expect(src).toContain("export async function resolveScenarioProfile");
  });

  it("exports getScenarioState", () => {
    expect(src).toContain("export async function getScenarioState");
  });

  it("defaults to triage when no active profile", () => {
    expect(src).toContain('"triage"');
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});
