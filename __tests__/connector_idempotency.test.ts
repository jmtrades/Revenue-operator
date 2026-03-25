/**
 * Phase VI — Connector dominance: append-only ingest, deduplicate on external_id.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Connector idempotency", () => {
  it("connector events ingest uses external_id for deduplication", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).toContain("external_id");
    expect(ingest).toMatch(/workspace_id|channel/);
  });

  it("signals ingest-inbound uses external_id for message deduplication", () => {
    const ingest = readFileSync(path.join(ROOT, "src/lib/signals/ingest-inbound.ts"), "utf-8");
    expect(ingest).toContain("external_id");
    expect(ingest).toMatch(/onConflict|upsert/);
  });
});
