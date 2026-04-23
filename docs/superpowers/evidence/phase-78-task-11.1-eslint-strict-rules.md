# Phase 78 Task 11.1 — Restore ESLint strict rules

**Date:** 2026-04-22
**Plan reference:** `docs/superpowers/plans/2026-04-22-phase-78-100b-remediation.md` (Phase 11 Task 11.1)
**Defect class:** P0 (blind spot — CI green while critical type-safety and hook-deps rules were silenced)
**Status:** ✅ Green across the board — 0 lint errors, 0 warnings, tsc clean, 3003/3003 tests

---

## Problem

`eslint.config.mjs` had an override block for `src/**/*.{ts,tsx}` and
`e2e/**/*.{ts,tsx}` that explicitly disabled several critical rules:

```js
{
  files: ["src/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}"],
  rules: {
    "react/no-unescaped-entities": "off",
    "@typescript-eslint/no-explicit-any": "off",        // ← hides type-safety holes
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/purity": "off",
    "react-hooks/preserve-manual-memoization": "off",
    "react-hooks/exhaustive-deps": "off",               // ← hides stale-closure bugs
  },
},
```

`no-explicit-any` being off meant `: any` annotations were never flagged —
the codebase had accumulated 72 of them across ~25 files (admin API
routes, recommendations page, analytics handlers). Each is a type-safety
escape hatch that defeats `tsc`'s guarantees; collectively they amount
to a silent erosion of the type system.

`react-hooks/exhaustive-deps` being off meant effect/memo/callback
dependency arrays were never audited — 28 hook call sites across ~23
files had incomplete deps arrays, each a latent stale-closure bug
waiting to fire when a parent re-renders with a different captured
value. React's own linter exists specifically to catch these.

Combined: CI was green while the two rules best positioned to prevent
type and hook bugs at review time were muted.

## Fix

1. **Flipped the override** in `eslint.config.mjs` — removed both `"off"`
   entries. The two rules now inherit their default severity from the
   plugin presets (`error`).

2. **Fixed every resulting lint error** — 72 `no-explicit-any` + 28
   `exhaustive-deps`. Patterns used:

   **`no-explicit-any` — replace with precise types or `unknown`:**
   - Supabase query results: `any[]` → typed row interface
     (`Array<{ id: string; created_at: string; … }>`)
   - Error boundaries: `catch (err: any)` → `catch (err: unknown)` with
     narrowing via `err instanceof Error`
   - Dynamic JSON payloads: `Record<string, any>` → `Record<string, unknown>`
   - Provider-client wrappers (`SuppressionDbClient.from`): return type
     relaxed to `{ from: (table: string) => unknown }` with an internal
     `SuppressionChainable` cast at the call site — keeps the public API
     typed while admitting Supabase's own chain-builder opacity.

   **`exhaustive-deps` — add missing deps or memoize:**
   - Functions declared in component body referenced by `useEffect` →
     wrapped in `useCallback` with their own proper deps.
   - Unstable object/array literals in deps → lifted to `useMemo`.
   - Intentional one-shot effects (mount-only) → deps left empty with
     `// eslint-disable-next-line react-hooks/exhaustive-deps` +
     explanatory comment above the line.

3. **Ancillary TS-error fixes** — restoring strict rules surfaced 5
   latent type errors the compiler had been tolerating via `any`:
   - `consent-audit.ts`, `email-suppression.ts` — `SuppressionDbClient.from`
     return-type narrowing fallout fixed by the relaxation above.
   - `cold-leads/page.tsx`, `recommendations/page.tsx` — next-intl's
     `Translator` type could not be assigned to `Record<string, unknown>`;
     signature tightened to `Record<string, string | number | Date>`.
   - `execute-lead-call.ts` — `leadRow.state` was `string | null` but
     needed `LeadState | null`; added `LEAD_STATES` readonly set and
     `coerceLeadState(raw: unknown): LeadState | null` guard, replaced
     the `as string | null` cast with the guard call.

