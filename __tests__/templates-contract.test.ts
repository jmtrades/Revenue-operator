/**
 * Templates contract: message_templates table exists (migration), caps enforced, forbidden words rejected.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { containsForbiddenLanguage } from "@/lib/speech-governance/doctrine";

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "supabase", "migrations");

describe("Templates contract", () => {
  it("message_templates migration exists and defines table with body and max_chars", () => {
    const file = path.join(MIGRATIONS_DIR, "message_templates.sql");
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, "utf-8");
    expect(content).toContain("message_templates");
    expect(content).toContain("body");
    expect(content).toContain("max_chars");
    expect(content).toContain("template_id");
    expect(content).toContain("workspace_id");
  });

  it("doctrine rejects forbidden words in template body", () => {
    expect(containsForbiddenLanguage("You should try our service")).toBe(true);
    expect(containsForbiddenLanguage("We recommend you act now")).toBe(true);
    expect(containsForbiddenLanguage("Inquiry received. A response will follow.")).toBe(false);
  });

  it("message-templates API route exists", () => {
    const route = path.resolve(__dirname, "..", "src", "app", "api", "enterprise", "message-templates", "route.ts");
    expect(existsSync(route)).toBe(true);
    const content = readFileSync(route, "utf-8");
    expect(content).toContain("containsForbiddenLanguage");
    expect(content).toContain("CHANNEL_MAX");
  });
});
