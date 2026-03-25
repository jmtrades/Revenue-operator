/**
 * Connector safety: ingest never calls delivery, never constructs outbound content; all execution via runGovernedExecution and action_intents.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Connector execution safety", () => {
  it("connector events ingest does not import or call delivery provider", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).not.toMatch(/sendOutbound|sendViaTwilio|delivery\/provider/);
  });

  it("connector events ingest uses runGovernedExecution for execution path", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).toMatch(/runGovernedExecution/);
  });

  it("connector ingest does not construct outbound message text manually", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).not.toMatch(/sendViaTwilio|Body:\s*to|rendered_text\s*=\s*[^t]/);
  });

  it("voice outcome does not call delivery provider", () => {
    const voice = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(voice).not.toMatch(/sendOutbound|sendViaTwilio|delivery\/provider/);
  });
});
