/**
 * Email module: structural integrity, no hardcoded credentials,
 * template-based sending, email validation, and pure function tests.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const EMAIL_DIR = path.join(ROOT, "src/lib/email");

/* ── Helper ────────────────────────────────────────────────────── */
function readEmailFile(name: string): string {
  return readFileSync(path.join(EMAIL_DIR, name), "utf-8");
}

// ─── 1. Email module exists with expected files ─────────────────

describe("email module structure", () => {
  const expectedFiles = [
    "templates.ts",
    "welcome.ts",
    "activation.ts",
    "invite.ts",
    "call-alert.ts",
    "daily-trust.ts",
    "day-3-nudge.ts",
    "agent-live.ts",
    "dunning.ts",
    "weekly-trust.ts",
  ];

  it.each(expectedFiles)("file %s exists and is non-empty", (file) => {
    const src = readEmailFile(file);
    expect(src.length).toBeGreaterThan(0);
  });

  it("templates.ts exports buildWelcomeEmail", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("export function buildWelcomeEmail");
  });

  it("templates.ts exports buildTrialExpiringEmail", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("export function buildTrialExpiringEmail");
  });

  it("templates.ts exports buildMilestoneEmail", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("export function buildMilestoneEmail");
  });

  it("templates.ts exports buildMinutePackEmail", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("export function buildMinutePackEmail");
  });

  it("templates.ts exports buildDunningEmail", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("export function buildDunningEmail");
  });

  it("welcome.ts exports sendWelcomeEmail and sendGoLiveEmail", () => {
    const src = readEmailFile("welcome.ts");
    expect(src).toContain("export async function sendWelcomeEmail");
    expect(src).toContain("export async function sendGoLiveEmail");
  });

  it("invite.ts exports sendInviteEmail and buildInviteEmailHTML", () => {
    const src = readEmailFile("invite.ts");
    expect(src).toContain("export async function sendInviteEmail");
    expect(src).toContain("export function buildInviteEmailHTML");
  });

  it("dunning.ts exports sendDunningEmail", () => {
    const src = readEmailFile("dunning.ts");
    expect(src).toContain("export async function sendDunningEmail");
  });

  it("day-3-nudge.ts exports buildDay3NudgeEmail", () => {
    const src = readEmailFile("day-3-nudge.ts");
    expect(src).toContain("export function buildDay3NudgeEmail");
  });
});

// ─── 2. No hardcoded credentials ────────────────────────────────

