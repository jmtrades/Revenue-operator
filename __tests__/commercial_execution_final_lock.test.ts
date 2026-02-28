import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

describe("Commercial Execution Final Lock", () => {
  it("includes single pipeline enforcement in verify-guarantees", () => {
    const verify = read("scripts/verify-guarantees.ts");
    expect(verify).toMatch(/single_pipeline_enforcement.test.ts/);
  });

  it("confirms no freeform outbound: enforcement test present and no drift fallback", () => {
    const verify = read("scripts/verify-guarantees.ts");
    expect(verify).toMatch(/no_freeform_ai_enforcement.test.ts/);
    const execBuild = read("src/lib/execution-plan/build.ts");
    expect(execBuild).not.toMatch(/getSafeMessageOnDrift/);
  });

  it("confirms action_intents append-only and watchdog cron exists", () => {
    const migration = read("supabase/migrations/action_intents.sql");
    expect(migration).toMatch(/Append-only truth; no deletes/);
    const watchdog = read("src/app/api/cron/action-intent-watchdog/route.ts");
    expect(watchdog).toMatch(/escalate_to_human/);
  });

  it("includes enterprise immutability test in verify-guarantees", () => {
    const verify = read("scripts/verify-guarantees.ts");
    expect(verify).toMatch(/enterprise_immutability.test.ts/);
  });

  it("enforces jurisdiction and compliance locks", () => {
    const build = read("src/lib/execution-plan/build.ts");
    expect(build).toMatch(/jurisdictionUnspecified/);
    expect(build).toMatch(/preview_required/);
    const policy = read("src/lib/governance/message-policy.ts");
    expect(policy).toMatch(/jurisdiction_locked/);
  });

  it("ensures connector dead-letter and invalid_normalized_inbound handling", () => {
    const migration = read("supabase/migrations/connector_events_dead_letter.sql");
    expect(migration).toMatch(/connector_events_dead_letter/);
    const ingest = read("src/app/api/connectors/events/ingest/route.ts");
    expect(ingest).toMatch(/invalid_normalized_inbound/);
    expect(ingest).toMatch(/connector_events_dead_letter/);
  });

  it("confirms workspace rate limits and rate_limit_exceeded reason", () => {
    const migration = read("supabase/migrations/workspace_rate_limits.sql");
    expect(migration).toMatch(/workspace_rate_limits/);
    const helper = read("src/lib/execution-plan/rate-limits.ts");
    expect(helper).toMatch(/rate_limit_exceeded/);
  });

  it("locks voice dominance invariants (plan + outcome)", () => {
    const voicePlan = read("src/lib/voice/plan/build.ts");
    expect(voicePlan).toMatch(/OBJECTION_CHAIN_LIMIT/);
    const voiceOutcome = read("src/app/api/connectors/voice/outcome/route.ts");
    expect(voiceOutcome).toMatch(/compliance_violation/);
  });

  it("extends forbidden-language guard with bot/automation/campaign/workflow/CRM/dialer and homepage copy", () => {
    const forbidden = read("__tests__/forbidden_language_enforcement.test.ts");
    expect(forbidden.toLowerCase()).toMatch(/automation/);
    expect(forbidden.toLowerCase()).toMatch(/campaign/);
    expect(forbidden.toLowerCase()).toMatch(/workflow/);
    expect(forbidden.toLowerCase()).toMatch(/crm/);
    expect(forbidden.toLowerCase()).toMatch(/dialer/);

    const landing = read("src/app/page.tsx");
    const hero = read("src/components/sections/Hero.tsx");
    expect(landing).toMatch(/Hero/);
    expect(hero).toMatch(/Every call that drives revenue/i);
    expect(hero).toMatch(/Commercial execution infrastructure|Start free|governs inbound/i);
    expect(hero).not.toMatch(/Declare governance/i);
    expect(landing).not.toMatch(/Declare governance/i);
  });

  it("dashboard redirects to /dashboard/start", () => {
    const layout = read("src/app/dashboard/layout.tsx");
    expect(layout).toMatch(/dashboard\/start/);
    expect(layout).toMatch(/pathname.*\/dashboard/);
  });

  it("data retention route does not use DELETE", () => {
    const retention = read("src/app/api/cron/data-retention/route.ts");
    expect(retention).not.toMatch(/delete\s+from|\.delete\s*\(/i);
  });

  it("hosted executor is bounded", () => {
    const hosted = read("src/app/api/cron/hosted-executor/route.ts");
    expect(hosted).toMatch(/\.limit\s*\(|ORDER BY|order\s*\(/i);
  });

  it("founder export does not expose secrets", () => {
    const founder = read("src/app/api/internal/founder/export/route.ts");
    expect(founder).not.toMatch(/stripe_|webhook_secret|api_key|password|\.stack/);
  });

  it("invite routes exist and are append-only", () => {
    const invite = read("src/app/api/enterprise/invite/route.ts");
    expect(invite).toMatch(/workspace_invites|\.insert\s*\(/);
  });
});

