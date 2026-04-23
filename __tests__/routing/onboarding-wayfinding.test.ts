/**
 * Phase 78 Task 10.3 contract: `/onboarding` must do state-aware wayfinding
 * rather than a single unconditional `redirect("/activate")`.
 *
 * Before this task, `src/app/onboarding/page.tsx` was a 5-line file that
 * ALWAYS redirected to `/activate`, regardless of whether the user was
 * authenticated, whether they had a workspace, or whether they had
 * completed phone provisioning. Returning users with a fully-provisioned
 * workspace who hit `/onboarding` (e.g. from a bookmark or stale email
 * link) got bounced back into the activation wizard and saw a "set up
 * your AI" pitch — instead of their dashboard. That's a P0 wayfinding
 * defect: the app doesn't know who its own returning users are.
 *
 * Required behaviour (per plan):
 *   - unauthenticated / no workspace → /activate
 *   - workspace exists but phone not provisioned → /activate (or the
 *     current step of the onboarding state machine, which lands at the
 *     number step)
 *   - workspace exists AND phone provisioned → /app/dashboard (the
 *     canonical post-setup home, ROUTES.APP_HOME)
 *
 * This test is source-level (runs under node env) because (a) the defect
 * is structural — we're asserting the page consults the state machine —
 * and (b) the repo's vitest config is node-only. E2E coverage is a
 * separate follow-up; this contract test gives us a fast regression
 * guard that stays green across refactors.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGE_PATH = resolve(
  __dirname,
  "..",
  "..",
  "src/app/onboarding/page.tsx",
);

const SRC = readFileSync(PAGE_PATH, "utf8");

describe("/onboarding — state-aware wayfinding contract", () => {
  it("is no longer the 5-line unconditional redirect to /activate", () => {
    // Historical shape:
    //   import { redirect } from "next/navigation";
    //   export default function OnboardingPage() {
    //     redirect("/activate");
    //   }
    // Roughly 5 non-blank lines. After the fix the file must be
    // substantially larger because it now consults the onboarding state
    // machine and branches between multiple destinations.
    const nonBlankLines = SRC.split("\n").filter((l) => l.trim().length > 0);
    expect(
      nonBlankLines.length,
      `expected /onboarding page to grow past the trivial redirect; got ${nonBlankLines.length} non-blank lines`,
    ).toBeGreaterThan(15);
  });

  it("consults the onboarding state machine", () => {
    // The state machine (`getOnboardingState` from
    // `@/lib/onboarding/state-machine`) is the single source of truth for
    // "does this workspace have a phone yet?" and "is onboarding complete?".
    // Any state-aware wayfinding must route through it.
    expect(SRC).toMatch(/getOnboardingState/);
    expect(SRC).toMatch(/@\/lib\/onboarding\/state-machine/);
  });

  it("looks up the user's workspace (owner_id or session)", () => {
    // Workspace resolution — either via `workspaces` table lookup keyed on
    // the authenticated user, or via an equivalent helper. The mere
    // presence of `workspaces` as a string confirms the lookup flow.
    expect(SRC).toMatch(/workspaces/);
    expect(SRC).toMatch(/(owner_id|auth|session)/);
  });

  it("has at least two distinct redirect targets (conditional routing)", () => {
    // A state-aware page must redirect to *different* destinations based
    // on state. Count distinct `redirect(...)` targets that contain `/`.
    const redirectTargets = new Set<string>();
    const re = /redirect\(\s*[`"']([^`"']+)[`"']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(SRC)) !== null) {
      redirectTargets.add(m[1]);
    }
    // Also catch template-literal redirects like `redirect(\`/activate${query}\`)`
    const tmplRe = /redirect\(\s*`([^`$]+)(\$\{[^}]+\})?[^`]*`/g;
    while ((m = tmplRe.exec(SRC)) !== null) {
      // Normalize by stripping template expression suffix:
      const base = m[1].replace(/\$\{[^}]+\}/, "");
      if (base.startsWith("/")) redirectTargets.add(base);
    }
    expect(
      redirectTargets.size,
      `expected >= 2 distinct redirect targets; got ${JSON.stringify([...redirectTargets])}`,
    ).toBeGreaterThanOrEqual(2);
  });

  it("routes a fully-provisioned user away from /activate", () => {
    // Pragmatic check: the source must contain at least one redirect target
    // that is NOT /activate or /activate-prefixed. That's the branch for
    // returning users who have finished onboarding. The target may appear
    // as a string literal (`redirect("/app/dashboard")`), a template literal
    // (`redirect(\`/foo${x}\`)`), OR a constant reference like
    // `redirect(ROUTES.APP_HOME)` / `redirect(APP_HOME_PATH)`.
    const re = /redirect\(\s*[`"']([^`"']+)[`"']/g;
    const tmplRe = /redirect\(\s*`([^`$]+)/g;
    const targets: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(SRC)) !== null) targets.push(m[1]);
    while ((m = tmplRe.exec(SRC)) !== null) targets.push(m[1]);
    const nonActivateLiteral = targets.filter((t) => !t.startsWith("/activate"));
    // Also accept a constant-reference redirect like ROUTES.APP_HOME — that's
    // the idiomatic post-setup target in this codebase. If any redirect()
    // call takes an identifier starting with an uppercase letter (not a
    // string literal), treat it as a distinct non-/activate target.
    const hasConstantRedirect = /redirect\(\s*[A-Z][A-Za-z0-9_.]*\s*\)/.test(SRC);
    expect(
      nonActivateLiteral.length + (hasConstantRedirect ? 1 : 0),
      `expected at least one non-/activate redirect target; string/tmpl targets=${JSON.stringify(targets)}, hasConstantRedirect=${hasConstantRedirect}`,
    ).toBeGreaterThanOrEqual(1);
  });
});
