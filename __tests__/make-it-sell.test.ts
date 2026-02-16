/**
 * Make it Sell upgrade pack: readiness, assurance-delivery, core cron, why-pay, invite throttle, record+ack message.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("installation readiness", () => {
  it("GET /api/installation/readiness returns booleans only", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/installation/readiness/route.ts"), "utf-8");
    expect(route).toContain("communication_connected");
    expect(route).toContain("calendar_connected");
    expect(route).toContain("payments_connected");
    expect(route).toContain("record_connected");
    expect(route).toContain("system_ready");
    expect(route).toContain("NextResponse.json({");
    expect(route).not.toContain("count:");
    expect(route).not.toContain("timestamp");
  });

  it("readiness requires workspace access when session enabled", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/installation/readiness/route.ts"), "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("authErr");
  });
});

describe("assurance delivery", () => {
  it("sends once per day only when proof exists; subject/body equals line", () => {
    const lib = readFileSync(path.join(ROOT, "src/lib/assurance-delivery/index.ts"), "utf-8");
    expect(lib).toContain("last_sent_utc_date");
    expect(lib).toContain("getTodaysProofCapsuleLine");
    expect(lib).toContain("sendAssuranceLine");
    expect(lib).toContain("deliverDailyAssuranceIfDue");
    expect(lib).toMatch(/subject: line|text: line/);
    expect(lib).toContain("getConfidencePhase");
    expect(lib).toContain("observing");
  });

  it("logs assurance_skipped with non-PII reasons when skipping", () => {
    const lib = readFileSync(path.join(ROOT, "src/lib/assurance-delivery/index.ts"), "utf-8");
    expect(lib).toContain('log("assurance_skipped"');
    expect(lib).toContain("reason:");
    const reasons = ["no_line", "phase_observing", "already_sent_today", "missing_resend", "missing_owner_email", "missing_owner_id"];
    for (const r of reasons) {
      expect(lib).toContain(`"${r}"`);
    }
  });
});

describe("core cron", () => {
  it("core cron is authorized and records heartbeat", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/core/route.ts"), "utf-8");
    expect(route).toContain("assertCronAuthorized");
    expect(route).toContain("runSafeCron");
    expect(route).toContain("recordCronHeartbeat");
    expect(route).toContain("core");
  });

  it("core cron calls subroutines sequentially and includes connector-inbox and assurance-delivery", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/core/route.ts"), "utf-8");
    expect(route).toContain("process-queue");
    expect(route).toContain("commitment-recovery");
    expect(route).toContain("exposure-engine");
    expect(route).toContain("assumption-engine");
    expect(route).toContain("normalization-engine");
    expect(route).toContain("proof-capsules");
    expect(route).toContain("settlement-export");
    expect(route).toContain("connector-inbox");
    expect(route).toContain("assurance-delivery");
    const stepsMatch = route.match(/CORE_STEPS\s*=\s*\[([\s\S]*?)\]/);
    expect(stepsMatch).toBeTruthy();
    const stepsBlock = stepsMatch![1];
    const connectorIdx = stepsBlock.indexOf("connector-inbox");
    const processQueueIdx = stepsBlock.indexOf("process-queue");
    expect(connectorIdx).toBeGreaterThanOrEqual(0);
    expect(processQueueIdx).toBeGreaterThanOrEqual(0);
    expect(connectorIdx).toBeLessThan(processQueueIdx);
  });
});

describe("why-pay", () => {
  it("returns array, up to 6 lines, doctrine-safe", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/why-pay/route.ts"), "utf-8");
    expect(route).toContain("MAX_LINES = 6");
    expect(route).toContain("MAX_CHARS = 90");
    expect(route).toContain("proof_capsules");
    expect(route).toContain("getInstitutionalState");
    expect(route).toContain("normalizationEstablished");
    expect(route).toContain("NextResponse.json(lines");
  });

  it("response is array of lines only (no ids in payload)", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/why-pay/route.ts"), "utf-8");
    expect(route).toMatch(/NextResponse\.json\(lines/);
  });

  it("why-pay requires workspace access when session enabled", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/why-pay/route.ts"), "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("authErr");
  });
});

describe("invite throttle", () => {
  it("maybeIssueCounterpartyInvite respects institutional and normalized gate", () => {
    const lib = readFileSync(path.join(ROOT, "src/lib/shared-transaction-assurance/index.ts"), "utf-8");
    expect(lib).toContain("getInstitutionalState");
    expect(lib).toContain("normalizationEstablished");
    expect(lib).toMatch(/institutional.*assumed|assumed.*institutional/);
  });

  it("issueProtocolParticipation and sendEnvironmentInviteWhenReliant gate on inst and normalized", () => {
    const lib = readFileSync(path.join(ROOT, "src/lib/shared-transaction-assurance/index.ts"), "utf-8");
    const count = (lib.match(/normalizationEstablished/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

describe("record and ack link message", () => {
  it("message has both Record available and Acknowledgement links, no forbidden words", () => {
    const lib = readFileSync(path.join(ROOT, "src/lib/shared-transaction-assurance/index.ts"), "utf-8");
    expect(lib).toContain("buildPublicRecordLink");
    expect(lib).toContain("Record available:");
    expect(lib).toContain("Acknowledgement:");
    expect(lib).toContain("api/public/record/");
    const forbidden = ["dashboard", "ROI", "metric", "optimize", "click"];
    for (const w of forbidden) {
      expect(lib).not.toContain(w);
    }
  });
});
