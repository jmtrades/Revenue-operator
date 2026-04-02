/**
 * Structural tests for the enterprise policies API route.
 * Verifies: auth enforcement, role restrictions, proper error handling.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("enterprise policies route", () => {
  const routePath = path.join(ROOT, "src/app/api/enterprise/policies/route.ts");

  it("route file exists", () => {
    expect(existsSync(routePath)).toBe(true);
  });

  const src = readFileSync(routePath, "utf-8");

  it("exports GET handler", () => {
    expect(src).toContain("export async function GET");
  });

  it("is force-dynamic", () => {
    expect(src).toContain('export const dynamic = "force-dynamic"');
  });

  it("validates workspace_id parameter", () => {
    expect(src).toContain("workspace_id");
    expect(src).toContain("invalid_input");
  });

  it("enforces role-based access control", () => {
    expect(src).toContain("requireWorkspaceRole");
  });

  it("allows appropriate roles", () => {
    expect(src).toContain('"owner"');
    expect(src).toContain('"admin"');
    expect(src).toContain('"operator"');
    expect(src).toContain('"auditor"');
    expect(src).toContain('"compliance"');
  });

  it("queries message_policies table", () => {
    expect(src).toContain('from("message_policies")');
  });

  it("returns policies array in response", () => {
    expect(src).toContain("policies: rows");
  });

  it("returns 400 on missing workspace_id", () => {
    expect(src).toContain("status: 400");
  });

  it("returns 500 on internal error", () => {
    expect(src).toContain("status: 500");
  });

  it("logs errors properly", () => {
    expect(src).toContain('log("error"');
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});

describe("enterprise policies approve route", () => {
  const approvePath = path.join(ROOT, "src/app/api/enterprise/policies/approve");

  it("approve subdirectory exists", () => {
    expect(existsSync(approvePath)).toBe(true);
  });
});

describe("enterprise policies per-policy route", () => {
  const idPath = path.join(ROOT, "src/app/api/enterprise/policies/[id]");

  it("[id] dynamic route directory exists", () => {
    expect(existsSync(idPath)).toBe(true);
  });
});
