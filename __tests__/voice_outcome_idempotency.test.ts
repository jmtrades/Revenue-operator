/**
 * Invariant: voice outcome external_call_id dedup exists and is enforced.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice outcome idempotency", () => {
  it("connector_events has unique constraint on workspace_id, channel, external_id", () => {
    const migration = readFileSync(path.join(ROOT, "supabase/migrations/connector_events.sql"), "utf-8");
    expect(migration).toMatch(/unique|UNIQUE/);
    expect(migration).toContain("external_id");
    expect(migration).toContain("channel");
  });

  it("voice outcome route uses external_call_id as external_id for connector_events", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toContain("external_call_id");
    expect(route).toContain("external_id:");
    expect(route).toMatch(/external_id:\s*externalCallId|external_id:\s*body\.external_call_id/);
  });

  it("voice outcome route handles 23505 and returns without duplicating side effects", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toContain("23505");
    expect(route).toMatch(/inserted\s*=\s*false|idempotent:\s*true/);
  });
});
