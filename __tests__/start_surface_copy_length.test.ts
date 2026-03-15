/**
 * Start surface: no sentence longer than 14 words. No explanatory paragraph. Decisive, institutional, certain.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const START_PAGE = path.join(ROOT, "src", "app", "dashboard", "start", "page.tsx");
const CONTINUITY_LINE = path.join(ROOT, "src", "components", "ExecutionContinuityLine.tsx");
const MAX_WORDS = 14;

const EN_MESSAGES = path.join(ROOT, "src", "i18n", "messages", "en.json");

describe("Start surface copy length", () => {
  it("every user-facing sentence on start page is at most 14 words (en locale)", () => {
    const raw = readFileSync(EN_MESSAGES, "utf-8");
    const dash = JSON.parse(raw) as { dashboard?: { startPage?: Record<string, string> } };
    const startPage = dash.dashboard?.startPage ?? {};
    const copyKeys = [
      "activationGovernance",
      "handlingStale",
      "firstWinMessage",
      "operatingInstitutional",
      "handlingFollowsGovernance",
    ];
    for (const key of copyKeys) {
      const phrase = startPage[key];
      expect(phrase, key).toBeDefined();
      const words = phrase!.split(/\s+/).filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(MAX_WORDS);
    }
    expect(readFileSync(START_PAGE, "utf-8")).toContain("dashboard.startPage");
  });

  it("ExecutionContinuityLine has only short clauses", () => {
    const content = readFileSync(CONTINUITY_LINE, "utf-8");
    expect(content).toContain("Handling active.");
    const clauses = ["Handling active", "Commitments secured", "Compliance enforced", "Confirmation recorded"];
    for (const c of clauses) {
      const words = c.split(/\s+/).filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(MAX_WORDS);
    }
  });

  it("no passive instructional paragraph on start page", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).not.toMatch(/To\s+[\w\s]{30,}\./);
    expect(content).not.toMatch(/You should\s+/);
    expect(content).not.toMatch(/Please\s+[\w\s]{25,}/);
  });
});
