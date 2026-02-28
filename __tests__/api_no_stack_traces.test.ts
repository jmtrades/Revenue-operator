/**
 * Invariant: No API route returns 400/500 with stack traces in JSON body.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT, "src/app/api");

function* walkRoutes(dir: string, prefix = ""): Generator<string> {
  try {
    const entries = readdirSync(path.join(dir, prefix), { withFileTypes: true });
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) yield* walkRoutes(dir, rel);
      else if (e.name === "route.ts") yield path.join(dir, rel);
    }
  } catch {
    // ignore
  }
}

describe("API routes do not return stack traces", () => {
  it("no route returns 400/500 with stack or error.stack in JSON", () => {
    const routes = [...walkRoutes(API_DIR, "")];
    const violators: string[] = [];
    for (const file of routes) {
      try {
        const content = readFileSync(file, "utf-8");
        const hasBadStatus = /status:\s*(400|401|403|404|500)/.test(content);
        const returnsStack = /\.json\s*\(\s*[^)]*stack|error\.stack|err\.stack/.test(content);
        if (hasBadStatus && returnsStack) violators.push(path.relative(ROOT, file));
      } catch {
        // skip
      }
    }
    expect(violators).toHaveLength(0);
  });
});
