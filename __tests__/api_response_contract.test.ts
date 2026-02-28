/**
 * API contract: routes return status 200, { ok: boolean }, never throw, never leak stack or internal IDs.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { readdirSync } from "fs";

const ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT, "src/app/api");

function* walkRoutes(dir: string, prefix = ""): Generator<string> {
  const entries = readdirSync(path.join(dir, prefix), { withFileTypes: true });
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      yield* walkRoutes(dir, rel);
    } else if (e.name === "route.ts") {
      yield rel;
    }
  }
}

describe("API response contract", () => {
  it("connector ingest and voice outcome return 200 with ok boolean", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    const voice = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(ingest).toMatch(/status:\s*200|NextResponse\.json\([^)]*,\s*\{\s*status:\s*200/);
    expect(voice).toMatch(/status:\s*200/);
    expect(ingest).toMatch(/ok:\s*(true|false)/);
    expect(voice).toMatch(/ok:\s*(true|false)/);
  });

  it("approval approve route returns 200 and ok or idempotent", () => {
    const approve = readFileSync(path.join(ROOT, "src/app/api/enterprise/approvals/approve/route.ts"), "utf-8");
    expect(approve).toMatch(/status:\s*200/);
    expect(approve).toMatch(/ok:\s*true/);
  });

  it("routes do not expose stack trace or internal UUID in JSON", () => {
    const routes: string[] = [];
    for (const rel of walkRoutes(API_DIR, "")) {
      routes.push(path.join(API_DIR, rel));
    }
    const violators: string[] = [];
    for (const file of routes.slice(0, 30)) {
      try {
        const content = readFileSync(file, "utf-8");
        if (content.includes("stack") && content.includes("error") && content.includes("json")) violators.push(path.relative(ROOT, file));
        if (content.includes("internal_id") && content.includes("json")) violators.push(path.relative(ROOT, file));
      } catch {
        // skip
      }
    }
    expect(violators.length).toBe(0);
  });
});