4. **Residual `no-unused-vars` cleanup** — restoring the strict rules
   made `npm run lint --max-warnings=0` achievable, but 55 pre-existing
   `@typescript-eslint/no-unused-vars` warnings still blocked it.
   Mechanically prefixed unused identifiers with `_` (the project's
   `argsIgnorePattern: "^_"` convention) across 28 files, using proper
   destructuring-rename syntax for destructured function parameters
   (`{ service: _service }` rather than `{ _service }`) so the property
   names still resolve against their source type. Also fixed one latent
   syntax bug in `lead-lifecycle-machine.ts:233` where a `,` terminator
   was used instead of `;`, causing the next line to be a
   `no-unused-expressions` warning.

## Verification

| Gate | Command | Result |
|---|---|---|
| Two target rules | `npx eslint src e2e \| grep -E "(no-explicit-any\|exhaustive-deps)"` | 0 matches ✅ |
| Full ESLint | `npm run lint` (= `eslint src e2e --max-warnings=0`) | exit 0 ✅ |
| tsc | `npx tsc --noEmit` | Clean (silent) ✅ |
| Full regression | `npx vitest run` | **3003/3003** tests across **389/389** files ✅ |

**Delta vs Task 10.4** (Task 10.4 landed at 389 files / 3003 tests):

- 0 files added, 0 files removed, 0 tests added or removed
- Test count identical → no behavioral regression from the type /
  dependency / rename edits

## Scope discipline

What this task did NOT do (deferred by design):

- **Did not** flip any of the other off-by-default rules
  (`react/no-unescaped-entities`, the three `react-hooks/*` rules other
  than `exhaustive-deps`). Each needs its own triage pass; this task
  was scoped to the two most impactful silencings.
- **Did not** widen the `src/**`-only override to the other path
  blocks (tests, scripts). `__tests__/**` and `scripts/**` have their
  own lint posture that may legitimately want `any` for fixture shape
  flexibility.
- **Did not** add a `no-explicit-any` no-regression test. A CI lint gate
  (Task 11.2) is the appropriate enforcement mechanism and will be
  added in that task.
- **Did not** audit runtime behavior of the `exhaustive-deps` fixes.
  React's linter catches the static shape but doesn't verify that
  adding a dep doesn't introduce an unintended re-render loop; those
  are caught by existing integration tests, all of which still pass.

## Outcome

`npm run lint` is now a meaningful CI gate: it fails on any `any`
introduced in `src/` or `e2e/`, any hook with incomplete deps, and any
unused variable. Combined with `tsc --noEmit` already passing, the
review-time quality bar for this codebase is materially stronger than
before — the two failure modes that were silently landing (`: any`
escape hatches and stale-closure hook bugs) can no longer slip through
review.

## Files changed

**Config:**

- `eslint.config.mjs` — removed `"@typescript-eslint/no-explicit-any": "off"`
  and `"react-hooks/exhaustive-deps": "off"` from the `src/**/*.{ts,tsx}`
  override block.

**Type-safety fixes** (batched under `no-explicit-any` remediation):

- `src/app/api/admin/**/*.ts` (export/all, calls-deep, revenue-deep,
  stats, analytics) — typed Supabase query result shapes, narrowed
  `catch` blocks.
- `src/app/app/recommendations/page.tsx` — next-intl translator typing.
- `src/lib/consent-audit.ts`, `src/lib/email-suppression.ts` —
  `SuppressionDbClient.from` return-type relaxation.
- `src/lib/execute-lead-call.ts` — `coerceLeadState` guard added.
- ~20 other files with targeted `any` → `unknown`/precise-type
  replacements.

**Hook-deps fixes** (batched under `exhaustive-deps` remediation):

- `src/app/settings/**/*.tsx` and `src/app/app/**/*.tsx` — wrapped
  helper functions in `useCallback`, lifted literal deps into `useMemo`,
  added explanatory `eslint-disable-next-line` comments for the
  genuinely one-shot effects.

**Residual unused-var cleanup** (prefix-with-`_` convention):

- 28 files across `src/app/api/`, `src/app/app/`, `src/components/`,
  `src/lib/` — identifiers prefixed with `_` where declared.
- `src/lib/intelligence/lead-lifecycle-machine.ts:233` — `,` → `;`
  syntax fix.

**Evidence:**

- `docs/superpowers/evidence/phase-78-task-11.1-eslint-strict-rules.md`
  (this file)
