/**
 * Phase 78 Task 10.1 contract: `ActivateWizard` must render ONLY the current
 * step's component. Before this task, `step === 4` rendered three sibling step
 * components simultaneously (`PackBusinessStep`, `CustomizeStep`, `ActivateStep`
 * in a fragment). That violated every wizard UX invariant — stacked forms, no
 * visible progress, and the final "Go Live" screen was always visible once the
 * user reached step 4, so they could "activate" without ever completing the
 * intermediate fields.
 *
 * This test runs in node (no DOM needed) and reads the ActivateWizard source
 * to assert the structural contract: each step branch renders exactly one of
 * the named step components.
 *
 * The test is intentionally source-level because:
 *   (1) the repo's vitest config is `environment: "node"` with include
 *       restricted to `**\/*.test.ts` (no tsx). Spinning up a DOM runner just
 *       for this one test isn't worth the config churn.
 *   (2) the defect class is structural — a future regression would look like
 *       "someone merged two step branches again" — which is exactly what a
 *       structural AST-style check catches.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STEP_COMPONENTS = [
  "PlanStep",
  "GoalStep",
  "PhoneOnlyStep",
  "PackBusinessStep",
  "CustomizeStep",
  "ActivateStep",
] as const;

const WIZARD_PATH = resolve(
  __dirname,
  "..",
  "..",
  "src/app/activate/ActivateWizard.tsx",
);

const WIZARD_SRC = readFileSync(WIZARD_PATH, "utf8");

describe("ActivateWizard — single-step render contract", () => {
  it("each `step === N` conditional block renders exactly one step component", () => {
    // Find every `{step === N && (` conditional JSX block in the render
    // return. The block extends to its matching `)}` (tracked by paren depth
    // starting at 1 after the opening `(`).
    //
    // Example shape:
    //   {step === 4 && (
    //     <ActivateStep ... />
    //   )}
    //
    // A failure mode (the OLD bug) looked like:
    //   {step === 4 && (
    //     <>
    //       <PackBusinessStep ... />
    //       <CustomizeStep ... />
    //       <ActivateStep ... />
    //     </>
    //   )}
    //
    // The contract: each block mentions at most ONE of STEP_COMPONENTS.

    const blockRegex = /\{step === (\d+) && \(/g;
    const violations: Array<{ step: string; components: string[] }> = [];
    let anyBlockFound = false;
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(WIZARD_SRC)) !== null) {
      anyBlockFound = true;
      const stepNum = m[1];
      const blockStart = m.index + m[0].length;
      // Walk forward until the matching closing paren of this block.
      let depth = 1;
      let i = blockStart;
      while (i < WIZARD_SRC.length && depth > 0) {
        const ch = WIZARD_SRC[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (depth === 0) break;
        i++;
      }
      const blockBody = WIZARD_SRC.slice(blockStart, i);
      const mentioned = STEP_COMPONENTS.filter((c) =>
        new RegExp(`<${c}[\\s/>]`).test(blockBody),
      );
      if (mentioned.length !== 1) {
        violations.push({ step: stepNum, components: mentioned });
      }
    }

    expect(anyBlockFound, "found no `step === N` JSX branches — regex drift").toBe(true);
    expect(
      violations,
      `step branch(es) render wrong number of step components: ${JSON.stringify(violations)}`,
    ).toEqual([]);
  });

  it("every one of the six step components is rendered by exactly one step branch", () => {
    // Guards against (a) accidentally deleting a step and (b) rendering the
    // same step component in two different branches.
    const branchToComponent = new Map<string, string>();
    const blockRegex = /\{step === (\d+) && \(/g;
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(WIZARD_SRC)) !== null) {
      const stepNum = m[1];
      const blockStart = m.index + m[0].length;
      let depth = 1;
      let i = blockStart;
      while (i < WIZARD_SRC.length && depth > 0) {
        const ch = WIZARD_SRC[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (depth === 0) break;
        i++;
      }
      const blockBody = WIZARD_SRC.slice(blockStart, i);
      const mentioned = STEP_COMPONENTS.filter((c) =>
        new RegExp(`<${c}[\\s/>]`).test(blockBody),
      );
      if (mentioned.length === 1) {
        branchToComponent.set(stepNum, mentioned[0]);
      }
    }

    const renderedComponents = [...branchToComponent.values()].sort();
    const expected = [...STEP_COMPONENTS].sort();
    expect(renderedComponents).toEqual(expected);
  });
});

describe("ActivateWizard — StepId contract (types.ts)", () => {
  const typesSrc = readFileSync(
    resolve(__dirname, "..", "..", "src/app/activate/steps/types.ts"),
    "utf8",
  );

  it("StepId union covers 1 through 6", () => {
    // The wizard has 6 real steps after the refactor. Regressing back to 4
    // is exactly the bug we're preventing.
    expect(typesSrc).toMatch(/export type StepId = 1 \| 2 \| 3 \| 4 \| 5 \| 6/);
  });

  it("STEPS array has 6 entries", () => {
    // Count `id: N` entries with ids 1..6 in the STEPS export.
    const stepsMatch = typesSrc.match(/export const STEPS[\s\S]*?\];/);
    expect(stepsMatch, "STEPS export not found").toBeTruthy();
    const body = stepsMatch![0];
    const ids = [...body.matchAll(/id:\s*(\d+)/g)].map((x) => Number(x[1]));
    expect(ids.sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
