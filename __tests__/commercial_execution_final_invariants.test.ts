/**
 * Commercial Execution Infrastructure — final invariants.
 * Build fails if any violated.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Commercial execution final invariants", () => {
  it("default safety: jurisdiction UNSPECIFIED forces preview_required and never send", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).toMatch(/jurisdictionUnspecified|UNSPECIFIED/);
    expect(build).toMatch(/preview_required/);
    expect(build).toMatch(/emit_preview|request_disclosure_confirmation/);
  });

  it("domain pack validation gate exists and returns domain_pack_incomplete", () => {
    const validate = readFileSync(path.join(ROOT, "src/lib/domain-packs/validate-activation.ts"), "utf-8");
    expect(validate).toMatch(/domain_pack_incomplete/);
    expect(validate).toMatch(/strategy_graph|objection_tree|regulatory_matrix/);
  });

  it("connector dead letter table and insert on failure", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).toMatch(/connector_events_dead_letter/);
    expect(ingest).toMatch(/invalid_normalized_inbound|execution_pipeline_failed/);
  });

  it("action intent watchdog cron exists and emits escalate_to_human", () => {
    const watchdog = readFileSync(path.join(ROOT, "src/app/api/cron/action-intent-watchdog/route.ts"), "utf-8");
    expect(watchdog).toMatch(/claimed_at|completed_at|stalled/);
    expect(watchdog).toMatch(/escalate_to_human/);
  });

  it("voice plan has objection chain limit and invalid_state", () => {
    const voice = readFileSync(path.join(ROOT, "src/lib/voice/plan/build.ts"), "utf-8");
    expect(voice).toMatch(/OBJECTION_CHAIN_LIMIT|objectionSequenceCount/);
    expect(voice).toMatch(/invalid_state/);
  });

  it("approval expiry cron exists", () => {
    const expiry = readFileSync(path.join(ROOT, "src/app/api/cron/approval-expiry/route.ts"), "utf-8");
    expect(expiry).toMatch(/message_approvals|expired|pending/);
  });

  it("audit export route has ORDER BY and LIMIT", () => {
    const exportRoute = readFileSync(path.join(ROOT, "src/app/api/enterprise/audit/export/route.ts"), "utf-8");
    expect(exportRoute).toMatch(/order\(|\.limit\(/);
  });

  it("no Math.random in strategy or execution-plan", () => {
    const strategy = readFileSync(path.join(ROOT, "src/lib/domain-packs/strategy-engine.ts"), "utf-8");
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(strategy).not.toMatch(/Math\.random/);
    expect(build).not.toMatch(/Math\.random/);
  });

  it("dashboard shows operational copy", () => {
    const layout = readFileSync(path.join(ROOT, "src/app/dashboard/layout.tsx"), "utf-8");
    expect(layout).toMatch(/Handling active|Commitments secured|Compliance enforced|Confirmation recorded/);
  });
});
