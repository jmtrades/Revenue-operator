/**
 * Category lock (I): Fail build if forbidden SaaS/category words appear in user-facing surfaces.
 * This system is Commercial Execution Infrastructure. Never: chatbot, automation, workflow builder,
 * campaign tool, sequence engine, CRM replacement.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

/** Words that must NEVER appear in user-facing copy (category violation). */
const CATEGORY_FORBIDDEN = [
  "chatbot",
  "automation",
  "workflow builder",
  "campaign tool",
  "sequence engine",
  "CRM replacement",
  "campaign manager",
  "sequence",
  "workflow",
  "automation tool",
  "bot",
  "AI caller",
  "campaign",
  "dialer",
  "crm",
];

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "src", "app");
const COMPONENTS = path.join(ROOT, "src", "components");

function* walkTsx(dir: string): Generator<string> {
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) yield* walkTsx(full);
      else if (e.isFile() && (e.name.endsWith(".tsx") || e.name.endsWith(".jsx"))) yield full;
    }
  } catch {
    // ignore
  }
}

function extractStrings(content: string): string[] {
  const out: string[] = [];
  const dq = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = dq.exec(content)) !== null) out.push(m[1]);
  const sq = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  while ((m = sq.exec(content)) !== null) out.push(m[1]);
  const tl = /`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  while ((m = tl.exec(content)) !== null) out.push(m[1]);
  return out;
}

const EXCLUDE = ["src/app/pricing/", "src/app/example/", "src/app/onboard/"];

describe("Category lock: no forbidden SaaS words in user-facing surfaces", () => {
  const allFiles = [...walkTsx(APP), ...walkTsx(COMPONENTS)];
  const files = allFiles.filter((f) => {
    const rel = path.relative(ROOT, f);
    return !EXCLUDE.some((p) => rel.startsWith(p));
  });
  const violations: { file: string; word: string; snippet: string }[] = [];

  function isUserFacing(s: string): boolean {
    if (s.startsWith("/") || s.includes("workspace_id") || (s.includes("?") && s.length > 30)) return false;
    if (s.includes("window.location") || s.includes("location.origin")) return false;
    if (s.includes("@/") || s.includes("var(--")) return false;
    if (s.includes("../") || /^\s*(text-|rounded-|uppercase\s)/.test(s)) return false;
    if (/^[a-z0-9_-]+$/i.test(s) && s.includes("-") && s.length < 20) return false;
    return true;
  }

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const rel = path.relative(ROOT, file);
    for (const s of extractStrings(content)) {
      if (!isUserFacing(s)) continue;
      const lower = s.toLowerCase();
      for (const word of CATEGORY_FORBIDDEN) {
        const w = word.toLowerCase();
        const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (re.test(lower)) {
          violations.push({ file: rel, word, snippet: s.slice(0, 80) });
          break;
        }
      }
    }
  }

  it("fails build if any category-forbidden word appears in user-facing strings", () => {
    const msg = violations.length
      ? violations.map((v) => `${v.file}: "${v.word}" in "${v.snippet}..."`).join("\n")
      : "";
    expect(violations, msg).toHaveLength(0);
  });
});
