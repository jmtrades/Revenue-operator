/**
 * Scenario replay harness invariants: bounded selects, no provider imports,
 * no Math.random/randomUUID, incident route exists and is auth-protected.
 */

import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const REPLAY_SCRIPT = path.join(ROOT, "scripts", "run-scenario-replays.ts");
const INCIDENT_ROUTE = path.join(ROOT, "src", "app", "api", "internal", "scenarios", "incident", "route.ts");

function read(p: string): string {
  return readFileSync(p, "utf-8");
}

describe("scenario replay harness invariants", () => {
  it("run-scenario-replays.ts exists and uses bounded reads", () => {
    const content = read(REPLAY_SCRIPT);
    expect(content).toMatch(/slice\s*\(\s*0\s*,|INCIDENT_LIMIT|\.limit\s*\(|ORDER BY.*LIMIT/);
  });

  it("run-scenario-replays.ts has no provider imports", () => {
    const content = read(REPLAY_SCRIPT);
    expect(content).not.toMatch(/from\s+["']twilio|@twilio/);
    expect(content).not.toMatch(/from\s+["']stripe|@stripe/);
    expect(content).not.toMatch(/from\s+["']nodemailer|@nodemailer/);
    expect(content).not.toMatch(/from\s+["']@sendgrid|sendgrid/);
    expect(content).not.toMatch(/from\s+["']resend|@resend/);
  });

  it("run-scenario-replays.ts has no Math.random or crypto.randomUUID", () => {
    const content = read(REPLAY_SCRIPT);
    expect(content).not.toMatch(/Math\.random\s*\(/);
    expect(content).not.toMatch(/randomUUID\s*\(/);
  });

  it("internal scenarios incident route exists and is auth-protected", () => {
    const content = read(INCIDENT_ROUTE);
    expect(content).toContain("assertScenarioAuth");
    expect(content).toContain("SCENARIO_INGEST_KEY");
    expect(content).toContain("FOUNDER_EXPORT_KEY");
    expect(content).toContain("x-scenario-ingest-key");
    expect(content).toContain("x-founder-key");
  });
});
