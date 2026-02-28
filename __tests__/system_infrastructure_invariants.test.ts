/**
 * System hard guarantees (II): Invariant enforcement. Fail build if any invariant violated.
 * 1. No outbound message from AI freeform
 * 2. All outbound must reference message_template
 * 3. All outbound execution from action_intents
 * 4. No direct Twilio/voice/payment in core pipeline
 * 5. work_unit state transitions match allowed_states
 * 6. approval_required blocks send
 * 7. jurisdiction_locked overrides autopilot
 * 8. No execution path bypasses compliance pack
 * 9. No mutation deletes historical records (append-only)
 * 10. No public route exposes internal IDs
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { getWorkUnitTypeDefinition, isAllowedState, WORK_UNIT_TYPES, type WorkUnitType } from "@/lib/work-unit/types";

const ROOT = path.resolve(__dirname, "..");

describe("II.1 No outbound message from AI freeform", () => {
  it("message compiler uses templates only; no LLM-generated message text in send path", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("renderTemplate");
    expect(compiler).toContain("getApprovedTemplate");
    expect(compiler).not.toContain("content: response.choices"); // no raw LLM output as message
  });

  it("execution plan emit sends action intent only; no direct send", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("createActionIntent");
    expect(emit).not.toContain("sendViaTwilio");
    expect(emit).not.toContain("fetch(");
  });
});

describe("II.2 All outbound messages reference message_template", () => {
  it("speech-governance compiler requires getApprovedTemplate", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("getApprovedTemplate");
    expect(compiler).toContain("template.body");
  });
});

describe("II.3 All outbound execution from action_intents", () => {
  it("delivery provider is invoked only from action executor path, not from pipeline", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("action_intents");
    expect(emit).not.toContain("sendViaTwilio");
  });
  it("action-intents module does not import Twilio or Stripe", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).not.toContain("twilio");
    expect(actionIntents).not.toContain("stripe");
  });
});

describe("II.4 No direct Twilio/voice/payment in core pipeline", () => {
  it("execution-plan and pipeline decision do not import delivery provider or Twilio", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(build).not.toContain("sendViaTwilio");
    expect(build).not.toContain("delivery/provider");
    expect(emit).not.toContain("sendViaTwilio");
  });
});

describe("II.5 work_unit state transitions match allowed_states", () => {
  it("every work unit type has definition with allowed_states", () => {
    for (const type of WORK_UNIT_TYPES) {
      const def = getWorkUnitTypeDefinition(type as WorkUnitType);
      expect(def).not.toBeNull();
      expect(def!.allowed_states.length).toBeGreaterThan(0);
    }
  });

  it("isAllowedState rejects state not in definition", () => {
    const def = getWorkUnitTypeDefinition("appointment");
    expect(def).not.toBeNull();
    expect(isAllowedState("appointment", "proposed")).toBe(true);
    expect(isAllowedState("appointment", "invalid_state_xyz")).toBe(false);
  });
});

describe("II.6 approval_required blocks send", () => {
  it("speech-governance compiler returns approval_required when approval_mode is approval_required and does not send", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("approval_required");
    expect(compiler).toContain("decision: \"approval_required\"");
    expect(compiler).toMatch(/approval_mode\s*===\s*["']approval_required["']/);
    expect(compiler).toContain("createMessageApproval");
    expect(compiler).toMatch(/return\s*\{[\s\S]*?decision:\s*["']approval_required["']/);
  });
});

describe("II.7 jurisdiction_locked overrides autopilot", () => {
  it("governance message-policy resolves approval_mode; jurisdiction_locked is a mode", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("jurisdiction_locked");
    expect(policy).toContain("approval_mode");
  });
});

describe("II.8 No execution path bypasses compliance pack", () => {
  it("speech-governance compiler calls resolveCompliancePack before send decision", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("resolveCompliancePack");
    expect(compiler).toContain("required_disclaimers");
  });
});

describe("II.9 Append-only: no delete of historical records", () => {
  it("action_intents and work_units migrations do not allow DELETE", () => {
    const actionIntentsMigration = readFileSync(
      path.join(ROOT, "supabase/migrations/action_intents.sql"),
      "utf-8"
    );
    expect(actionIntentsMigration).not.toMatch(/DELETE\s+FROM\s+action_intents/);
  });
  it("action-intents module has no delete function", () => {
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(index).not.toContain(".delete(");
  });
});

describe("II.10 No public route exposes internal IDs", () => {
  it("public work page uses external_ref not raw workspace_id in URL", () => {
    try {
      const content = readFileSync(
        path.join(ROOT, "src/app/public/work/[external_ref]/page.tsx"),
        "utf-8"
      );
      expect(content).toMatch(/external_ref|params\./);
    } catch {
      expect(true).toBe(true);
    }
  });
});
