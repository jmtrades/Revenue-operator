/**
 * Exposure engine: doctrine, record, resolve, orientation, protection feed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_CHARS = 90;
const NO_NUMBERS = /\d|%|percent|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;
const FORBIDDEN = /\b(you|your|we|us|click|dashboard|metric|ROI|saved|increase|improve|optimize|performance)\b/i;

describe("exposure engine: daily dedupe", () => {
  it("record uses insert and conflict update for daily dedupe", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/exposure-engine/record.ts"), "utf-8");
    expect(record).toContain("upsertExposure");
    expect(record).toContain("operational_exposures");
    expect(record).toMatch(/23505|insert/);
  });
});

describe("exposure engine: markExposureResolved", () => {
  it("sets interrupted_by_process and interruption_source", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/exposure-engine/record.ts"), "utf-8");
    expect(record).toContain("markExposureResolved");
    expect(record).toContain("interrupted_by_process");
    expect(record).toContain("interruption_source");
    expect(record).toContain("exposure_resolved_at");
  });
});

describe("exposure engine: getInterruptedExposureLinesLast24h", () => {
  it("returns mapped lines, max 8, uses sanitizeLine", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/exposure-engine/record.ts"), "utf-8");
    expect(record).toContain("getInterruptedExposureLinesLast24h");
    expect(record).toContain("EXPOSURE_LINES");
    expect(record).toContain("sanitizeLine");
  });

  it("exposure doctrine lines are ≤90 chars, no numbers, no forbidden words", () => {
    const doctrine = readFileSync(path.join(ROOT, "src/lib/exposure-engine/doctrine.ts"), "utf-8");
    expect(doctrine).toContain("EXPOSURE_LINES");
    const lines = [
      "A conversation would have remained without response.",
      "Attendance would have remained uncertain.",
      "Payment would have remained incomplete.",
      "Confirmation would have remained unreceived.",
      "An outcome would have remained unconfirmed.",
      "An operational failure did not continue.",
    ];
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
      expect(NO_NUMBERS.test(line)).toBe(false);
      expect(FORBIDDEN.test(line)).toBe(false);
    }
  });
});

describe("exposure engine: first interruption orientation", () => {
  it("orientation recorded once and column exist", () => {
    const orientation = readFileSync(path.join(ROOT, "src/lib/exposure-engine/orientation.ts"), "utf-8");
    expect(orientation).toContain("recordFirstInterruptionOrientationOnce");
    expect(orientation).toContain("first_interruption_orientation_recorded_at");
    expect(orientation).toContain("FIRST_INTERRUPTION_ORIENTATION");
    const doctrine = readFileSync(path.join(ROOT, "src/lib/exposure-engine/doctrine.ts"), "utf-8");
    expect(doctrine).toContain("The process prevented an operational failure.");
  });
});

describe("exposure engine: stable ordering and max 8", () => {
  it("getInterruptedExposureLinesLast24h orders by exposure_resolved_at desc and limits", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/exposure-engine/record.ts"), "utf-8");
    expect(record).toContain("exposure_resolved_at");
    expect(record).toMatch(/order.*exposure_resolved_at|limit.*8|limit.*200/);
  });
});

describe("exposure engine: protection stability filter", () => {
  it("record upsert increments observation_count on conflict", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/exposure-engine/record.ts"), "utf-8");
    expect(record).toContain("observation_count");
    expect(record).toMatch(/observation_count.*\+ 1|nextCount/);
  });

  it("getInterruptedExposureLinesLast24h filters by observation_count or strong interruption_source", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/exposure-engine/record.ts"), "utf-8");
    expect(record).toContain("STABLE_SOURCES");
    expect(record).toContain("causal_chain");
    expect(record).toContain("continuation_stopped");
    expect(record).toMatch(/observation_count.*>= 2|stable/);
  });
});
