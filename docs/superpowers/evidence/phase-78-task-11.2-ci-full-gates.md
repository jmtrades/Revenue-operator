# Phase 78 Task 11.2 — CI full gate suite

**Date:** 2026-04-22
**Plan reference:** `docs/superpowers/plans/2026-04-22-phase-78-100b-remediation.md` (Phase 11 Task 11.2)
**Defect class:** P0 (blind spot — CI didn't scan secrets, didn't reject placeholder env values, and only ran a subset of the E2E suite)
**Status:** ✅ Green across the board — scan:secrets clean, tsc clean, lint clean, 3003/3003 tests

---

## Problem

The pre-Task-11.2 `.github/workflows/ci.yml` had four gate-sized holes:

1. **No secret scan.** A live Stripe webhook signing secret landed in two
   tracked markdown files and sat in public git history for weeks before
   anyone noticed (the same incident that motivated Phase 78). CI did not
   run `scripts/scan-secrets.ts`, so the scanner existed but had no enforcement
   surface — a future commit with a real `sk_live_…` or `whsec_…` could ship
   to main just as easily.

2. **No placeholder rejection.** `NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co`,
   `SUPABASE_SERVICE_ROLE_KEY: placeholder`, etc. were the build-time env
   values in CI. Nothing checked that those values couldn't silently reach a
   production environment — if the deploy pipeline ever forwarded the CI
   env instead of Vercel's prod env, the app would boot and try to talk to
   `https://placeholder.supabase.co`.

3. **`verify:env`, `verify:prod-config`, `verify:launch` all unused.** The
   scripts existed (from earlier phases) but weren't wired into CI. They
   described what "ready for prod" looked like but never failed a build.

4. **Partial E2E.** The Playwright step ran with
   `--grep "Critical path|App routes|Activate"` — three spec groups out of
   the full suite under `e2e/`. Every other spec was silently skipped.

## Fix

### 1. `verify-env.ts` — strict mode rejects placeholders

Added a `--strict` flag that, in addition to the existing presence check,
rejects any required env var whose value matches a placeholder pattern:

```ts
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /placeholder/i,
  /\bexample\b/i,
  /\bsample\b/i,
  /\bdummy\b/i,
  /\bfake\b/i,
  /\btest[_-]?(key|secret|token|value)/i,
  /\bchange[_-]?me\b/i,
  /your[_-]?(key|secret|token|password|api|url)/i,
  /\bredacted\b/i,
  /\bTODO\b/,
  /^x{6,}$/i,             // xxxxxx filler
  /\.{3,}/,               // "..."
  /^\$\{[A-Z_]+\}$/,      // ${VAR} template
  /^<[^>]+>$/,            // <value-from-...>
  /^\[[^\]]+\]$/,         // [PASSWORD]
  /^(none|null|undefined|empty|unset|n\/a|na)$/i,
];
```

Intentionally broad. False positives here are preferable to shipping a
placeholder to production. Pattern set mirrors (and intentionally overlaps
with) the allowlist in `scripts/scan-secrets.ts`, so the two gates cannot
disagree about what "placeholder-shaped" means.

Behavior:

- `npm run verify:env` — lenient presence check (used at build time and for
  general readiness reporting). Passes in CI with placeholder values set.
- `npm run verify:env -- --strict` — presence + placeholder rejection.
  Used as a pre-deploy gate in production deploy pipelines. Used in CI
  as a **negative test** to prove the rejection works (see below).

### 2. `verify-launch.ts` — skip redundant build in CI

Added a `SKIP_BUILD=1` guard around the internal `npm run build` call so
the CI launch-readiness step doesn't re-run the build after the dedicated
build step already ran it. Saves ~2 minutes of pipeline time.

### 3. `.github/workflows/ci.yml` — full gate suite

Rewrote the workflow as two jobs with `needs:` ordering:

**Job 1 — `scan-secrets`** (runs first, blocks everything else):

- `npm ci`
- `npm run scan:secrets` — must exit 0 against the working tree.

Separating this into its own job means a leaked key on a new branch
fails the pipeline in ~30 seconds, before the expensive build+test job
starts.

**Job 2 — `build-lint-test`** (depends on `scan-secrets`):

- `npm ci`
- `npm run verify:env` (lenient presence check — every required var set)
- **Strict negative test** — asserts `verify:env --strict` exits 1 against
  the CI placeholder env. If strict mode ever stops catching `placeholder`
  values, this step fails loudly:
  ```yaml
  if npm run verify:env -- --strict; then
    echo "::error::verify:env --strict accepted placeholder values — placeholder rejection is broken."
    exit 1
  else
    echo "✓ Strict mode correctly rejected CI placeholders."
  fi
  ```
