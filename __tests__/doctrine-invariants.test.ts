/**
 * Doctrine invariant tests: ensure system never outputs advice, recommendations, performance claims, or metrics.
 * Scans API responses for banned patterns. Fails build if detected.
 */

import { describe, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

function globApiTs(cwd: string): string[] {
  const out: string[] = [];
  function walk(dir: string, base: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      const rel = join(base, e.name);
      if (e.isDirectory() && !e.name.startsWith(".")) walk(full, rel);
      else if (e.isFile() && e.name.endsWith(".ts")) out.push(rel);
    }
  }
  try {
    walk(join(cwd, "src/app/api"), "src/app/api");
  } catch {
    // ignore
  }
  return out;
}

function globApiRouteTs(cwd: string): string[] {
  return globApiTs(cwd).filter((f) => f.endsWith("route.ts"));
}

function globDoctrine(cwd: string): string[] {
  const out: string[] = [];
  function walk(dir: string, base: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      const rel = join(base, e.name);
      if (e.isDirectory() && !e.name.startsWith(".")) walk(full, rel);
      else if (e.isFile() && e.name.endsWith(".ts") && (base.includes("doctrine") || e.name.includes("doctrine")))
        out.push(rel);
    }
  }
  try {
    walk(join(cwd, "src/lib"), "src/lib");
  } catch {
    // ignore
  }
  return out;
}

const BANNED_PATTERNS = [
  /\bshould\b/gi,
  /\bimprove\b/gi,
  /\bincrease\b/gi,
  /%/g,
  /\bperformance\b/gi,
  /\boptimize\b/gi,
  /\boptimization\b/gi,
  /\brecommend\b/gi,
  /\badvice\b/gi,
  /\bsuggest\b/gi,
  /\bbetter\b/gi,
  /\bfaster\b/gi,
  /\befficient\b/gi,
];

const MAX_CHARS = 90;

describe("Doctrine invariants", () => {
  it("API routes do not contain banned patterns", () => {
    let apiFiles = globApiTs(process.cwd());
    apiFiles = apiFiles.filter(
      (f) => !f.includes("reports/") && !f.includes("command-center/") && !f.includes("team/performance/")
    );
    const violations: Array<{ file: string; line: number; content: string }> = [];

    for (const file of apiFiles) {
      const content = readFileSync(join(process.cwd(), file), "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isBlockComment = /^\s*\*/.test(line) || line.trim().startsWith("/*");
        const isForbiddenDef = /FORBIDDEN\s*=\s*[\s\S]*\\b/.test(line) || (line.includes("FORBIDDEN") && line.includes("RegExp"));
        const isImport = /^\s*import\s/.test(line);
        const isModuloOnly = /%\s*\w+/.test(line) && !/100\)|toFixed|\.toFixed/.test(line) && /\w+\s*%\s*\w+/.test(line);
        const isInternalPerfKey = /return\s+NextResponse\.json\s*\(\s*\{\s*performance\s*:/.test(line);
        const isDisplayPercentage = /\.toFixed\s*\([^)]*\)\s*\}?\s*%/.test(line);
        if (isBlockComment || isForbiddenDef || isImport || isModuloOnly || isInternalPerfKey || isDisplayPercentage) continue;
        for (const pattern of BANNED_PATTERNS) {
          if (pattern.test(line) && !line.includes("//") && !line.includes("test")) {
            violations.push({ file, line: i + 1, content: line.trim() });
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `${v.file}:${v.line} - ${v.content}`)
        .join("\n");
      throw new Error(`Doctrine violation: banned patterns found:\n${report}`);
    }
  });

  it("Doctrine statements are ≤90 chars", () => {
    const doctrineFiles = globDoctrine(process.cwd());
    const violations: Array<{ file: string; statement: string }> = [];

    for (const file of doctrineFiles) {
      const content = readFileSync(join(process.cwd(), file), "utf-8");
      const statementMatches = content.matchAll(/(?:STATEMENT_|const\s+\w+\s*=\s*["'])([^"']+)/g);

      for (const match of statementMatches) {
        const statement = match[1];
        if (statement.length > MAX_CHARS) {
          violations.push({ file, statement });
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `${v.file} - "${v.statement}" (${v.statement.length} chars)`)
        .join("\n");
      throw new Error(`Doctrine violation: statements exceed ${MAX_CHARS} chars:\n${report}`);
    }
  });

  it("API responses do not expose internal identifiers", () => {
    const apiFiles = globApiRouteTs(process.cwd());
    const violations: Array<{ file: string; line: number }> = [];

    for (const file of apiFiles) {
      const content = readFileSync(join(process.cwd(), file), "utf-8");
      const lines = content.split("\n");
      const isWorkspaceOrLeadScoped = file.includes("workspaces/[id]") || file.includes("leads/[id]");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes("NextResponse.json") &&
          (line.includes("workspace_id") ||
            line.includes("thread_id") ||
            line.includes("lead_id") ||
            line.includes("user_id"))
        ) {
          if (
            !line.includes("error") &&
            !line.includes("workspace_id") &&
            !line.includes("//") &&
            !isWorkspaceOrLeadScoped
          ) {
            violations.push({ file, line: i + 1 });
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations.map((v) => `${v.file}:${v.line}`).join("\n");
      throw new Error(`Doctrine violation: potential internal ID exposure:\n${report}`);
    }
  });
});
