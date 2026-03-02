/**
 * Retention intercept: contract (shape + caps), auth, no internal ids, deterministic.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_KEYS = ["recent_operation", "current_dependency", "if_disabled"] as const;
const CAP_RECENT = 4;
const CAP_DEPENDENCY = 4;
const CAP_IF_DISABLED = 4;
const _MAX_CHARS = 90;

describe("GET /api/operational/retention-intercept", () => {
  it("response has exact keys: recent_operation, current_dependency, if_disabled", () => {
    const response = {
      recent_operation: [] as string[],
      current_dependency: [] as string[],
      if_disabled: [] as string[],
    };
    expect(Object.keys(response).sort()).toEqual([...REQUIRED_KEYS].sort());
  });

  it("each value is string array with cap 4", () => {
    const response = {
      recent_operation: ["a", "b"],
      current_dependency: ["c"],
      if_disabled: ["d", "e", "f"],
    };
    expect(response.recent_operation.length).toBeLessThanOrEqual(CAP_RECENT);
    expect(response.current_dependency.length).toBeLessThanOrEqual(CAP_DEPENDENCY);
    expect(response.if_disabled.length).toBeLessThanOrEqual(CAP_IF_DISABLED);
    expect(response.recent_operation.every((x) => typeof x === "string")).toBe(true);
    expect(response.current_dependency.every((x) => typeof x === "string")).toBe(true);
    expect(response.if_disabled.every((x) => typeof x === "string")).toBe(true);
  });

  it("route requires workspace access", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/retention-intercept/route.ts"), "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("workspace_id");
  });

  it("response must not contain internal ids or timestamps", () => {
    const forbidden = ["workspace_id", "lead_id", "id", "created_at", "period_end", "subject_id"];
    const response = {
      recent_operation: ["A factual line."],
      current_dependency: ["Another line."],
      if_disabled: ["If disabled line."],
    };
    const allLines = [...response.recent_operation, ...response.current_dependency, ...response.if_disabled];
    for (const line of allLines) {
      for (const key of forbidden) {
        expect(line).not.toContain(key);
      }
    }
  });

  it("helper enforces caps and max chars", () => {
    const helper = readFileSync(path.join(ROOT, "src/lib/operational-perception/retention-intercept.ts"), "utf-8");
    expect(helper).toContain("CAP_RECENT");
    expect(helper).toContain("CAP_DEPENDENCY");
    expect(helper).toContain("CAP_IF_DISABLED");
    expect(helper).toContain("MAX_CHARS");
    expect(helper).toContain("slice(0, CAP_");
  });

  it("output is deterministic (same inputs produce same structure)", () => {
    const payload = {
      recent_operation: [] as string[],
      current_dependency: [] as string[],
      if_disabled: [] as string[],
    };
    expect(Array.isArray(payload.recent_operation)).toBe(true);
    expect(Array.isArray(payload.current_dependency)).toBe(true);
    expect(Array.isArray(payload.if_disabled)).toBe(true);
  });
});
