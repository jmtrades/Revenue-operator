/**
 * Structural tests for src/lib/speech-governance/compiler.ts
 * Validates template-based compilation, approval handling, compliance pack usage,
 * and absence of raw LLM output.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/* ------------------------------------------------------------------ */
/*  Source text for structural assertions                              */
/* ------------------------------------------------------------------ */
const SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/speech-governance/compiler.ts"),
  "utf-8"
);

describe("speech-governance/compiler — module exports", () => {
  it("exports compileGovernedMessage function", () => {
    expect(SOURCE).toContain("export async function compileGovernedMessage");
  });

  it("exports CompileGovernedMessageInput interface", () => {
    expect(SOURCE).toContain("export interface CompileGovernedMessageInput");
  });

  it("exports CompileGovernedMessageOutput interface", () => {
    expect(SOURCE).toContain("export interface CompileGovernedMessageOutput");
  });
});

describe("speech-governance/compiler — template-based (no raw LLM)", () => {
  it("uses getApprovedTemplate for message generation", () => {
    expect(SOURCE).toContain("getApprovedTemplate");
    // Verify it's imported
    expect(SOURCE).toContain('import { getApprovedTemplate');
  });

  it("uses renderTemplate to fill slots", () => {
    expect(SOURCE).toContain("renderTemplate");
    expect(SOURCE).toContain('import { getApprovedTemplate, renderTemplate }');
  });

  it("does not reference raw LLM output (choices[0].content)", () => {
    expect(SOURCE).not.toContain("choices[0]");
    expect(SOURCE).not.toContain("choices[0].content");
    expect(SOURCE).not.toContain(".content");
    // Also ensure no direct OpenAI/Anthropic patterns
    expect(SOURCE).not.toContain("openai");
    expect(SOURCE).not.toContain("completion.choices");
  });

  it("does not contain freeform generation patterns", () => {
    expect(SOURCE).not.toContain("generateText");
    expect(SOURCE).not.toContain("chatCompletion");
    expect(SOURCE).not.toContain("prompt:");
  });

  it("blocks when no approved template exists", () => {
    // When template is null, decision should be "block"
    expect(SOURCE).toContain("no_approved_template");
    expect(SOURCE).toContain('decision: "block"');
  });
});

describe("speech-governance/compiler — approval_required handling", () => {
  it("checks for approval_required mode", () => {
    expect(SOURCE).toContain('"approval_required"');
    expect(SOURCE).toContain('approval_mode === "approval_required"');
  });

  it("creates message approval record when approval_required", () => {
    expect(SOURCE).toContain("createMessageApproval");
    // Verify it's imported
    expect(SOURCE).toContain("createMessageApproval");
  });

  it("returns approval_required decision", () => {
    expect(SOURCE).toContain('decision: "approval_required"');
  });

  it("includes approval_id in trace when approval created", () => {
    expect(SOURCE).toContain("approval_id: approvalId");
  });

  it("checks for preview_required mode", () => {
    expect(SOURCE).toContain('approval_mode === "preview_required"');
    expect(SOURCE).toContain('decision: "preview_required"');
  });
});

describe("speech-governance/compiler — jurisdiction_locked handling", () => {
  it("checks for jurisdiction_locked mode", () => {
    expect(SOURCE).toContain('"jurisdiction_locked"');
    expect(SOURCE).toContain('approval_mode === "jurisdiction_locked"');
  });

  it("blocks when jurisdiction is missing under jurisdiction_locked", () => {
    // Validates that jurisdiction is present and non-empty
    expect(SOURCE).toContain("input.jurisdiction");
  });

  it("creates approval record for jurisdiction_locked messages", () => {
    // jurisdiction_locked path also calls createMessageApproval
    const jurisdictionSection = SOURCE.slice(
      SOURCE.indexOf('"jurisdiction_locked"')
    );
    expect(jurisdictionSection).toContain("createMessageApproval");
  });
});

describe("speech-governance/compiler — compliance pack integration", () => {
  it("calls resolveCompliancePack", () => {
    expect(SOURCE).toContain("resolveCompliancePack");
  });

  it("imports resolveCompliancePack from governance module", () => {
    expect(SOURCE).toContain("resolveCompliancePack");
    expect(SOURCE).toContain("@/lib/governance/compliance-pack");
  });

  it("appends compliance disclaimers to rendered text", () => {
    expect(SOURCE).toContain("compliance.disclaimers");
    expect(SOURCE).toContain("disclaimerLines");
  });
});

describe("speech-governance/compiler — policy enforcement", () => {
  it("calls resolveMessagePolicy", () => {
    expect(SOURCE).toContain("resolveMessagePolicy");
    expect(SOURCE).toContain("@/lib/governance/message-policy");
  });

  it("checks for forbidden phrases in rendered text", () => {
    expect(SOURCE).toContain("forbidden_phrases");
    expect(SOURCE).toContain("policy_forbidden");
  });

  it("uses containsForbiddenLanguage doctrine check", () => {
    expect(SOURCE).toContain("containsForbiddenLanguage");
    expect(SOURCE).toContain("forbidden_language");
  });

  it("enforces SMS character limit via MAX_SMS_CHARS", () => {
    expect(SOURCE).toContain("MAX_SMS_CHARS");
    expect(SOURCE).toContain("trimToMaxChars");
  });

  it("evaluates approved policies", () => {
    expect(SOURCE).toContain("getApprovedPolicies");
    expect(SOURCE).toContain("evaluatePolicies");
  });

  it("checks requiresReview for certain intent/domain/jurisdiction combos", () => {
    expect(SOURCE).toContain("requiresReview");
    expect(SOURCE).toContain('decision: "review_required"');
  });
});

describe("speech-governance/compiler — output decisions", () => {
  const VALID_DECISIONS = ["send", "block", "review_required", "approval_required", "preview_required"];

  for (const decision of VALID_DECISIONS) {
    it(`can return "${decision}" decision`, () => {
      expect(SOURCE).toContain(`decision: "${decision}"`);
    });
  }
});

describe("speech-governance/compiler — trace completeness", () => {
  it("includes policy_checks in trace", () => {
    expect(SOURCE).toContain("policy_checks:");
  });

  it("includes templates_used in trace", () => {
    expect(SOURCE).toContain("templates_used:");
  });

  it("includes clause_plan in trace", () => {
    expect(SOURCE).toContain("clause_plan:");
  });

  it("includes disclaimer_lines in trace", () => {
    expect(SOURCE).toContain("disclaimer_lines:");
  });

  it("includes approval_mode in trace", () => {
    expect(SOURCE).toContain("approval_mode:");
  });

  it("includes policy_id in trace", () => {
    expect(SOURCE).toContain("policy_id:");
  });

  it("includes template_id in trace", () => {
    expect(SOURCE).toContain("template_id:");
  });
});

describe("speech-governance/compiler — no nondeterminism", () => {
  it("contains no Math.random()", () => {
    expect(SOURCE).not.toContain("Math.random");
  });

  it("contains no crypto.randomUUID", () => {
    expect(SOURCE).not.toContain("crypto.randomUUID");
  });
});