describe("email module security", () => {
  const allFiles = [
    "templates.ts",
    "welcome.ts",
    "activation.ts",
    "invite.ts",
    "call-alert.ts",
    "daily-trust.ts",
    "day-3-nudge.ts",
    "agent-live.ts",
    "dunning.ts",
    "weekly-trust.ts",
  ];

  it.each(allFiles)("%s contains no hardcoded API keys", (file) => {
    const src = readEmailFile(file);
    // Should never have a literal Resend API key
    expect(src).not.toMatch(/["']re_[A-Za-z0-9]{20,}["']/);
    // Should not have hardcoded SendGrid keys
    expect(src).not.toMatch(/["']SG\.[A-Za-z0-9_-]{20,}["']/);
    // No generic secret patterns
    expect(src).not.toMatch(/["']sk_[A-Za-z0-9]{20,}["']/);
  });

  it("welcome.ts reads RESEND_API_KEY from process.env", () => {
    const src = readEmailFile("welcome.ts");
    expect(src).toContain("process.env.RESEND_API_KEY");
  });

  it("activation.ts reads RESEND_API_KEY from process.env", () => {
    const src = readEmailFile("activation.ts");
    expect(src).toContain("process.env.RESEND_API_KEY");
  });

  it("invite.ts reads RESEND_API_KEY from process.env", () => {
    const src = readEmailFile("invite.ts");
    expect(src).toContain("process.env.RESEND_API_KEY");
  });

  it("call-alert.ts reads RESEND_API_KEY from process.env", () => {
    const src = readEmailFile("call-alert.ts");
    expect(src).toContain("process.env.RESEND_API_KEY");
  });

  it("dunning.ts uses sendEmail helper (not raw API key)", () => {
    const src = readEmailFile("dunning.ts");
    expect(src).toContain("sendEmail");
  });

  it("EMAIL_FROM uses environment variable or safe default", () => {
    const welcome = readEmailFile("welcome.ts");
    expect(welcome).toContain("process.env.EMAIL_FROM");
    const invite = readEmailFile("invite.ts");
    expect(invite).toContain("process.env.EMAIL_FROM");
  });
});

// ─── 3. Template-based email sending ────────────────────────────

describe("email uses template system", () => {
  it("welcome.ts imports from templates", () => {
    const src = readEmailFile("welcome.ts");
    expect(src).toContain('from "@/lib/email/templates"');
    expect(src).toContain("buildWelcomeEmail");
  });

  it("dunning.ts imports buildDunningEmail from templates", () => {
    const src = readEmailFile("dunning.ts");
    expect(src).toContain('from "@/lib/email/templates"');
    expect(src).toContain("buildDunningEmail");
  });

  it("templates.ts uses emailWrapper for consistent branding", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("function emailWrapper");
    // All exported builders should use emailWrapper
    expect(src).toContain("emailWrapper(content");
  });

  it("templates.ts uses ctaButton helper for call-to-action buttons", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("function ctaButton");
    expect(src).toContain("ctaButton(");
  });

  it("templates.ts uses metricBox helper for metric displays", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("function metricBox");
    expect(src).toContain("metricBox(");
  });

  it("templates.ts produces valid HTML structure", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("<!DOCTYPE html>");
    expect(src).toContain("<html");
    expect(src).toContain("</html>");
    expect(src).toContain("<body");
    expect(src).toContain("</body>");
  });

  it("all email senders use structured HTML, not raw text only", () => {
    // welcome.ts sendGoLiveEmail uses inline HTML
    const welcome = readEmailFile("welcome.ts");
    expect(welcome).toContain("<html");

    // agent-live.ts uses inline HTML
    const agentLive = readEmailFile("agent-live.ts");
    expect(agentLive).toContain("<html");

    // call-alert.ts uses inline HTML
    const callAlert = readEmailFile("call-alert.ts");
    expect(callAlert).toContain("<html");

    // day-3-nudge.ts uses HTML template
    const nudge = readEmailFile("day-3-nudge.ts");
    expect(nudge).toContain("<html");
  });
});

// ─── 4. HTML escaping for XSS prevention ────────────────────────

describe("email XSS prevention", () => {
  it("templates.ts has escapeHtml function", () => {
    const src = readEmailFile("templates.ts");
    expect(src).toContain("function escapeHtml");
    expect(src).toContain("&amp;");
    expect(src).toContain("&lt;");
    expect(src).toContain("&gt;");
    expect(src).toContain("&quot;");
  });

  it("invite.ts has escapeHtml function", () => {
    const src = readEmailFile("invite.ts");
    expect(src).toContain("function escapeHtml");
  });

  it("call-alert.ts has escapeHtml function", () => {
    const src = readEmailFile("call-alert.ts");
    expect(src).toContain("function escapeHtml");
  });

  it("agent-live.ts has escapeHtml function", () => {
    const src = readEmailFile("agent-live.ts");
    expect(src).toContain("function escapeHtml");
  });
});

// ─── 5. Email validation (guard clauses) ────────────────────────

describe("email sending guards", () => {
  it("welcome.ts checks for empty email before sending", () => {
    const src = readEmailFile("welcome.ts");
    expect(src).toContain("if (!email) return false");
  });

  it("welcome.ts checks for RESEND_API_KEY before sending", () => {
    const src = readEmailFile("welcome.ts");
    expect(src).toContain("if (!process.env.RESEND_API_KEY) return false");
  });

  it("invite.ts checks for empty recipient and API key", () => {
    const src = readEmailFile("invite.ts");
    expect(src).toContain("!to");
    expect(src).toContain("RESEND_API_KEY");
  });

  it("call-alert.ts guards on RESEND_API_KEY", () => {
    const src = readEmailFile("call-alert.ts");
    expect(src).toContain("RESEND_API_KEY");
  });

  it("activation.ts gates on user email existence", () => {
    const src = readEmailFile("activation.ts");
    expect(src).toContain("if (!email) return false");
  });
});

// ─── 6. Error handling in email senders ─────────────────────────

describe("email error handling", () => {
  it("welcome.ts wraps fetch in try/catch", () => {
    const src = readEmailFile("welcome.ts");
    const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
    expect(tryCatchCount).toBeGreaterThanOrEqual(1);
  });

  it("invite.ts wraps fetch in try/catch", () => {
    const src = readEmailFile("invite.ts");
    const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
    expect(tryCatchCount).toBeGreaterThanOrEqual(1);
  });

  it("call-alert.ts wraps fetch in try/catch", () => {
    const src = readEmailFile("call-alert.ts");
    const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
    expect(tryCatchCount).toBeGreaterThanOrEqual(1);
  });

  it("dunning.ts wraps sendEmail in try/catch and logs to Sentry", () => {
    const src = readEmailFile("dunning.ts");
    expect(src).toContain("try {");
    expect(src).toContain("Sentry.captureException");
  });

  it("dunning.ts implements deduplication to prevent double sends", () => {
    const src = readEmailFile("dunning.ts");
    expect(src).toContain("Deduplication");
    expect(src).toContain("dunning_email_sent_");
  });
});

// ─── 7. Pure function tests: template builders ──────────────────

describe("buildWelcomeEmail (pure function)", () => {
  let buildWelcomeEmail: typeof import("@/lib/email/templates").buildWelcomeEmail;

  beforeAll(async () => {
    const mod = await import("@/lib/email/templates");
    buildWelcomeEmail = mod.buildWelcomeEmail;
  });

  it("returns subject and html", () => {
    const result = buildWelcomeEmail("Alice");
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(typeof result.subject).toBe("string");
    expect(typeof result.html).toBe("string");
  });

  it("includes the user name in the subject", () => {
    const result = buildWelcomeEmail("Bob");
    expect(result.subject).toContain("Bob");
  });

  it("produces valid HTML with DOCTYPE", () => {
    const result = buildWelcomeEmail("Charlie");
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain("</html>");
  });

  it("uses 'there' when name is empty", () => {
    const result = buildWelcomeEmail("");
    expect(result.subject).toContain("there");
  });

  it("includes quickstart steps", () => {
    const result = buildWelcomeEmail("Test");
    expect(result.html).toContain("quickstart");
    expect(result.html).toContain("Tell us about your business");
    expect(result.html).toContain("Choose your AI voice");
  });

  it("includes CTA button", () => {
    const result = buildWelcomeEmail("Test");
    expect(result.html).toContain("Start Setup");
    expect(result.html).toContain("/activate");
  });
});

describe("buildTrialExpiringEmail (pure function)", () => {
  let buildTrialExpiringEmail: typeof import("@/lib/email/templates").buildTrialExpiringEmail;

  beforeAll(async () => {
    const mod = await import("@/lib/email/templates");
    buildTrialExpiringEmail = mod.buildTrialExpiringEmail;
  });

  it("returns subject and html", () => {
    const result = buildTrialExpiringEmail({
      name: "Alice",
      daysLeft: 3,
      callsHandled: 15,
      minutesSaved: 60,
      leadsCapture: 5,
      tier: "solo",
    });
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
  });

  it("subject mentions days left", () => {
    const result = buildTrialExpiringEmail({
      name: "Alice",
      daysLeft: 3,
      callsHandled: 0,
      minutesSaved: 0,
      leadsCapture: 0,
      tier: "business",
    });
    expect(result.subject).toContain("3 days left");
  });

  it("subject says 'tomorrow' when 1 day left", () => {
    const result = buildTrialExpiringEmail({
      name: "Alice",
      daysLeft: 1,
      callsHandled: 10,
      minutesSaved: 40,
      leadsCapture: 3,
      tier: "solo",
    });
    expect(result.subject).toContain("tomorrow");
  });

  it("includes loss aversion messaging when calls > 0", () => {
    const result = buildTrialExpiringEmail({
      name: "Alice",
      daysLeft: 2,
      callsHandled: 5,
      minutesSaved: 20,
      leadsCapture: 2,
      tier: "solo",
    });
    expect(result.html).toContain("80%");
    expect(result.html).toContain("voicemail");
  });
});

describe("buildDunningEmail (pure function)", () => {
  let buildDunningEmail: typeof import("@/lib/email/templates").buildDunningEmail;

  beforeAll(async () => {
    const mod = await import("@/lib/email/templates");
    buildDunningEmail = mod.buildDunningEmail;
  });

  it("returns subject and html for attempt 1", () => {
    const result = buildDunningEmail({ attempt: 1, amountDue: "$29.99" });
    expect(result.subject).toContain("payment failed");
    expect(result.html).toContain("$29.99");
  });

  it("escalates urgency with higher attempts", () => {
    const a1 = buildDunningEmail({ attempt: 1, amountDue: "$10" });
    const a2 = buildDunningEmail({ attempt: 2, amountDue: "$10" });
    const a3 = buildDunningEmail({ attempt: 3, amountDue: "$10" });
    const a4 = buildDunningEmail({ attempt: 4, amountDue: "$10" });
    // Subjects should escalate
    expect(a1.subject).not.toEqual(a2.subject);
    expect(a3.subject).toContain("Final warning");
    expect(a4.subject).toContain("paused");
  });

  it("includes next retry date when provided", () => {
    const result = buildDunningEmail({
      attempt: 1,
      amountDue: "$29.99",
      nextRetryDate: "Apr 5, 2026",
    });
    expect(result.html).toContain("Apr 5, 2026");
  });

  it("caps at attempt 4 for attempts > 4", () => {
    const result = buildDunningEmail({ attempt: 10, amountDue: "$50" });
    expect(result.subject).toContain("paused");
  });
});

describe("buildMilestoneEmail (pure function)", () => {
  let buildMilestoneEmail: typeof import("@/lib/email/templates").buildMilestoneEmail;

  beforeAll(async () => {
    const mod = await import("@/lib/email/templates");
    buildMilestoneEmail = mod.buildMilestoneEmail;
  });

  it("produces milestone-specific headlines", () => {
    const r1 = buildMilestoneEmail({ name: "A", milestone: 1, totalCalls: 1, estimatedRevenueSaved: 47 });
    expect(r1.subject).toContain("first call");

    const r10 = buildMilestoneEmail({ name: "A", milestone: 10, totalCalls: 10, estimatedRevenueSaved: 470 });
    expect(r10.subject).toContain("10 calls");

    const r100 = buildMilestoneEmail({ name: "A", milestone: 100, totalCalls: 100, estimatedRevenueSaved: 4700 });
    expect(r100.subject).toContain("100 calls");
  });

  it("includes revenue estimate in html", () => {
    const result = buildMilestoneEmail({ name: "Test", milestone: 50, totalCalls: 50, estimatedRevenueSaved: 2350 });
    expect(result.html).toContain("2,350");
  });
});

describe("buildMinutePackEmail (pure function)", () => {
  let buildMinutePackEmail: typeof import("@/lib/email/templates").buildMinutePackEmail;

  beforeAll(async () => {
    const mod = await import("@/lib/email/templates");
    buildMinutePackEmail = mod.buildMinutePackEmail;
  });

  it("returns subject mentioning minutes added", () => {
    const result = buildMinutePackEmail({ name: "Alice", minutes: 500, price: "$49.99", newBalance: 750 });
    expect(result.subject).toContain("500");
    expect(result.subject).toContain("minutes");
  });

  it("includes price and new balance in html", () => {
    const result = buildMinutePackEmail({ name: "Alice", minutes: 500, price: "$49.99", newBalance: 750 });
    expect(result.html).toContain("$49.99");
    expect(result.html).toContain("750");
  });
});

describe("buildInviteEmailHTML (pure function)", () => {
  let buildInviteEmailHTML: typeof import("@/lib/email/invite").buildInviteEmailHTML;

  beforeAll(async () => {
    const mod = await import("@/lib/email/invite");
    buildInviteEmailHTML = mod.buildInviteEmailHTML;
  });

  it("produces HTML with inviter name and workspace", () => {
    const html = buildInviteEmailHTML({
      inviterName: "Alice",
      workspaceName: "Acme Corp",
      role: "admin",
      acceptUrl: "https://example.com/accept",
    });
    expect(html).toContain("Alice");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("admin");
    expect(html).toContain("https://example.com/accept");
  });

  it("escapes HTML in user-provided values", () => {
    const html = buildInviteEmailHTML({
      inviterName: '<script>alert("xss")</script>',
      workspaceName: "Safe & Sound",
      role: "member",
      acceptUrl: "https://example.com/accept",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Safe &amp; Sound");
  });

  it("includes invitation expiry notice", () => {
    const html = buildInviteEmailHTML({
      inviterName: "Bob",
      workspaceName: "Test",
      role: "viewer",
      acceptUrl: "https://example.com/accept",
    });
    expect(html).toContain("expires in 7 days");
  });
});

describe("buildDay3NudgeEmail (pure function)", () => {
  let buildDay3NudgeEmail: typeof import("@/lib/email/day-3-nudge").buildDay3NudgeEmail;

  beforeAll(async () => {
    const mod = await import("@/lib/email/day-3-nudge");
    buildDay3NudgeEmail = mod.buildDay3NudgeEmail;
  });

  it("returns subject and html", () => {
    const result = buildDay3NudgeEmail({
      userName: "Alice",
      readinessPct: 75,
      appUrl: "https://app.example.com",
    });
    expect(result.subject).toContain("first call");
    expect(result.html).toContain("75%");
    expect(result.html).toContain("https://app.example.com/activate");
  });

  it("escapes HTML in userName", () => {
    const result = buildDay3NudgeEmail({
      userName: "A<b>Bold</b>",
      readinessPct: 50,
      appUrl: "https://app.example.com",
    });
    expect(result.html).not.toContain("<b>Bold</b>");
    expect(result.html).toContain("&lt;b&gt;");
  });
});
