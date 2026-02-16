/**
 * Doctrine invariant tests: ensure system never outputs advice, recommendations, performance claims, or metrics.
 * Scans API responses for banned patterns. Fails build if detected.
 */

import { describe, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { globSync } from "glob";

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
    const apiFiles = globSync("src/app/api/**/*.ts", { cwd: process.cwd() });
    const violations: Array<{ file: string; line: number; content: string }> = [];

    for (const file of apiFiles) {
      const content = readFileSync(join(process.cwd(), file), "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
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
    const doctrineFiles = globSync("src/lib/**/*doctrine*.ts", { cwd: process.cwd() });
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
    const apiFiles = globSync("src/app/api/**/route.ts", { cwd: process.cwd() });
    const violations: Array<{ file: string; line: number }> = [];

    for (const file of apiFiles) {
      const content = readFileSync(join(process.cwd(), file), "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes("NextResponse.json") &&
          (line.includes("workspace_id") ||
            line.includes("thread_id") ||
            line.includes("lead_id") ||
            line.includes("user_id"))
        ) {
          if (!line.includes("error") && !line.includes("workspace_id") && !line.includes("//")) {
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
