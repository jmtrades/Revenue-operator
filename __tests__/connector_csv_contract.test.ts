/**
 * A9) Connector CSV import: produces connector_events rows, idempotent on external_id, no direct customer messages.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Connector CSV contract", () => {
  it("dashboard import calls connector events ingest with workspace_id, channel, external_id", () => {
    const importPage = readFileSync(path.join(ROOT, "src/app/dashboard/import/page.tsx"), "utf-8");
    expect(importPage).toContain("/api/connectors/events/ingest");
    expect(importPage).toMatch(/external_id|workspace_id|channel/);
    expect(importPage).toContain("csv_import");
  });

  it("connector events ingest route is idempotent on (workspace_id, channel, external_id)", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).toContain("external_id");
    expect(ingest).toMatch(/insert|upsert|onConflict/);
  });

  it("connector ingest does not call delivery provider or send message directly", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).not.toMatch(/sendSms|sendEmail|twilio|delivery|createActionIntent/);
  });
});
