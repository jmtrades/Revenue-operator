/**
 * Invariant: Invite route does not mention CRM, automation, campaign, etc. Append-only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

const FORBIDDEN_INVITE = ["crm", "automation", "campaign", "saas", "bot", "workflow"];

describe("Enterprise invite append-only and language", () => {
  it("invite route does not contain forbidden SaaS/marketing language", () => {
    const invite = read("src/app/api/enterprise/invite/route.ts");
    const lower = invite.toLowerCase();
    for (const word of FORBIDDEN_INVITE) {
      expect(lower).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it("invite route uses insert (append-only); no delete", () => {
    const invite = read("src/app/api/enterprise/invite/route.ts");
    expect(invite).toMatch(/\.insert\s*\(|workspace_invites/);
    expect(invite).not.toMatch(/\.delete\s*\(|DELETE\s+FROM/i);
  });
});
