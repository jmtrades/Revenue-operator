#!/usr/bin/env npx tsx
/**
 * Scenario replay harness. Loads fixtures from __fixtures__/scenarios/*.json (or bounded
 * incident rows from DB). Runs deterministic outcome resolution and compares to expected.
 * Bounded reads only (ORDER BY + LIMIT). No provider imports. No randomness.
 * After apply: run npm test, npm run prebuild, npm run build to verify.
 */

import { readdirSync, readFileSync } from "fs";
import { createHash } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { resolveUniversalOutcome } from "../src/lib/intelligence/outcome-taxonomy";
import type { ResolveUniversalOutcomeInput } from "../src/lib/intelligence/outcome-taxonomy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(ROOT, "__fixtures__", "scenarios");
const INCIDENT_LIMIT = 50;

type Fixture = {
  scenario_category: string;
  channel: string;
  structured_context_json: Record<string, unknown>;
  expected_outcome_type: string;
  expected_next_required_action?: string | null;
  expected_stop_reason?: string | null;
};

function mapFixtureToOutcomeInput(fixture: Fixture): ResolveUniversalOutcomeInput {
  const cat = fixture.scenario_category;
  const ctx = fixture.structured_context_json;
  const input: ResolveUniversalOutcomeInput = {};

  if (cat === "opt_out" || ctx?.signal === "opt_out") {
    input.optOut = true;
    return input;
  }
  if (cat === "legal_risk" || ctx?.signal === "legal" || ctx?.signal === "legal_keyword") {
    input.legalKeywordPresent = true;
    return input;
  }
  if (ctx?.no_show === true) {
    input.noShow = true;
    return input;
  }
  if (cat === "repeated_unknown" || (ctx?.outcome === "unknown" && (ctx?.count as number) >= 3)) {
    input.lastOutcomeTypes = ["unknown", "unknown", "unknown"];
    input.repeatedUnknownThreshold = 3;
    return input;
  }
  if (cat === "identity_mismatch" || cat === "multi_party") {
    input.escalationRequired = true;
    return input;
  }
  if (cat === "contradiction_loop") {
    input.lastOutcomeTypes = ["unknown", "unknown", "unknown"];
    input.repeatedUnknownThreshold = 3;
    return input;
  }
  if (cat === "compliance_disclosure_required" || cat === "consent_required") {
    input.informationMissing = true;
    return input;
  }
  if (cat === "payment_failed" || ctx?.payment === "failed") {
    input.paymentFailed = true;
    return input;
  }
  if (ctx?.routed === true) {
    input.routed = true;
    return input;
  }
  if (cat === "silence_decay" || ctx?.days_silence != null) {
    input.voiceOutcome = "no_answer";
    input.attemptCount = 1;
    return input;
  }
  if (cat === "payment_promised" || ctx?.commitment === "payment") {
    input.paymentPromised = true;
    return input;
  }
  if (cat === "payment_made" || ctx?.payment === "completed") {
    input.paymentMade = true;
    return input;
  }
  if (cat === "complaint" || ctx?.type === "complaint") {
    input.complaint = true;
    return input;
  }
  if (cat === "refund_request" || ctx?.request === "refund") {
    input.refundRequest = true;
    return input;
  }
  if (cat === "dispute" || ctx?.type === "dispute") {
    input.dispute = true;
    return input;
  }
  if ((cat === "appointment_confirm" && ctx?.no_show !== true) || ctx?.confirmed === true) {
    input.appointmentConfirmed = true;
    return input;
  }
  if (cat === "appointment_cancel" || ctx?.cancelled === true) {
    input.appointmentCancelled = true;
    return input;
  }
  if (cat === "information_missing" || ctx?.info_missing === true) {
    input.informationMissing = true;
    return input;
  }
  if (cat === "wrong_number" || ctx?.outcome === "wrong_number") {
    input.voiceOutcome = "wrong_number";
    return input;
  }
  if (cat === "hostile_loop" || ctx?.emotional === "hostile") {
    input.emotionalCategory = "hostile";
    input.volatilityScore = (ctx?.attempt as number) ? 80 : 75;
    return input;
  }
  if (cat === "no_answer_loop" || ctx?.outcome === "no_answer") {
    input.voiceOutcome = "no_answer";
    input.attemptCount = (ctx?.attempt as number) ?? 2;
    input.maxAttemptsPerLead = 10;
    return input;
  }
  if (cat === "connected" || ctx?.outcome === "connected") {
    input.voiceOutcome = "connected";
    return input;
  }
  if (ctx?.outcome === "technical_issue") {
    input.voiceOutcome = "technical_issue";
    return input;
  }
  if (cat === "call_back_requested" || ctx?.commitment === "call_back") {
    input.callBackRequested = true;
    return input;
  }
  if (cat === "followup_scheduled" || ctx?.followup === true) {
    input.followupScheduled = true;
    return input;
  }
  if (cat === "no_show" || ctx?.no_show === true) {
    input.noShow = true;
    return input;
  }
  if (cat === "escalation_required" || ctx?.escalate === true) {
    input.escalationRequired = true;
    return input;
  }
  if (cat === "data_request" || cat === "inbound_triage" || cat === "list_execution" || cat === "scheduling") {
    input.messageResultStatus = "succeeded";
    return input;
  }
  if (cat === "routed" && ctx?.routed === true) {
    input.messageResultStatus = "succeeded";
    return input;
  }
  if (cat === "unknown" || cat === "identity_mismatch" || cat === "multi_party" || cat === "contradiction_loop") {
    input.lastOutcomeTypes = [];
    return input;
  }
  if (cat === "consent_required" || cat === "compliance_disclosure_required" || cat === "silence_decay") {
    input.messageResultStatus = "succeeded";
    return input;
  }
  input.messageResultStatus = "succeeded";
  return input;
}

function loadFixtures(): Fixture[] {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  const fixtures: Fixture[] = [];
  for (const f of files.slice(0, 200)) {
    const p = path.join(FIXTURES_DIR, f);
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as Fixture;
    if (
      parsed.scenario_category &&
      parsed.structured_context_json &&
      parsed.expected_outcome_type
    ) {
      fixtures.push(parsed);
    }
  }
  return fixtures;
}

function replayHash(incidentId: string, expected: string, result: string): string {
  return createHash("sha256").update(incidentId + expected + result).digest("hex").slice(0, 32);
}

function main(): number {
  const fixtures = loadFixtures();
  let failed = 0;
  for (const fixture of fixtures) {
    const input = mapFixtureToOutcomeInput(fixture);
    const result = resolveUniversalOutcome(input);
    const outcomeOk = result.outcome_type === fixture.expected_outcome_type;
    const nextOk =
      fixture.expected_next_required_action == null ||
      fixture.expected_next_required_action === "" ||
      result.next_required_action === fixture.expected_next_required_action;
    if (!outcomeOk || !nextOk) {
      console.error(
        `FAIL ${fixture.scenario_category}: expected outcome=${fixture.expected_outcome_type} next=${fixture.expected_next_required_action ?? "any"} got outcome=${result.outcome_type} next=${result.next_required_action}`
      );
      failed++;
    }
  }
  if (failed > 0) {
    console.error(`Replay failed: ${failed} of ${fixtures.length} fixtures`);
    return 1;
  }
  console.log(`Replay passed: ${fixtures.length} fixtures`);
  return 0;
}

process.exit(main());
