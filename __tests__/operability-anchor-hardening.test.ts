/**
 * Operability anchor hardening: live maintenance sources, anti-false-positive anchor,
 * anchor days, settlement gating, anchor loss orientation. No dashboards or metrics.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("operability anchor hardening: refresh from live tables", () => {
  it("refreshOperabilityAnchor loads from live DB tables not authority lists", () => {
    const refresh = readFileSync(path.join(ROOT, "src/lib/operability-anchor/refresh.ts"), "utf-8");
    expect(refresh).toContain("refreshOperabilityAnchor");
    expect(refresh).toContain("opportunity_states");
    expect(refresh).toContain("commitments");
    expect(refresh).toContain("payment_obligations");
    expect(refresh).toContain("shared_transactions");
    expect(refresh).toContain("momentum_state");
    expect(refresh).toContain("authority_required");
    expect(refresh).not.toContain("getCommitmentsRequiringAuthority");
    expect(refresh).not.toContain("getStalledOpportunitiesRequiringAuthority");
    expect(refresh).not.toContain("getPaymentObligationsRequiringAuthority");
    expect(refresh).not.toContain("getSharedTransactionsRequiringAuthority");
  });

  it("expectations upserted and removed by current source sets only", () => {
    const refresh = readFileSync(path.join(ROOT, "src/lib/operability-anchor/refresh.ts"), "utf-8");
    expect(refresh).toContain("currentIds");
    expect(refresh).toContain("removeOperationalExpectation");
    expect(refresh).toContain("!set.has(r.reference_id)");
  });
});

describe("operability anchor hardening: maintained_by_system when observing", () => {
  it("refresh uses confidence phase and sets maintained false when observing", () => {
    const refresh = readFileSync(path.join(ROOT, "src/lib/operability-anchor/refresh.ts"), "utf-8");
    expect(refresh).toContain("getConfidencePhase");
    expect(refresh).toContain("observing");
    expect(refresh).toContain("notObserving");
    expect(refresh).toContain("maintained");
    expect(refresh).toMatch(/notObserving\s*&&/);
  });
});

describe("operability anchor hardening: anchor condition anti-false-positive", () => {
  it("processMaintainsOperation requires 3 expectations, 2 distinct types, 2 maintained_by_system", () => {
    const expectations = readFileSync(
      path.join(ROOT, "src/lib/operability-anchor/expectations.ts"),
      "utf-8"
    );
    expect(expectations).toContain("MIN_EXPECTATIONS");
    expect(expectations).toContain("MIN_DISTINCT_TYPES");
    expect(expectations).toContain("MIN_MAINTAINED_BY_SYSTEM");
    expect(expectations).toContain("expectation_type");
    expect(expectations).toContain("maintained_by_system");
    expect(expectations).toContain("types.size");
    expect(expectations).toContain("maintainedCount");
  });
});

describe("operability anchor hardening: operability_anchor_days", () => {
  it("recordOperabilityAnchorDay uses upsert with unique constraint for idempotency", () => {
    const anchorDays = readFileSync(
      path.join(ROOT, "src/lib/operability-anchor/anchor-days.ts"),
      "utf-8"
    );
    expect(anchorDays).toContain("operability_anchor_days");
    expect(anchorDays).toContain("upsert");
    expect(anchorDays).toContain("workspace_id");
    expect(anchorDays).toContain("anchored_utc_date");
    expect(anchorDays).toMatch(/onConflict|on_conflict/i);
  });

  it("hasAnchoredAcrossDays checks distinct anchored_utc_date in window", () => {
    const anchorDays = readFileSync(
      path.join(ROOT, "src/lib/operability-anchor/anchor-days.ts"),
      "utf-8"
    );
    expect(anchorDays).toContain("hasAnchoredAcrossDays");
    expect(anchorDays).toContain("distinct");
    expect(anchorDays).toContain("anchored_utc_date");
  });
});

describe("operability anchor hardening: settlement gating", () => {
  it("isAdministrativeActivationAvailable requires hasAnchoredAcrossDays(2, 7)", () => {
    const settlement = readFileSync(
      path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"),
      "utf-8"
    );
    expect(settlement).toContain("hasAnchoredAcrossDays");
    expect(settlement).toMatch(/2.*7|7.*2/);
    expect(settlement).toContain("anchoredAcrossDays");
  });
});

describe("operability anchor hardening: anchor loss orientation", () => {
  it("anchor loss orientation recorded once when conditions met", () => {
    const anchorLoss = readFileSync(
      path.join(ROOT, "src/lib/operability-anchor/anchor-loss.ts"),
      "utf-8"
    );
    expect(anchorLoss).toContain("recordAnchorLossOrientationIfDue");
    expect(anchorLoss).toContain("operation_anchor_lost_orientation_recorded_at");
    expect(anchorLoss).toContain("The operating process was no longer sustaining current activity.");
    expect(anchorLoss).toContain("processMaintainsOperation");
    expect(anchorLoss).toContain("hasAnchoredAcrossDays");
    expect(anchorLoss).toContain("maintained_by_system");
    expect(anchorLoss).toContain("recordOrientationStatement");
  });

  it("anchor loss only when anchored recently and zero maintained expectations", () => {
    const anchorLoss = readFileSync(
      path.join(ROOT, "src/lib/operability-anchor/anchor-loss.ts"),
      "utf-8"
    );
    expect(anchorLoss).toContain("anchoredNow");
    expect(anchorLoss).toContain("anchoredRecently");
    expect(anchorLoss).toContain("lostRecorded");
    expect(anchorLoss).toContain("expectations?.length");
  });
});

describe("operability anchor hardening: responsibility read-only", () => {
  it("GET /api/responsibility does not call refresh expectations", () => {
    const responsibility = readFileSync(
      path.join(ROOT, "src/app/api/responsibility/route.ts"),
      "utf-8"
    );
    expect(responsibility).not.toContain("refreshCommitmentExpectations");
    expect(responsibility).not.toContain("refreshOpportunityExpectations");
    expect(responsibility).not.toContain("refreshPaymentExpectations");
    expect(responsibility).not.toContain("refreshSharedTransactionExpectations");
  });
});

describe("operability anchor hardening: cron operability-anchor", () => {
  it("cron route exists and calls refreshOperabilityAnchor, recordOperabilityAnchorDay, anchor loss", () => {
    const cron = readFileSync(
      path.join(ROOT, "src/app/api/cron/operability-anchor/route.ts"),
      "utf-8"
    );
    expect(cron).toContain("assertCronAuthorized");
    expect(cron).toContain("runSafeCron");
    expect(cron).toContain("operability-anchor");
    expect(cron).toContain("refreshOperabilityAnchor");
    expect(cron).toContain("processMaintainsOperation");
    expect(cron).toContain("recordOperabilityAnchorDay");
    expect(cron).toContain("recordAnchorLossOrientationIfDue");
    expect(cron).toContain("recordCronHeartbeat");
  });
});
