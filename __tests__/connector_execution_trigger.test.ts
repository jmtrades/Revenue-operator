/**
 * Phase VI — Connector ingest triggers governed execution; never bypass pipeline.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Connector execution trigger", () => {
  it("normalize-to-pipeline or ingest produces pipeline input; no direct send", () => {
    const normalize = readFileSync(path.join(ROOT, "src/lib/connectors/normalize-to-pipeline.ts"), "utf-8");
    expect(normalize).not.toMatch(/sendViaTwilio|fetch\(.*twilio|stripe\./);
  });

  it("connector ingest route does not call delivery provider directly", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).not.toMatch(/delivery|sendSms|sendEmail|twilio/);
  });
});