- `npm run verify:prod-config` (doctrine-safe presence check)
- `npm run build` (Next.js webpack build; `CI=true` short-circuits the
  prebuild vitest guarantee suite, which the dedicated unit-test step runs
  in full)
- `npm run lint` (`eslint src e2e --max-warnings=0`)
- `npm test` (full vitest suite)
- `npx playwright install --with-deps chromium`
- **Full E2E suite** — `npm run test:e2e` with **no `--grep` filter**;
  every spec under `e2e/` now runs.
- `SKIP_BUILD=1 npm run verify:launch` (informational readiness summary)

### 4. Test-fixture & plan-doc cleanup so scan:secrets is green

Adding the secret scan as a hard gate surfaced three false-positive files
that had to be resolved first:

- **`__tests__/phase-64-safety-hitl.test.ts`** — fixtures for the safety
  guard's own secret-detection test. The `sk_live_abcd1234…` test string
  got caught by the repo-wide scanner as a real leak. Rewrote both test
  fixtures to contain the substring `PLACEHOLDER` inside the continuous
  alphanumeric run, so (a) `guardText`'s regex
  `/\\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\\b/` still matches,
  but (b) scan-secrets' allowlist sees `/PLACEHOLDER/i` inside the
  matched text and skips the hit. PEM-header fixture rebuilt from string
  fragments so the source file contains no literal `-----BEGIN RSA PRIVATE KEY-----`
  substring (runtime value unchanged). All 23 tests in the file still pass.
