/**
 * UI doctrine: forbidden language in user-facing strings.
 * Fails build if dashboard/components use software-like copy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const FORBIDDEN = [
  "running", "monitoring", "tracking", "AI", "automation", "real-time", "live",
  "updating", "analytics", "performance", "productivity", "system status",
  "processing", "dashboard",
  "urgent", "immediately", "asap", "quickly", "important", "forget",
  "software", "app", "platform", "tool", "assistant", "feature", "interface", "screen", "page", "click",
  "we", "us",
];
const FORBIDDEN_PHRASES = ["don't forget", "right away", "system will"];

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
  // Double-quoted strings
  const dq = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = dq.exec(content)) !== null) out.push(m[1]);
  // Single-quoted
  const sq = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  while ((m = sq.exec(content)) !== null) out.push(m[1]);
  // Template literals (simple, same line)
  const tl = /`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  while ((m = tl.exec(content)) !== null) out.push(m[1]);
  return out;
}

/** Marketing pages and sections: factual copy only; excluded. See docs/MARKETING_PAGES_DOCTRINE.md */
const MARKETING_EXCLUDE = [
  "src/app/pricing/",
  "src/app/product/",
  "src/app/example/",
  "src/app/demo/",
  "src/app/onboarding/",
  "src/app/industries/",
  "src/app/blog/",
  "src/app/privacy/",
  "src/app/terms/",
  "src/app/contact/",
  "src/components/sections/",
  "src/components/demo/",
  "src/app/layout.tsx",
  "src/app/opengraph-image.tsx",
  "src/components/ActivateForm.tsx",
  "src/app/activate/page.tsx",
  "src/app/sign-in/page.tsx",
];
/** Onboarding: fixed product copy (e.g. first-record message "what we agreed") is factual and mandated. */
const ONBOARD_EXCLUDE = ["src/app/onboard/"];
/** Activity feed: filter and card labels (Urgent, Leads, etc.) are product terms. */
const ACTIVITY_FEED_EXCLUDE = ["src/app/dashboard/activity/"];
/** v7 dashboard: Agents, Analytics, Campaigns, Team, Integrations nav and pages use product terms. */
const DASHBOARD_V7_EXCLUDE = ["src/app/dashboard/agents/", "src/app/dashboard/analytics/", "src/app/dashboard/campaigns/", "src/app/dashboard/team/", "src/app/dashboard/integrations/", "src/app/dashboard/layout.tsx"];
/** App demo (/app/*): activity cards and nav use product terms (Urgent, Lead, Analytics, etc.). */
const APP_DEMO_EXCLUDE = ["src/app/app/"];
/** Billing plan modal: plan names and API identifiers (Starter, Pro, Business, Enterprise). */
const BILLING_PLAN_EXCLUDE = ["src/components/PlanChangeModal.tsx"];
/** Design system components used in app: variant/label product terms (urgent, Dashboard) allowed in app context. */
const UI_APP_TERMS_EXCLUDE = ["src/components/ui/Badge.tsx", "src/components/ui/CommandPalette.tsx"];

function normRel(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

describe("UI doctrine: forbidden language in dashboard/components", () => {
  const allFiles = [...walkTsx(APP), ...walkTsx(COMPONENTS)];
  const files = allFiles.filter((f) => {
    const rel = normRel(f);
    return !MARKETING_EXCLUDE.some((p) => rel.startsWith(p) || rel === p) && !ONBOARD_EXCLUDE.some((p) => rel.startsWith(p)) && !ACTIVITY_FEED_EXCLUDE.some((p) => rel.startsWith(p)) && !DASHBOARD_V7_EXCLUDE.some((p) => rel.startsWith(p) || rel === p) && !APP_DEMO_EXCLUDE.some((p) => rel.startsWith(p)) && !BILLING_PLAN_EXCLUDE.some((p) => rel.startsWith(p) || rel === p) && !UI_APP_TERMS_EXCLUDE.some((p) => rel === p);
  });
  const violations: { file: string; word: string; snippet: string }[] = [];

  function isUserFacing(s: string): boolean {
    if (s.startsWith("/") || s.includes("workspace_id") || (s.includes("?") && s.length > 30)) return false;
    if (s.includes("window.location") || s.includes("location.origin")) return false; // redirect/API URLs, not displayed copy
    if (s.includes("@/") || s.includes("var(--")) return false;
    if (s.startsWith("@") && s.includes("/") && !s.includes(" ")) return false; // npm package specifier (e.g. @vapi-ai/web), not user-facing copy
    if (s.includes("../") || s.includes("/page") || /^(\.\.\/)?[a-z-]+\/page$/i.test(s)) return false; // import paths
    if (/^\[.*\]/.test(s)) return false; // log/debug prefixes not user-facing
    if (/^[a-z0-9_-]+$/i.test(s) && s.includes("-")) return false;
    if (/\b(tracking|font)-[a-z0-9-]+/i.test(s) || /^\s*(text-|rounded-|uppercase\s)/.test(s)) return false;
    if (/min-h-|flex-col|items-center|justify-center|rounded-|bg-stone|p-8|Generated by|Create Next App/i.test(s)) return false; // class names / boilerplate
    if (s === "assistant" || s === "user") return false; // role enum values, not displayed copy
    return true;
  }

  function containsForbiddenWord(text: string): { word: string } | null {
    const lower = text.toLowerCase();
    for (const phrase of FORBIDDEN_PHRASES) {
      if (lower.includes(phrase.toLowerCase())) return { word: phrase };
    }
    for (const word of FORBIDDEN) {
      const w = word.toLowerCase();
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(lower)) return { word };
    }
    return null;
  }

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const rel = normRel(file);
    for (const s of extractStrings(content)) {
      if (!isUserFacing(s)) continue;
      const match = containsForbiddenWord(s);
      if (match) violations.push({ file: rel, word: match.word, snippet: s.slice(0, 60) });
    }
  }

  it("has no forbidden words in user-facing strings", () => {
    const msg = violations.length
      ? violations.map((v) => `${v.file}: "${v.word}" in "${v.snippet}..."`).join("\n")
      : "";
    expect(violations, msg).toHaveLength(0);
  });
});
