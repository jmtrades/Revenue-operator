/**
 * Phase 78 Task 10.2 contract: `ActivateStep` must not render literal
 * placeholder text like `[your Revenue Operator number]`, and it must not
 * render a "your agent is live" success card / confetti unconditionally —
 * the success UI must be gated on a real provisioning signal.
 *
 * Before this task, `ActivateStep.tsx` shipped with three hardcoded carrier
 * forwarding codes containing the literal string `[your Revenue Operator
 * number]`, and the "Your agent is live" hero block + `<Confetti />` rendered
 * the moment the user reached step 6 — before they had clicked Activate,
 * before any onboard API call, before any number was provisioned. Users saw
 * confetti + success language before anything had actually happened, which
 * is a textbook "fake success UI" P0.
 *
 * This test runs in node (no DOM) and reads the ActivateStep source to assert
 * the structural contract.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STEP_PATH = resolve(
  __dirname,
  "..",
  "..",
  "src/app/activate/steps/ActivateStep.tsx",
);

const SRC = readFileSync(STEP_PATH, "utf8");

describe("ActivateStep — no literal placeholders", () => {
  it("contains no `[your ...]` literal placeholder strings", () => {
    // Match `[your ` (case-insensitive) — catches `[your Revenue Operator
    // number]`, `[your AI number]`, `[your RT number]`, etc. Any of those
    // appearing in source means a literal placeholder is being rendered to
    // the user instead of being interpolated from a prop.
    const matches = SRC.match(/\[your\s/gi) || [];
    expect(
      matches,
      `ActivateStep.tsx contains literal [your ...] placeholder(s): ${JSON.stringify(matches)}`,
    ).toEqual([]);
  });

  it("does not contain the specific `[your Revenue Operator number]` placeholder", () => {
    expect(SRC).not.toMatch(/\[your Revenue Operator number\]/i);
  });

  it("carrier forwarding codes interpolate the phoneNumber prop", () => {
    // After the fix, the three carrier codes should interpolate a variable
    // (phoneNumber) rather than hardcode a literal bracketed placeholder.
    // Assert that each carrier code references `phoneNumber` — either via
    // template literal ${phoneNumber} or string concatenation.
    //
    // We look at the carrier branch block (between the `*21*` prefix and
    // the closing `#`, or `*72` prefix for Verizon) and check for phoneNumber.
    // Cheaper proxy: the file must reference `phoneNumber` inside the branch
    // that defines `code`.
    //
    // Grep for the three carrier codes and ensure they contain `phoneNumber`:
    const carrierLines = SRC.split("\n").filter((ln) =>
      /code\s*=\s*.*(\*21\*|\*72|\*\*21\*)/i.test(ln),
    );
    expect(
      carrierLines.length,
      "expected 3 carrier code assignments (att/verizon/tmobile)",
    ).toBeGreaterThanOrEqual(3);
    for (const ln of carrierLines) {
      expect(
        ln,
        `carrier code line should interpolate phoneNumber: ${ln}`,
      ).toMatch(/phoneNumber/);
    }
  });
});

describe("ActivateStep — success UI gated on real provisioning state", () => {
  it("accepts a `provisioned` (or equivalent) prop", () => {
    // After the fix, ActivateStepProps should carry a boolean prop that
    // signals real provisioning completion. We accept any of: provisioned,
    // agentLive, activated — the specific name is an implementation detail,
    // but SOME boolean gate must exist.
    expect(SRC).toMatch(
      /(provisioned|agentLive|activated)\??\s*:\s*boolean/,
    );
  });

  it("Confetti is rendered conditionally, not unconditionally", () => {
    // Before the fix: `<Confetti key="step5-confetti" />` was a top-level
    // child of the returned JSX — rendered every time the step mounted.
    // After the fix: it must be inside a `{cond && <Confetti ... />}`
    // expression, or removed entirely.
    //
    // Detection: find the `<Confetti` tag. Walk backwards to the nearest
    // non-whitespace character and check that it is NOT a JSX structural
    // token that would make this an unconditional child (`>` from a parent
    // opening tag, `}` that closes a map/expression, or start-of-file).
    // The legal forms are either `{cond && <Confetti ... />}` (preceded by
    // `(` after the `&&`) or `{... ? <Confetti .../> : ...}`.
    const confettiIdx = SRC.indexOf("<Confetti");
    if (confettiIdx === -1) {
      // Also acceptable: Confetti removed entirely.
      return;
    }
    // Read 40 chars before the Confetti tag, strip whitespace/newlines.
    const before = SRC.slice(Math.max(0, confettiIdx - 80), confettiIdx);
    // The fix renders Confetti inside a conditional, so somewhere in the
    // 80 chars preceding `<Confetti` we expect to see `&&` (the && short-
    // circuit) or `?` (ternary). An unconditional render would have just
    // `>` or `<>` (fragment open) as the nearest non-whitespace character.
    const stripped = before.replace(/\s+/g, "");
    expect(
      /&&$|\?$/.test(stripped),
      `Confetti must be inside a conditional; chars before: "${before}"`,
    ).toBe(true);
  });

  it("`agent is live` heading is rendered conditionally", () => {
    // The "Your agent is live" heading (t("agentLiveHeading", ...)) must
    // live inside a conditional block. Before the fix it was in a plain
    // div that was always rendered. After the fix it must be inside a
    // `{provisioned && (...)}` (or equivalent) expression.
    const needle = "agentLiveHeading";
    const idx = SRC.indexOf(needle);
    if (idx === -1) {
      // Also acceptable: the success block removed entirely.
      return;
    }
    // Walk backwards from the needle looking for the enclosing `<div` or
    // similar block. The outer container must be preceded by `&& (` or `?`.
    // Simpler heuristic: search backwards up to 400 chars for the start of
    // a conditional expression.
    const windowStart = Math.max(0, idx - 800);
    const before = SRC.slice(windowStart, idx);
    // Look for "provisioned && (" or "activated && (" or "agentLive && ("
    // preceding the heading. If any of those appear AFTER the previous
    // closing `)}` or `</div>`, the heading is conditional.
    const hasConditionalGate =
      /(provisioned|agentLive|activated)\s*&&\s*\(/.test(before) ||
      /(provisioned|agentLive|activated)\s*\?\s*/.test(before);
    expect(
      hasConditionalGate,
      `"agent is live" heading must be gated on a provisioning boolean. Preceding window: "${before.slice(-300)}"`,
    ).toBe(true);
  });
});