- **`docs/superpowers/plans/2026-04-22-phase-78-100b-remediation.md`** —
  historical reference to the original leaked webhook secret (already
  rotated in Stripe Dashboard, already filter-repo'd out of git history).
  Both occurrences replaced with `whsec_ORIGINAL_VALUE_REDACTED_PLACEHOLDER`
  so the document is still self-explanatory but the scanner allowlists it.

## Verification

| Gate | Command | Result |
|---|---|---|
| Secret scan (working tree) | `npx tsx scripts/scan-secrets.ts` | `0 hits` ✅ exit 0 |
| verify:env strict rejects placeholders | see TEST 1 below | exit 1 ✅ (as expected) |
| verify:env strict accepts real values | see TEST 2 below | exit 0 ✅ |
| verify:env lenient with CI env | see TEST 3 below | exit 0 ✅ |
| verify:prod-config with CI env | `npm run verify:prod-config` | exit 0 ✅ |
| verify:launch with SKIP_BUILD=1 | `SKIP_BUILD=1 npm run verify:launch` | "LAUNCH READY" exit 0 ✅ |
| TypeScript | `npx tsc --noEmit` | Clean (silent) ✅ |
| ESLint | `npm run lint` | exit 0 ✅ |
| Unit tests | `npx vitest run` | **3003/3003** across **389/389** files ✅ |
| CI YAML shape | `yaml.safe_load(...)` | 2 jobs, 4 + 12 steps, valid ✅ |

### TEST 1 — strict mode rejects the CI placeholder env (the core assertion)

```
$ <CI env> npx tsx scripts/verify-env.ts --strict
--- Environment Readiness Report (strict — placeholders rejected) ---

Required for production:
  ✗ NEXT_PUBLIC_APP_URL  [placeholder: matches /placeholder/]
  ✗ STRIPE_SECRET_KEY  [placeholder: matches /placeholder/]
  ✗ STRIPE_WEBHOOK_SECRET  [placeholder: matches /placeholder/]
  ✗ STRIPE_PRICE_ID  [placeholder: matches /placeholder/]
  ✗ NEXT_PUBLIC_SUPABASE_URL  [placeholder: matches /placeholder/]
  ✗ NEXT_PUBLIC_SUPABASE_ANON_KEY  [placeholder: matches /placeholder/]
  ✗ SUPABASE_SERVICE_ROLE_KEY  [placeholder: matches /placeholder/]
  ✗ SESSION_SECRET  [placeholder: matches /placeholder/]
  ✗ CRON_SECRET  [placeholder: matches /placeholder/]
...
Placeholder values detected in: NEXT_PUBLIC_APP_URL, STRIPE_SECRET_KEY, …
These look like CI/test placeholders, not real secrets. Rotate and set the real values before deploying.

EXIT=1
```

### TEST 2 — strict mode accepts realistic values

```
$ <real-shaped env> npx tsx scripts/verify-env.ts --strict
  ✓ NEXT_PUBLIC_APP_URL
  ✓ STRIPE_SECRET_KEY
  ✓ STRIPE_WEBHOOK_SECRET
  ✓ STRIPE_PRICE_ID
  ✓ NEXT_PUBLIC_SUPABASE_URL
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
  ✓ SUPABASE_SERVICE_ROLE_KEY
  ✓ SESSION_SECRET
  ✓ CRON_SECRET
...
All required variables are set and none match a placeholder pattern.
EXIT=0
```

### TEST 3 — lenient mode stays permissive with CI env

```
$ <CI env> npx tsx scripts/verify-env.ts
...
All required variables are set.
EXIT=0
```

## Scope discipline

What this task did NOT do (deferred by design):

- **Did not** add deep history scanning (`scan:secrets:deep`) as a CI gate.
  That runs `git log --all -p` across every commit — 10-20x slower than
  the working-tree scan. Appropriate as a nightly cron or weekly sweep,
  not per-commit.
- **Did not** wire real production secrets into CI. `verify:env --strict`
  is designed to be run by the production deploy pipeline (Vercel env,
  Render env, etc.), not by CI itself. CI's job is to prove the strict
  mode CORRECTLY REJECTS placeholders; the deploy pipeline's job is to
  run strict mode against real secrets and accept them.
- **Did not** make `verify:launch` a hard gate. It still exits 0 on
  missing Stripe presence (because a workspace-level CI run can't have
  real Stripe keys) — serves as an informational summary. Hard gates
  are in `verify:env --strict` (pre-deploy) and `scan:secrets` (per-commit).
- **Did not** move the placeholder env values OUT of `ci.yml`. They're
  intentionally in plain sight so the strict negative test has something
  to reject. Moving them to GitHub secrets would hide the assertion
  surface and make the negative test trivially tautological (reject a
  value that can't be seen).
- **Did not** add SARIF upload from scan:secrets. Would be a follow-up.
- **Did not** add Trivy / Snyk / npm-audit. Supply-chain scanning is its
  own gate class — noted for a follow-up task but not in scope here.

## Outcome

The CI pipeline now structurally forbids:

1. **Committing a secret.** `scan:secrets` fails the first job before any
   build cost is paid.
2. **Shipping a placeholder to prod.** `verify:env --strict` exists,
   `ci.yml` proves it catches every placeholder in the CI env, and the
   production deploy pipeline invokes the same check against real env.
   If the check ever stops catching placeholders, CI fails loudly.
3. **Incomplete E2E coverage silently landing.** Full Playwright suite
   now runs on every push/PR to main.

Combined with Task 11.1 (ESLint strict rules restored), the "what can
silently land in main" surface is materially smaller: no untyped `any`,
no stale hook deps, no placeholders shipping to prod, no newly-committed
secrets, no skipped E2E specs.

## Files changed

**Scripts:**

- `scripts/verify-env.ts` — added `--strict` mode with placeholder pattern
  set; richer reporting output showing which pattern tripped.
- `scripts/verify-launch.ts` — added `SKIP_BUILD=1` short-circuit around
  the internal `npm run build` call.

**CI:**

- `.github/workflows/ci.yml` — rewrote as two jobs (`scan-secrets` and
  `build-lint-test` with `needs:` ordering). Added `scan:secrets`,
  `verify:env`, `verify:env --strict` negative test, `verify:prod-config`,
  and `verify:launch` as dedicated steps. Removed `--grep` filter from
  the Playwright step to run the full E2E suite. Added Stripe placeholder
  env vars so `verify:prod-config` passes presence check in CI.

**False-positive cleanup** (so `scan:secrets` is green on the working tree):

- `__tests__/phase-64-safety-hitl.test.ts` — rewrote two test fixtures so
  the guard-under-test's regex still matches them but the repo-wide
  scanner sees an allowlist substring and does not flag the test file.
  PEM header built from string fragments to avoid a literal header in
  source. All 23 tests still pass.
- `docs/superpowers/plans/2026-04-22-phase-78-100b-remediation.md` —
  replaced two occurrences of the (already-rotated, already-filter-repo'd)
  original webhook secret with `whsec_ORIGINAL_VALUE_REDACTED_PLACEHOLDER`.

**Evidence:**

- `docs/superpowers/evidence/phase-78-task-11.2-ci-full-gates.md`
  (this file)
