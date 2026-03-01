/**
 * Invariant: User-facing UI must not contain technical/SaaS terms.
 * Replace with: external source, governance, record, execution, operating standard, ingestion, authorization.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FORBIDDEN_UI = [
  "webhook",
  "integration",
  "schema",
  "mapping",
  "pipeline",
  "processor",
  "executor",
  "automation",
  "workflow",
  "campaign",
  "CRM",
  "bot",
  "SaaS",
  "tool",
  "platform",
  "optimize",
  "growth",
  "boost",
  "scale",
  "payload",
  "analytics",
  "sequence",
  "dialer",
  "metrics",
  "software",
];

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

function extractUserFacingStrings(content: string): string[] {
  const out: string[] = [];
  const dq = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  const sq = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  const tl = /`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = dq.exec(content)) !== null) out.push(m[1]);
  while ((m = sq.exec(content)) !== null) out.push(m[1]);
  while ((m = tl.exec(content)) !== null) out.push(m[1]);
  return out;
}

function isUserFacing(s: string): boolean {
  if (s.length < 3) return false;
  if (s.startsWith("/") || s.includes("workspace_id") || s.includes("api/")) return false;
  if (s.includes("var(--") || s.includes("@/")) return false;
  if (/^[a-z0-9_-]+$/i.test(s) && s.includes("-")) return false;
  if (s.includes("Authorization:") || s.includes("Bearer ") || s.includes("POST ") && s.includes("{")) return false;
  if (s.includes("schema.org") || s.includes("@context")) return false; // JSON-LD structured data, not user-facing
  return true;
}

const DASHBOARD_V7_EXCLUDE = ["src/app/dashboard/agents/", "src/app/dashboard/analytics/", "src/app/dashboard/campaigns/", "src/app/dashboard/team/", "src/app/dashboard/integrations/", "src/app/dashboard/layout.tsx"];

describe("UI forbidden technical terms", () => {
  const files = [...walkTsx(APP), ...walkTsx(COMPONENTS)];
  const violations: { file: string; term: string; snippet: string }[] = [];

  const pricingOrActivate = (rel: string) => rel.includes("pricing/") || rel.includes("activate/page");
  const dashboardV7 = (rel: string) => DASHBOARD_V7_EXCLUDE.some((p) => rel.startsWith(p) || rel === p);
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const rel = path.relative(ROOT, file);
    if (dashboardV7(rel)) continue;
    for (const s of extractUserFacingStrings(content)) {
      if (!isUserFacing(s)) continue;
      const lower = s.toLowerCase();
      for (const term of FORBIDDEN_UI) {
        if (pricingOrActivate(rel) && (term === "growth" || term === "scale")) continue;
        const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (re.test(lower)) {
          violations.push({ file: rel, term, snippet: s.slice(0, 60) });
        }
      }
    }
  }

  it("has no forbidden technical terms in user-facing strings", () => {
    const msg = violations.length
      ? violations.map((v) => `${v.file}: "${v.term}" in "${v.snippet}..."`).join("\n")
      : "";
    expect(violations, msg).toHaveLength(0);
  });
});
