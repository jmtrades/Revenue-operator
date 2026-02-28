/**
 * Scenario fixture coverage: >= 30 fixtures, never-send categories covered,
 * no forbidden UI words or internal ID patterns, expected values in allowlists.
 */

import { readdirSync, readFileSync } from "fs";
import path from "path";
import { NEVER_SEND_CATEGORIES, SCENARIO_CATEGORIES } from "../src/lib/intelligence/scenario-universe";
import { OUTCOME_TYPES } from "../src/lib/intelligence/outcome-taxonomy";
import { NEXT_REQUIRED_ACTIONS } from "../src/lib/intelligence/outcome-taxonomy";

const ROOT = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(ROOT, "__fixtures__", "scenarios");

const FORBIDDEN_UI = [
  "automation", "workflow", "campaign", "CRM", "SaaS", "tool", "platform", "optimize",
  "growth", "boost", "scale", "analytics", "metrics", "dashboard", "bot", "AI caller",
  "dialer", "payload", "schema", "pipeline", "software",
];

const INTERNAL_ID_PATTERNS = [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, /workspace_id.*[0-9a-f-]{36}/];

describe("scenario fixture coverage", () => {
  it("has at least 30 fixtures", () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(30);
  });

  it("covers never-send categories: opt_out, legal_risk, identity_mismatch, wrong_number, multi_party", () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
    const contents = files.map((f) => JSON.parse(readFileSync(path.join(FIXTURES_DIR, f), "utf-8")) as { scenario_category: string });
    const categories = new Set(contents.map((c) => c.scenario_category));
    for (const cat of NEVER_SEND_CATEGORIES) {
      expect(categories.has(cat), `missing fixture for never-send category: ${cat}`).toBe(true);
    }
  });

  it("fixtures contain no forbidden UI words or internal ID patterns", () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const raw = readFileSync(path.join(FIXTURES_DIR, f), "utf-8");
      const lower = raw.toLowerCase();
      for (const word of FORBIDDEN_UI) {
        expect(lower.includes(word), `${f} should not contain forbidden word: ${word}`).toBe(false);
      }
      for (const re of INTERNAL_ID_PATTERNS) {
        const match = raw.match(re);
        expect(match, `${f} should not contain internal ID pattern`).toBeNull();
      }
    }
  });

  it("fixtures use allowlisted scenario_category, outcome_type, next_required_action, stop_reason", () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
    const outcomeSet = new Set(OUTCOME_TYPES);
    const nextSet = new Set(NEXT_REQUIRED_ACTIONS);
    const categorySet = new Set(SCENARIO_CATEGORIES);
    for (const f of files) {
      const parsed = JSON.parse(readFileSync(path.join(FIXTURES_DIR, f), "utf-8")) as {
        scenario_category?: string;
        expected_outcome_type?: string;
        expected_next_required_action?: string | null;
        expected_stop_reason?: string | null;
      };
      expect(categorySet.has(parsed.scenario_category!), `fixture ${f}: invalid scenario_category`).toBe(true);
      expect(outcomeSet.has(parsed.expected_outcome_type!), `fixture ${f}: invalid expected_outcome_type`).toBe(true);
      if (parsed.expected_next_required_action != null && parsed.expected_next_required_action !== "") {
        expect(nextSet.has(parsed.expected_next_required_action!), `fixture ${f}: invalid expected_next_required_action`).toBe(true);
      }
      if (parsed.expected_stop_reason != null && parsed.expected_stop_reason !== "") {
        const stopReasons = [
          "risk_threshold", "jurisdiction_unspecified", "consent_missing", "disclosure_incomplete",
          "objection_chain_exceeded", "attempt_limit_exceeded", "rate_headroom_exhausted", "execution_stale",
          "compliance_lock", "cadence_restriction", "hostile_cooldown", "broken_commitment_threshold",
          "outcome_requires_pause", "excessive_hostility_loop", "repeated_unknown_outcome",
        ];
        expect(stopReasons.includes(parsed.expected_stop_reason!), `fixture ${f}: invalid expected_stop_reason`).toBe(true);
      }
    }
  });
});
