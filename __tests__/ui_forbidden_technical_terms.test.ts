/**
 * Structural tests: UI pages do not expose internal technical terms to users.
 * Verifies: no raw table names, no internal IDs, no developer jargon in UI.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const INTERNAL_TABLE_NAMES = [
  "shared_transactions",
  "causal_chains",
  "continuation_exposures",
  "coordination_displacement_events",
  "operational_responsibilities",
  "operational_exposures",
  "thread_amendments",
  "doctrine_violations",
  "responsibility_moments",
  "proof_capsules",
  "raw_webhook_events",
  "action_intents",
];

const UI_PAGE_FILES = [
  "src/app/about/page.tsx",
  "src/app/features/page.tsx",
  "src/app/activate/page.tsx",
  "src/app/industries/page.tsx",
];

describe("UI pages do not expose internal database table names", () => {
  for (const filePath of UI_PAGE_FILES) {
    const fullPath = path.join(ROOT, filePath);
    if (existsSync(fullPath)) {
      const src = readFileSync(fullPath, "utf-8");

      describe(filePath, () => {
        for (const table of INTERNAL_TABLE_NAMES) {
          it(`does not contain "${table}"`, () => {
            expect(src).not.toContain(table);
          });
        }
      });
    }
  }
});

describe("UI pages do not expose internal type system names", () => {
  const internalTypes = [
    "IntentType",
    "AmendmentType",
    "AssignedRole",
    "RequiredAction",
    "ResultStatus",
    "UseModeKey",
    "ScenarioContextSource",
    "NormalizedInboundEvent",
    "SourceAdapterResult",
  ];

  for (const filePath of UI_PAGE_FILES) {
    const fullPath = path.join(ROOT, filePath);
    if (existsSync(fullPath)) {
      const src = readFileSync(fullPath, "utf-8");

      describe(filePath, () => {
        for (const typeName of internalTypes) {
          it(`does not expose "${typeName}" type name`, () => {
            expect(src).not.toContain(typeName);
          });
        }
      });
    }
  }
});

describe("onboarding components use user-friendly language", () => {
  const components = [
    "src/components/onboarding/ModeSelector.tsx",
    "src/components/onboarding/IndustrySelector.tsx",
  ];

  for (const filePath of components) {
    const fullPath = path.join(ROOT, filePath);
    if (existsSync(fullPath)) {
      const src = readFileSync(fullPath, "utf-8");

      describe(filePath, () => {
        it("does not reference internal table names", () => {
          for (const table of INTERNAL_TABLE_NAMES) {
            expect(src).not.toContain(table);
          }
        });

        it("does not contain raw SQL", () => {
          expect(src).not.toMatch(/SELECT\s+\*/i);
          expect(src).not.toMatch(/INSERT\s+INTO/i);
        });
      });
    }
  }
});
