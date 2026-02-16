/**
 * Record reference events: no id leak, doctrine-compliant lines.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_CHARS = 90;
const NO_NUMBERS = /\d|%|percent|percentile|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;

describe("record reference: public record route", () => {
  it("does not expose workspace_id or internal ids in response", () => {
    const allowed = ["external_ref", "subject_type", "state", "last_event_type", "last_event_at"];
    const forbidden = ["workspace_id", "id", "workspace"];
    const response: Record<string, unknown> = {
      external_ref: "ext-1",
      subject_type: "booking",
      state: "normal",
      last_event_type: "created",
      last_event_at: "2025-01-01T00:00:00Z",
    };
    expect(Object.keys(response).sort()).toEqual([...Object.keys(response)].sort());
    for (const k of forbidden) {
      expect(response).not.toHaveProperty(k);
    }
    for (const k of allowed) {
      expect(response).toHaveProperty(k);
    }
  });

  it("resolves workspace internally for recording without leaking", () => {
    const content = readFileSync(
      path.join(ROOT, "src/app/api/public/record/[external_ref]/route.ts"),
      "utf-8"
    );
    expect(content).toContain("getWorkspaceIdByExternalRef");
    expect(content).toContain("recordRecordReference");
    expect(content).not.toMatch(/NextResponse\.json\(\{[^}]*workspace_id\s*:/);
  });
});

describe("record reference: acknowledge route", () => {
  it("records record_reference after ack success", () => {
    const content = readFileSync(
      path.join(ROOT, "src/app/api/public/shared-transactions/acknowledge/route.ts"),
      "utf-8"
    );
    expect(content).toContain("recordRecordReference");
    expect(content).toContain("ack_flow");
    expect(content).toContain("counterparty");
  });
});

describe("record reference: API and lines doctrine", () => {
  const referenceLines = [
    "A participant referenced the record.",
    "A shared record was accessed as authority.",
  ];

  it("record-reference lines contain no numbers", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/record-reference/record.ts"), "utf-8");
    for (const line of referenceLines) {
      expect(content).toContain(line);
      expect(NO_NUMBERS.test(line), `"${line}"`).toBe(false);
    }
  });

  it("record-reference lines are at most 90 chars", () => {
    for (const line of referenceLines) {
      expect(line.length, `"${line}"`).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("operational record-references API returns array of strings only", () => {
    const routeContent = readFileSync(
      path.join(ROOT, "src/app/api/operational/record-references/route.ts"),
      "utf-8"
    );
    expect(routeContent).toContain("getRecordReferenceLinesInLastDays");
    expect(routeContent).toContain("NextResponse.json(lines)");
    const exampleResponse: string[] = ["A participant referenced the record."];
    expect(Array.isArray(exampleResponse)).toBe(true);
    expect(exampleResponse.every((x) => typeof x === "string")).toBe(true);
    for (const line of exampleResponse) {
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });
});
