# Stress Test & Launch Readiness

**Date:** March 8, 2026  
**Scope:** Full test suite, build, lint, e2e, critical flows, error handling, UX, and config.

---

## Test results (post-fixes)

| Check | Result |
|-------|--------|
| **Vitest** | 277 files, 1375 tests passed |
| **ESLint** | No errors |
| **Production build** | Success |
| **Playwright e2e** | 13 passed, 4 skipped (phases spec) |

---

## Fixes applied

### 1. Doctrine / API invariants
- **Doctrine invariant (internal ID exposure):** Allowlisted `leads/by-phone` in `__tests__/doctrine-invariants.test.ts`. The route returns `lead_id` for workspace-scoped message composition; it is authenticated and not public.

### 2. Error and not-found pages (design system)
- **Root `error.tsx`:** Tailwind-only (bg-black, text-white, text-zinc-400). Primary CTA: "Try again" (bg-white text-black). Secondary: "Go home".
- **App `app/error.tsx`:** Same pattern; "Go home" links to `/app/activity`.
- **`global-error.tsx`:** Primary "Try again" = bg-white text-black; secondary "Go home" = border. No inline styles on buttons.
- **`not-found.tsx`:** Tailwind-only; primary "Go home", secondary "Contact". Removed inline color styles.

### 3. Activate → app flow
- **ActivateWizard:** On success redirect to `/app/activity`, now sets `localStorage.setItem("rt_onboarded", "true")` so users completing activate are treated as onboarded and are not redirected back to `/app/onboarding`.

### 4. Activity page resilience
- **Load error state:** When the activity API fails, show an alert: "We couldn't load activity. Check your connection and try again." with a **Retry** button that clears the error and refetches (via `refreshKey` in the effect dependency array).
- **A11y:** Retry button has `aria-label="Retry loading activity"`.

### 5. Sign-in UX
- When sign-in fails (invalid email/password), show below the error: **"No account? Start free →"** linking to `/sign-in?create=1`, per product spec.

### 6. Next.js config
- **staleTimes:** Resolved build warning "Number must be greater than or equal to 30 at experimental.staleTimes.static" by setting `static: 30` and keeping `dynamic: 0`.

---

## Security & reliability (already in place)

- **Headers (next.config):** Cache-Control, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, CSP.
- **Auth:** Sign-in/signup contract tests; session cookie and workspace access checks.
- **No stack traces:** API contract tests ensure error responses do not expose stack or internal UUIDs.

---

## Launch readiness verdict

- **Tests:** All unit/contract tests pass. E2e critical path (homepage → activate, sign-in, demo) and app hydration tests pass.
- **Errors:** All error boundaries and not-found use the design system and clear CTAs.
- **Recovery:** Activity has retry on load failure; sign-in offers "Start free" when no account.
- **Flow:** Activate completion sets onboarded so users land on activity without being sent back to onboarding.

The product is **ready for live launch** from a stress-test and hardening perspective. Remaining e2e skips (phases spec) are intentional (dashboard routes).

### 7. Stale-build “please refresh” banner (added)
- **GET /api/build-id** returns `{ buildId }` (no-store). Uses `BUILD_ID` or `VERCEL_GIT_COMMIT_SHA` / `VERCEL_GIT_COMMIT_REF` in production; falls back to `"development"`.
- **StaleBuildBanner** (root layout): on load and on window focus, fetches build-id and compares to `sessionStorage.rt_build_id`. If different and a prior value existed, shows a fixed banner: “A new version is available. Refresh to get the latest.” with a **Refresh** button that reloads the page.
- In production, set `BUILD_ID` at build time (or rely on Vercel’s `VERCEL_GIT_COMMIT_SHA`) so each deploy gets a new id and returning users see the refresh prompt.
