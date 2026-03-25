/**
 * Prune script safety: refuses to touch protected files, has dry-run default,
 * mentions running npm test/prebuild/build after apply.
 */

import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PRUNE_SCRIPT = path.join(ROOT, "scripts", "prune-unused.ts");

function read(p: string): string {
  return readFileSync(p, "utf-8");
}

describe("prune script safety contract", () => {
  it("refuses to touch protected files", () => {
    const content = read(PRUNE_SCRIPT);
    expect(content).toContain("supabase/migrations");
    expect(content).toContain("docs/SYSTEM_SPEC.md");
    expect(content).toContain("docs/FINAL_LOCK_CHECKLIST.md");
    expect(content).toContain("docs/LAUNCH_QUALITY_REPORT.md");
    expect(content).toContain("WHAT_CHANGED.md");
    expect(content).toMatch(/isProtected|PROTECTED|protected/);
  });

  it("has dry-run default", () => {
    const content = read(PRUNE_SCRIPT);
    expect(content).toMatch(/dryRun|dry-run|dry_run/);
    expect(content).toMatch(/--apply|apply.*argv/);
  });

  it("mentions running npm test and prebuild and build after apply", () => {
    const content = read(PRUNE_SCRIPT);
    expect(content).toContain("npm test");
    expect(content).toContain("prebuild");
    expect(content).toContain("npm run build");
  });
});
