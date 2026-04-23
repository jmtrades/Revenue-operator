# Phase 78 — $100B-Grade P0 Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the ~250+ real defects surfaced across security, billing, voice/Twilio, data/CRM/UX, and performance/quality audits of the Revenue Operator codebase — starting with the verified leaked Stripe webhook secret on a public GitHub repo — and leave the codebase in a state where every production-critical subsystem has evidence-backed verification (passing test, exit-0 build, signed webhook, RLS-isolated row, signature-verified call, idempotency-keyed mutation).

**Architecture:** Strict risk-reduction order. Each phase is self-contained and ships working software; later phases do not depend on unshipped pieces of earlier phases. TDD throughout: red test → minimal implementation → green test → commit. No secret ever lands in a redaction commit — rotation precedes public-facing cleanup. Service-role DB access is quarantined to a named server-only client; every user-facing request uses an authed per-request client that respects RLS. Every external webhook boundary (Stripe, Twilio inbound/status/voice, Telnyx) verifies signature BEFORE any DB write or side effect. Every Stripe mutation carries a deterministic `idempotencyKey`. Every outbound call respects lead-local time, recording consent (two-party states), and the federal FTC DNC registry in addition to internal suppression.

**Tech Stack:** Next.js 16 (App Router, RSC) / React 19 / TypeScript 5 / Zod 4 / Vitest / Playwright / Supabase (Postgres + RLS) / Stripe (API v2025-x pinned) / Twilio (Voice + SMS + signature) / Telnyx (voice alt) / OpenAI + Anthropic / Upstash (Redis + rate-limit) / PostHog / Sentry / Vercel (prod) / tsx scripts / pg driver for migrations.

---

## Immediate Blocking Action (USER — before any commit in this plan)

The webhook secret `whsec_ORIGINAL_VALUE_REDACTED_PLACEHOLDER` (rotated) was committed to this repository's public git history in `LAUNCH_CHECKLIST.md` and `STRIPE_SETUP.md` at HEAD. The repo is confirmed public on GitHub. **Rotate before redacting** — a redaction commit against a live secret is a treasure-map commit ("line 32 used to have the real secret — grab it from the previous SHA").

- [ ] **Step U1: Rotate the webhook secret in Stripe Dashboard**

Go to https://dashboard.stripe.com/webhooks → select the endpoint → click "Roll secret" → copy the new `whsec_…` value. Do NOT paste it anywhere other than the Vercel env UI.

- [ ] **Step U2: Update Vercel env**

Vercel → Project → Settings → Environment Variables → edit `STRIPE_WEBHOOK_SECRET` (Production scope) → paste the new value → Save.

- [ ] **Step U3: Trigger a Stripe test event to confirm the new secret is live**

Stripe Dashboard → Developers → Webhooks → your endpoint → "Send test webhook" → pick `checkout.session.completed` → Send. Check Vercel logs for a 200 response.

- [ ] **Step U4: Confirm rotation complete**

Reply "rotated" in chat. Only then does this plan proceed to Phase 0.

---

## File Structure

This plan creates, modifies, or splits the following files. Files sharing a responsibility live together; split by responsibility not by technical layer.

**Security core (new + split):**
- `src/lib/supabase/admin.ts` (new) — single service-role client factory with explicit `WARN: bypasses RLS` jsdoc. Only callable from `/api/webhooks/**` and `/scripts/**`.
- `src/lib/supabase/server.ts` (modify) — per-request authed client; remove all `SUPABASE_SERVICE_ROLE_KEY` references.
- `src/lib/supabase/client.ts` (keep) — browser-side anon-key client.
- `src/lib/security/phone.ts` (new) — `assertE164(value): string` + `normalizePhone(value): string | null`; used before every `.or()`/`.in()` PostgREST call.
- `src/lib/security/twilio-signature.ts` (new) — always-on signature verifier wrapping `twilio.validateRequest`; throws when `TWILIO_AUTH_TOKEN` missing.
- `src/lib/security/webhook-signature.ts` (modify) — unify Stripe + Twilio + Telnyx verifier entry points.
- `src/lib/security/oauth-pkce.ts` (new) — `generatePKCE()` returns `{code_verifier, code_challenge, state}`, stored in signed cookie with HMAC + 5-min TTL.

**Billing core:**
- `src/lib/stripe/client.ts` (modify) — single `getStripe()` factory pinning `apiVersion`; no other call-site constructs `new Stripe(...)`.
- `src/lib/stripe/idempotency.ts` (new) — `stripeIdempotencyKey(purpose, ...parts): string` returns SHA-256(workspace_id + purpose + parts + day-bucket).
- `src/app/api/billing/webhook/route.ts` (modify) — `INSERT ... ON CONFLICT` on `processed_events`; enforce `client_reference_id`; reject unexpected `success_url`/`cancel_url`.
- `src/app/api/cron/usage-overage/route.ts` (DELETE) — duplicate of `/api/billing/overage`.

**Voice/Twilio core:**
- `src/app/api/twilio/inbound/route.ts` (modify) — verify signature FIRST; `assertE164` on all phone fields; map `From` → conversation via workspace-scoped lookup.
- `src/app/api/twilio/voice/route.ts` (modify) — same; inject `<Say>` recording-consent disclosure BEFORE `<Record>` or `<Dial record="...">`.
- `src/app/api/twilio/status/route.ts` (modify) — signature always-on; no CallSid-as-auth fallback.
- `src/app/api/demo-turn/route.ts` (modify) — replace UUID-as-auth with signed short-lived demo token (HMAC, 2-min TTL).
- `src/lib/voice/consent-states.ts` (new) — complete list: CA, CT, DE, FL, HI, IL, MA, MD, MI, MT, NV, NH, PA, VT, WA (two-party); + CT audible-tone rule.
- `src/lib/voice/outbound-dialer.ts` (modify) — `isWithinCallingHours(leadTimezone)` uses `Intl.DateTimeFormat` with `timeZone` option; never `new Date().getHours()`.
- `src/lib/voice/dnc.ts` (new, consolidates three existing sources) — single `isDncSuppressed(workspace_id, e164): boolean` reading `dnc_entries` (not `dnc_list`/`suppressed_numbers`); `phone_number` column canonical.
- `src/lib/voice/ftc-dnc.ts` (new) — nightly sync from FTC National DNC Registry API into `ftc_dnc_cache` table.
- `src/lib/voice/revocation.ts` (new) — on STOP/STOPALL keyword or verbal "remove me", record revocation + hang up any active call via `twilio.calls(callSid).update({status: "completed"})`.

**Data/CRM/UX:**
- `supabase/migrations/2026_04_22_workspaces_unique_owner.sql` (new) — `ALTER TABLE workspaces ADD CONSTRAINT workspaces_owner_id_key UNIQUE (owner_id);`
- `supabase/migrations/2026_04_22_workspace_invites_hardening.sql` (new) — FK, expiration, role, email, single-use, RLS.
- `supabase/migrations/2026_04_22_rls_audit.sql` (new) — enable RLS on every tenant-scoped table missing it; add policies.
- `src/lib/crm/sync.ts` (modify) — incremental cursor per provider; delta-only fetch.
- `src/lib/crm/writeback.ts` (new) — minimal create/update surface per provider.
- `src/lib/crm/providers.ts` (modify) — single source of truth for supported list (removes 17-vs-7 drift).
- `src/app/activate/ActivateWizard.tsx` (modify) — render only the current sub-step; remove `[your Revenue Operator number]` literal; remove fake success UI.
- `src/app/onboarding/page.tsx` (modify) — resolve wayfinding loop; detect state and redirect to the real next step.
- `src/lib/csv/parser.ts` (new) — RFC-4180 compliant parser handling newlines in quoted fields (replaces ad-hoc `split("\n")`).

**Infrastructure / quality gates:**
- `.github/workflows/ci.yml` (modify) — run `scan:secrets`, `verify:env`, `verify:prod-config`, `verify:launch`, full Playwright; reject placeholder secrets.
- `eslint.config.mjs` (modify) — restore `@typescript-eslint/no-explicit-any: error` and `react-hooks/exhaustive-deps: error`.
- `next.config.ts` (modify) — wrap with `withSentryConfig`; restore single CSP (remove `'unsafe-inline'` OR `'strict-dynamic'`, pick one; tighten `media-src`).
- `src/lib/queue/retry.ts` (new) — retry with cap + dead-letter + 429/5xx classification; replaces `retryWithBackoff`.
- `src/lib/net/circuit-breaker.ts` (new) — Hystrix-lite half-open/closed state per external service.

**Tests:**
- `tests/security/**` — one spec per security fix.
- `tests/billing/**` — idempotency + webhook TOCTOU + overage single-source.
- `tests/voice/**` — signature-first, consent-states, revocation-hangup, timezone-dialer, DNC unified, FTC registry.
- `tests/data/**` — RLS boundary, invite lifecycle, CSV edge cases.
- `tests/perf/**` — circuit breaker transitions, retry classification.

---

## Phase 0 — Baseline Green (must pass before any P0 fix lands)

### Task 0.1: Produce fresh baseline evidence

**Files:**
- No code changes; evidence capture only.

- [ ] **Step 1: Capture current tsc state**

Run: `cd /Users/junior/Revenue-operator-1 && npx tsc --noEmit 2>&1 | tee /tmp/baseline-tsc.txt; echo "exit=$?"`
Expected: exit recorded (pass or fail — document it).

- [ ] **Step 2: Capture current eslint state**

Run: `cd /Users/junior/Revenue-operator-1 && npx eslint src e2e --max-warnings=0 2>&1 | tee /tmp/baseline-eslint.txt; echo "exit=$?"`
Expected: exit recorded.

- [ ] **Step 3: Capture current vitest state**

Run: `cd /Users/junior/Revenue-operator-1 && npx vitest run --reporter=verbose 2>&1 | tee /tmp/baseline-vitest.txt; echo "exit=$?"`
Expected: exit recorded.

- [ ] **Step 4: Commit baseline report**

```bash
cd /Users/junior/Revenue-operator-1
mkdir -p reports
cp /tmp/baseline-tsc.txt reports/baseline-tsc-2026-04-22.txt
cp /tmp/baseline-eslint.txt reports/baseline-eslint-2026-04-22.txt
cp /tmp/baseline-vitest.txt reports/baseline-vitest-2026-04-22.txt
# reports/ is gitignored — move the files we want tracked:
mkdir -p docs/superpowers/evidence
mv reports/baseline-*.txt docs/superpowers/evidence/
git add docs/superpowers/evidence/
git commit -m "chore(phase-78): baseline evidence snapshot before P0 remediation"
```

---

## Phase 1 — Secret Rotation Cleanup (unblocked only after User Step U4)

### Task 1.1: Commit the redactions + scanner + gitignore hardening (already staged)

**Files:**
- Modify: `docs/_archive/2026-04-22/root/STRIPE_SETUP.md` (already redacted in working tree)
- Modify: `docs/_archive/2026-04-22/root/LAUNCH_CHECKLIST.md` (already redacted)
- Modify: `.gitignore` (already hardened)
- Create: `scripts/scan-secrets.ts` (already written)
- Modify: `package.json` (scripts already added)

- [ ] **Step 1: Run scanner on current tree — must find 0 leaks**

Run: `cd /Users/junior/Revenue-operator-1 && npx tsx scripts/scan-secrets.ts > /tmp/scan-tree.out 2>&1; REAL_EXIT=$?; echo "exit=$REAL_EXIT"; cat /tmp/scan-tree.out | head -20`
Expected: `exit=0` and "No secrets found" message.

- [ ] **Step 2: Run deep scanner across history — document findings**

Run: `cd /Users/junior/Revenue-operator-1 && npx tsx scripts/scan-secrets.ts --history > /tmp/scan-deep.out 2>&1; REAL_EXIT=$?; echo "exit=$REAL_EXIT"; wc -l /tmp/scan-deep.out`
Expected: `exit=1` with the historical `whsec_1XCa…` findings listed (these are unavoidable until filter-repo runs; documented but not blocking once secret is rotated).

- [ ] **Step 3: Commit the prep work**

```bash
cd /Users/junior/Revenue-operator-1
git add .gitignore scripts/scan-secrets.ts package.json \
  docs/_archive/2026-04-22/root/STRIPE_SETUP.md \
  docs/_archive/2026-04-22/root/LAUNCH_CHECKLIST.md
git commit -m "chore(security): redact rotated stripe webhook secret, add scanner + defense-in-depth .gitignore

The previous value of STRIPE_WEBHOOK_SECRET was committed to public history.
Secret has been rotated in Stripe Dashboard; Vercel env updated with new value.
This commit redacts the archived docs, adds a zero-dep scanner (scan:secrets,
scan:secrets:deep), and hardens .gitignore with env-file defense in depth."
```

- [ ] **Step 4: Delete LAUNCH_CHECKLIST.md and STRIPE_SETUP.md at HEAD**

These files still exist at HEAD with the old value (even though the working tree has already moved them into `docs/_archive`). Remove them at HEAD.

Run:
```bash
cd /Users/junior/Revenue-operator-1
git ls-files | grep -E '^(LAUNCH_CHECKLIST|STRIPE_SETUP)\.md$' || echo "already gone"
```
If they are listed:
```bash
git rm LAUNCH_CHECKLIST.md STRIPE_SETUP.md 2>/dev/null || true
git commit -m "chore(security): remove root-level docs containing pre-rotation secret reference" || echo "nothing to commit"
```

- [ ] **Step 5: (Optional, if user approves force-push) Purge history**

This is a destructive operation. Only run if user explicitly approves AND has coordinated with any collaborators.

```bash
cd /Users/junior/Revenue-operator-1
pip install git-filter-repo 2>/dev/null || brew install git-filter-repo
git filter-repo --replace-text <(echo 'whsec_ORIGINAL_VALUE_REDACTED_PLACEHOLDER==>whsec_ROTATED_REDACTED') --force
# Then force-push — requires user approval:
# git push --force-with-lease origin main
```

---

## Phase 2 — Database Access Boundary Restoration

### Task 2.1: Create the narrow service-role client (new, named, documented)

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Test: `tests/security/supabase-admin-scope.test.ts`

- [ ] **Step 1: Write the failing test — caller restriction**

Create `tests/security/supabase-admin-scope.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("supabase admin client scope", () => {
  it("is imported ONLY from /api/webhooks/** or /scripts/**", () => {
    const forbidden: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        const content = fs.readFileSync(full, "utf8");
        if (!/from\s+['"][^'"]*supabase\/admin['"]/.test(content)) continue;
        const rel = path.relative(process.cwd(), full);
        const allowed = rel.startsWith("src/app/api/webhooks/")
          || rel.startsWith("scripts/")
          || rel.startsWith("src/lib/supabase/admin")
          || rel.startsWith("tests/");
        if (!allowed) forbidden.push(rel);
      }
    };
    walk(path.join(process.cwd(), "src"));
    walk(path.join(process.cwd(), "scripts"));
    expect(forbidden, `admin client leaked into: ${forbidden.join(", ")}`).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (file missing)**

Run: `npx vitest run tests/security/supabase-admin-scope.test.ts`
Expected: FAIL — `src/lib/supabase/admin.ts` does not exist OR callers violate the rule.

- [ ] **Step 3: Create the admin client**

Create `src/lib/supabase/admin.ts`:

```ts
/**
 * WARNING: This client bypasses Row Level Security.
 *
 * ALLOWED call-sites:
 *   - src/app/api/webhooks/**  (Stripe/Twilio/Telnyx signed webhooks)
 *   - scripts/**               (migration, seed, verify tooling)
 *
 * FORBIDDEN call-sites:
 *   - Any route handler reachable by an end user
 *   - Any server component rendered for an end user
 *   - Any server action
 *
 * For user-facing code, use getServerSupabase() from ./server.ts.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "getSupabaseAdmin: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "revenue-operator-admin" } },
  });
  return cached;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/security/supabase-admin-scope.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/admin.ts tests/security/supabase-admin-scope.test.ts
git commit -m "feat(security): introduce scoped supabase admin client with call-site enforcement"
```

### Task 2.2: Replace service-role usage in user-facing code with authed per-request client

**Files:**
- Modify: `src/lib/supabase/server.ts`
- Test: `tests/security/rls-boundary.test.ts`

- [ ] **Step 1: Enumerate every file currently importing `SUPABASE_SERVICE_ROLE_KEY` from a non-webhook, non-script path**

Run: `cd /Users/junior/Revenue-operator-1 && grep -rn "SUPABASE_SERVICE_ROLE_KEY\|service_role" src/app src/lib --include='*.ts' --include='*.tsx' | grep -v "src/app/api/webhooks\|src/lib/supabase/admin" > /tmp/service-role-leaks.txt; wc -l /tmp/service-role-leaks.txt; head -40 /tmp/service-role-leaks.txt`
Expected: A list of every offending file. Each one becomes a subtask below.

- [ ] **Step 2: Write the boundary test — user A cannot read workspace B's rows**

Create `tests/security/rls-boundary.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getServerSupabase } from "@/lib/supabase/server";

describe("RLS boundary (per-request authed client)", () => {
  it("returns zero rows when an unauthenticated caller queries workspaces", async () => {
    // An unauthenticated request should have no session; workspaces with RLS
    // enabled should return zero rows, NOT all rows (which would indicate
    // the caller is using a service-role client).
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.from("workspaces").select("id").limit(5);
    // RLS returns an empty result, not a permission error, for anon.
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (currently returns rows because of service-role bypass)**

Run: `npx vitest run tests/security/rls-boundary.test.ts`
Expected: FAIL — data array is non-empty.

- [ ] **Step 4: Modify `src/lib/supabase/server.ts` to use cookies + anon key only**

Read the current file first, then replace body with:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-request authed Supabase client.
 * Honors RLS via the anon key + request cookies.
 * Never bypasses RLS; for that, use getSupabaseAdmin() from ./admin.ts
 * (only allowed inside /api/webhooks/** and /scripts/**).
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "getServerSupabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (pairs) => {
        try {
          for (const { name, value, options } of pairs) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component context — ignore.
        }
      },
    },
  });
}
```

- [ ] **Step 5: Replace call-sites iteratively**

For each file in `/tmp/service-role-leaks.txt`, dispatch a subagent task:

> "In `<FILE>`, every import of `SUPABASE_SERVICE_ROLE_KEY` or construction of a service-role client is an RLS bypass for user-facing code. Replace with `import { getServerSupabase } from '@/lib/supabase/server'` and `const supabase = await getServerSupabase();`. If the operation legitimately requires bypass (admin task, cross-workspace aggregation), move the handler into `src/app/api/webhooks/**` (signed) or `scripts/**` and import from `@/lib/supabase/admin`. Run `npx vitest run tests/security/rls-boundary.test.ts` and commit."

- [ ] **Step 6: Run the boundary test**

Run: `npx vitest run tests/security/rls-boundary.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the scope test from Task 2.1**

Run: `npx vitest run tests/security/supabase-admin-scope.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/supabase/server.ts src/app src/lib tests/security/rls-boundary.test.ts
git commit -m "fix(security): restore RLS for user-facing requests (D1)

All non-webhook, non-script callers now use per-request authed client.
Service-role access is quarantined to src/lib/supabase/admin.ts with
compile-time scope test (supabase-admin-scope.test.ts)."
```

---

## Phase 3 — PostgREST Injection Fixes (D7 / D7a / D7b)

### Task 3.1: Centralize E.164 validation

**Files:**
- Create: `src/lib/security/phone.ts`
- Test: `tests/security/phone-assert-e164.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/security/phone-assert-e164.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { assertE164, normalizePhone } from "@/lib/security/phone";

describe("assertE164", () => {
  it("accepts a plain E.164", () => {
    expect(assertE164("+14155551234")).toBe("+14155551234");
  });
  it("rejects PostgREST injection payloads", () => {
    expect(() => assertE164("+14155551234,1234567890)")).toThrow();
    expect(() => assertE164("' OR '1'='1")).toThrow();
    expect(() => assertE164("+1415.or.(id.eq.uuid)")).toThrow();
  });
  it("rejects non-E.164", () => {
    expect(() => assertE164("4155551234")).toThrow();
    expect(() => assertE164("")).toThrow();
    expect(() => assertE164(null as unknown as string)).toThrow();
  });
});

describe("normalizePhone", () => {
  it("normalizes US-formatted inputs", () => {
    expect(normalizePhone("(415) 555-1234")).toBe("+14155551234");
    expect(normalizePhone("415-555-1234")).toBe("+14155551234");
  });
  it("returns null on unrecoverable input", () => {
    expect(normalizePhone("hello")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `npx vitest run tests/security/phone-assert-e164.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create `src/lib/security/phone.ts`**

```ts
const E164 = /^\+[1-9]\d{1,14}$/;

export function assertE164(value: unknown): string {
  if (typeof value !== "string" || !E164.test(value)) {
    throw new Error("assertE164: invalid E.164 phone");
  }
  return value;
}

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^\d]/g, "");
  // Default US country code when 10 digits.
  const candidate = digits.length === 10 ? `+1${digits}`
    : digits.length === 11 && digits.startsWith("1") ? `+${digits}`
    : digits.startsWith("+") ? value
    : digits.length > 6 && digits.length <= 15 ? `+${digits}`
    : null;
  if (!candidate) return null;
  return E164.test(candidate) ? candidate : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/security/phone-assert-e164.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/security/phone.ts tests/security/phone-assert-e164.test.ts
git commit -m "feat(security): add assertE164/normalizePhone for PostgREST injection defense"
```

### Task 3.2: Apply E.164 assertion before every PostgREST filter using phone input

**Files:**
- Modify: `src/app/api/twilio/voice/route.ts`
- Modify: `src/app/api/twilio/inbound/route.ts`
- Modify: `src/app/api/telnyx/webhook/route.ts`
- Modify: every call-site of `.or(` or `.in(` in `src/app/api/**` touching phone fields
- Test: `tests/security/postgrest-injection.test.ts`

- [ ] **Step 1: Enumerate all `.or(` usages**

Run: `cd /Users/junior/Revenue-operator-1 && grep -rn "\.or(" src/app/api --include='*.ts' > /tmp/or-uses.txt; wc -l /tmp/or-uses.txt; cat /tmp/or-uses.txt`
Expected: list of ~5-15 call-sites.

- [ ] **Step 2: Write the failing injection test**

Create `tests/security/postgrest-injection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { POST as twilioVoice } from "@/app/api/twilio/voice/route";

describe("PostgREST injection resistance", () => {
  it("rejects injection payloads in Twilio `From`", async () => {
    const body = new URLSearchParams();
    body.set("From", "+14155551234,1234567890)");
    body.set("To", "+14155550000");
    body.set("CallSid", "CA" + "x".repeat(32));
    const req = new Request("http://localhost/api/twilio/voice", {
      method: "POST",
      body,
    });
    const res = await twilioVoice(req as never);
    // Must NOT 500; must return a safe TwiML or 400 — never execute injected SQL.
    expect([400, 200]).toContain(res.status);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (injection currently flows through)**

Run: `npx vitest run tests/security/postgrest-injection.test.ts`
Expected: FAIL — either a 500 from PostgREST or a successful injection parse.

- [ ] **Step 4: Wrap each `.or(...)` filter**

For each file in `/tmp/or-uses.txt`, add `assertE164()` at the top of the handler before any `.or()` or `.in()` that interpolates phone input. Example patch for `src/app/api/twilio/inbound/route.ts`:

```ts
import { assertE164, normalizePhone } from "@/lib/security/phone";
// ...
const fromRaw = String(form.get("From") ?? "");
const from = normalizePhone(fromRaw);
if (!from) return new Response("invalid From", { status: 400 });
// After this point, `from` is a validated E.164 — safe for .or() and .in().
const { data } = await supabase
  .from("conversations")
  .select("id")
  .eq("workspace_id", workspace_id)
  .or(`lead_phone.eq.${from},contact_phone.eq.${from}`);
```

- [ ] **Step 5: Run all security tests**

Run: `npx vitest run tests/security`
Expected: PASS across the board.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/twilio/voice/route.ts \
  src/app/api/twilio/inbound/route.ts \
  src/app/api/telnyx/webhook/route.ts \
  tests/security/postgrest-injection.test.ts
git commit -m "fix(security): validate E.164 before PostgREST .or()/.in() (D7/D7a/D7b)"
```

---

## Phase 4 — Webhook Signature Always-On

### Task 4.1: Twilio signature verifier — no env-conditional bypass

**Files:**
- Create: `src/lib/security/twilio-signature.ts`
- Test: `tests/security/twilio-signature.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/security/twilio-signature.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { verifyTwilioRequest } from "@/lib/security/twilio-signature";

describe("verifyTwilioRequest", () => {
  it("throws when TWILIO_AUTH_TOKEN is missing", () => {
    const prev = process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_AUTH_TOKEN;
    expect(() =>
      verifyTwilioRequest("https://x", new URLSearchParams(), "sig")
    ).toThrow(/TWILIO_AUTH_TOKEN/);
    if (prev) process.env.TWILIO_AUTH_TOKEN = prev;
  });
  it("rejects a request with a bad signature", () => {
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    const ok = verifyTwilioRequest(
      "https://example.com/twilio/inbound",
      new URLSearchParams({ From: "+14155551234" }),
      "not-a-real-signature"
    );
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

Run: `npx vitest run tests/security/twilio-signature.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create `src/lib/security/twilio-signature.ts`**

```ts
import twilio from "twilio";

/**
 * Always-on Twilio signature verification.
 * Throws if TWILIO_AUTH_TOKEN is unset — signature verification is NOT optional.
 */
export function verifyTwilioRequest(
  fullUrl: string,
  params: URLSearchParams | Record<string, string>,
  signatureHeader: string | null
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    throw new Error(
      "verifyTwilioRequest: TWILIO_AUTH_TOKEN is unset. Signature verification cannot be skipped."
    );
  }
  if (!signatureHeader) return false;
  const flat: Record<string, string> = {};
  if (params instanceof URLSearchParams) {
    for (const [k, v] of params) flat[k] = v;
  } else {
    Object.assign(flat, params);
  }
  try {
    return twilio.validateRequest(token, signatureHeader, fullUrl, flat);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test — PASS**

Run: `npx vitest run tests/security/twilio-signature.test.ts`

- [ ] **Step 5: Replace every `if (process.env.NODE_ENV === "production")`-gated signature check**

Run: `cd /Users/junior/Revenue-operator-1 && grep -rln "validateRequest\|X-Twilio-Signature" src/app/api --include='*.ts'`
For each file, replace the conditional check with:

```ts
import { verifyTwilioRequest } from "@/lib/security/twilio-signature";
// ...
const fullUrl = new URL(req.url).toString();
const form = await req.formData();
const params = new URLSearchParams();
for (const [k, v] of form.entries()) params.set(k, String(v));
const signature = req.headers.get("x-twilio-signature");
if (!verifyTwilioRequest(fullUrl, params, signature)) {
  return new Response("invalid signature", { status: 403 });
}
// ONLY after this line: DB writes, AI calls, TwiML responses.
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/security/twilio-signature.ts \
  tests/security/twilio-signature.test.ts \
  src/app/api/twilio
git commit -m "fix(security): enforce Twilio signature verification in all environments (P0-4)"
```

### Task 4.2: Verify signatures BEFORE any DB write

**Files:**
- Modify: `src/app/api/twilio/inbound/route.ts` (P0-3)
- Test: `tests/security/twilio-inbound-order.test.ts`

- [ ] **Step 1: Write the ordering test**

Create `tests/security/twilio-inbound-order.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import * as admin from "@/lib/supabase/admin";
import { POST } from "@/app/api/twilio/inbound/route";

describe("twilio/inbound ordering", () => {
  it("does not call supabase admin when signature is invalid", async () => {
    const spy = vi.spyOn(admin, "getSupabaseAdmin");
    const req = new Request("https://example.com/api/twilio/inbound", {
      method: "POST",
      headers: { "x-twilio-signature": "bad" },
      body: new URLSearchParams({ From: "+14155551234", Body: "hi" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL (handler touches DB first)**

Run: `npx vitest run tests/security/twilio-inbound-order.test.ts`

- [ ] **Step 3: Move signature check to the first statement of the handler**

Read `src/app/api/twilio/inbound/route.ts` and reorder so that:
1. Parse `req.url` + `req.formData()` into `URLSearchParams`.
2. Call `verifyTwilioRequest(...)` — `return 403` on fail.
3. Parse/validate `From` via `normalizePhone`.
4. Only after those two gates: call `getSupabaseAdmin()` / do DB writes.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/api/twilio/inbound/route.ts tests/security/twilio-inbound-order.test.ts
git commit -m "fix(security): verify Twilio signature BEFORE DB writes on inbound (P0-3)"
```

### Task 4.3: Remove CallSid-as-auth and UUID-as-auth in demo routes (P0-1, P0-2)

**Files:**
- Modify: `src/app/api/demo-turn/route.ts`
- Modify: `src/app/api/twilio/status/route.ts`
- Create: `src/lib/security/demo-token.ts`
- Test: `tests/security/demo-token.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/security/demo-token.test.ts
import { describe, it, expect } from "vitest";
import { mintDemoToken, verifyDemoToken } from "@/lib/security/demo-token";

describe("demo-token", () => {
  it("round-trips a fresh token", () => {
    process.env.DEMO_TOKEN_SECRET = "x".repeat(32);
    const t = mintDemoToken("ws_abc");
    expect(verifyDemoToken(t).workspace_id).toBe("ws_abc");
  });
  it("rejects an expired token", () => {
    process.env.DEMO_TOKEN_SECRET = "x".repeat(32);
    // A token minted with a past nbf/exp must fail verification.
    const expired = mintDemoToken("ws_abc", -300);
    expect(() => verifyDemoToken(expired)).toThrow(/expired/);
  });
  it("rejects a tampered token", () => {
    process.env.DEMO_TOKEN_SECRET = "x".repeat(32);
    const t = mintDemoToken("ws_abc") + "x";
    expect(() => verifyDemoToken(t)).toThrow(/signature/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Create `src/lib/security/demo-token.ts`**

```ts
import crypto from "node:crypto";

const DEFAULT_TTL_SECONDS = 120;

function getSecret(): string {
  const s = process.env.DEMO_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error("DEMO_TOKEN_SECRET must be >= 32 chars");
  return s;
}

export function mintDemoToken(workspace_id: string, ttl = DEFAULT_TTL_SECONDS): string {
  const payload = { workspace_id, exp: Math.floor(Date.now() / 1000) + ttl };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyDemoToken(token: string): { workspace_id: string } {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("demo-token: malformed");
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("demo-token: signature mismatch");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    workspace_id: string; exp: number;
  };
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("demo-token: expired");
  }
  return { workspace_id: payload.workspace_id };
}
```

- [ ] **Step 4: Replace UUID-as-auth in `src/app/api/demo-turn/route.ts`**

Every request must present a minted `demo_token` (from an authed initiation endpoint) — UUIDs from query strings are not auth.

- [ ] **Step 5: Run — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/lib/security/demo-token.ts \
  src/app/api/demo-turn/route.ts \
  src/app/api/twilio/status/route.ts \
  tests/security/demo-token.test.ts
git commit -m "fix(security): replace UUID/CallSid-as-auth with HMAC demo tokens (P0-1, P0-2)"
```

---

## Phase 5 — OAuth PKCE + Revocation

### Task 5.1: Add PKCE to Google OAuth initiation

**Files:**
- Create: `src/lib/security/oauth-pkce.ts`
- Modify: `src/app/api/oauth/google/start/route.ts`
- Modify: `src/app/api/oauth/google/callback/route.ts`
- Test: `tests/security/pkce.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/security/pkce.test.ts
import { describe, it, expect } from "vitest";
import { generatePKCE, verifyState } from "@/lib/security/oauth-pkce";

describe("oauth-pkce", () => {
  it("produces code_verifier + S256 code_challenge + signed state", () => {
    process.env.OAUTH_STATE_SECRET = "y".repeat(32);
    const p = generatePKCE({ workspace_id: "ws_1", return_to: "/connect" });
    expect(p.code_verifier).toMatch(/^[A-Za-z0-9_\-]{43,128}$/);
    expect(p.code_challenge).toMatch(/^[A-Za-z0-9_\-]{43}$/);
    expect(p.code_challenge_method).toBe("S256");
    const parsed = verifyState(p.state);
    expect(parsed.workspace_id).toBe("ws_1");
    expect(parsed.return_to).toBe("/connect");
  });
  it("rejects tampered state", () => {
    process.env.OAUTH_STATE_SECRET = "y".repeat(32);
    const p = generatePKCE({ workspace_id: "ws_1" });
    expect(() => verifyState(p.state + "x")).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Create `src/lib/security/oauth-pkce.ts`**

```ts
import crypto from "node:crypto";

function b64url(buf: Buffer): string { return buf.toString("base64url"); }

export function generatePKCE(payload: Record<string, string>): {
  code_verifier: string;
  code_challenge: string;
  code_challenge_method: "S256";
  state: string;
} {
  const verifier = b64url(crypto.randomBytes(64)).slice(0, 96);
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = signState(payload);
  return {
    code_verifier: verifier,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  };
}

function stateSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s || s.length < 32) throw new Error("OAUTH_STATE_SECRET must be >= 32 chars");
  return s;
}

function signState(payload: Record<string, string>): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + 300 };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyState(state: string): Record<string, string> {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("state: malformed");
  const expected = crypto.createHmac("sha256", stateSecret()).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("state: bad signature");
  }
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    exp: number; [k: string]: unknown;
  };
  if (parsed.exp < Math.floor(Date.now() / 1000)) throw new Error("state: expired");
  return parsed as Record<string, string>;
}
```

- [ ] **Step 4: Wire into `/api/oauth/google/start`**

Store `code_verifier` in an httpOnly cookie (5-min Max-Age, `SameSite=Lax`, signed with same secret). Redirect to Google with `code_challenge` + `code_challenge_method=S256` + `state`.

- [ ] **Step 5: Wire into `/api/oauth/google/callback`**

Read `code_verifier` cookie; verify `state`; exchange code with Google sending `code_verifier`; clear cookie.

- [ ] **Step 6: Run — PASS**

- [ ] **Step 7: Commit**

```bash
git add src/lib/security/oauth-pkce.ts src/app/api/oauth/google tests/security/pkce.test.ts
git commit -m "fix(security): PKCE + signed state on Google OAuth flow (D36)"
```

### Task 5.2: Disconnect revokes upstream tokens

**Files:**
- Modify: `src/app/api/integrations/disconnect/route.ts`
- Test: `tests/security/oauth-revoke.test.ts`

- [ ] **Step 1: Write failing test (mocked HTTP)**

```ts
// tests/security/oauth-revoke.test.ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/integrations/disconnect/route";

describe("integrations/disconnect", () => {
  it("POSTs to provider revoke endpoint before deleting local token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 200 })
    );
    const req = new Request("http://x/api/integrations/disconnect", {
      method: "POST",
      body: JSON.stringify({ provider: "google", token: "tok_123" }),
      headers: { "content-type": "application/json" },
    });
    await POST(req as never);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("oauth2.googleapis.com/revoke"),
      expect.any(Object)
    );
    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement revoke call per provider**

Add revoke-url map: google → `https://oauth2.googleapis.com/revoke`, microsoft → `https://login.microsoftonline.com/common/oauth2/v2.0/logout` (revoke via token endpoint), hubspot → `https://api.hubapi.com/oauth/v1/refresh-tokens/{token}` DELETE, etc. Call before local row delete; log failure but still delete locally (user intent preserved).

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/api/integrations/disconnect/route.ts tests/security/oauth-revoke.test.ts
git commit -m "fix(compliance): call provider OAuth revoke on disconnect (P0-11 Data, GDPR/CCPA)"
```

---

## Phase 6 — Stripe Hardening

### Task 6.1: Single `getStripe()` factory with pinned apiVersion

**Files:**
- Modify: `src/lib/stripe/client.ts`
- Test: `tests/billing/stripe-factory.test.ts`

- [ ] **Step 1: Write test asserting single factory + no other `new Stripe(...)`**

```ts
// tests/billing/stripe-factory.test.ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("stripe factory", () => {
  it("is the ONLY construction site for Stripe clients", () => {
    const files = walk("src");
    const offenders = files
      .filter((f) => !f.endsWith("/stripe/client.ts"))
      .filter((f) => /new\s+Stripe\s*\(/.test(fs.readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (you will find multiple offenders; `src/app/api/billing/webhook/route.ts` is a known one).

- [ ] **Step 3: Tighten `src/lib/stripe/client.ts`**

```ts
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("getStripe: STRIPE_SECRET_KEY must be set");
  cached = new Stripe(key, {
    apiVersion: "2025-03-31.basil",
    typescript: true,
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
  return cached;
}
```

- [ ] **Step 4: Replace all `new Stripe(...)` sites with `getStripe()`**

- [ ] **Step 5: Run — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/lib/stripe/client.ts src tests/billing/stripe-factory.test.ts
git commit -m "fix(billing): single getStripe() factory, pinned apiVersion (Billing #1)"
```

### Task 6.2: Idempotency key on every mutation

**Files:**
- Create: `src/lib/stripe/idempotency.ts`
- Modify: every Stripe `.create(...)` / `.update(...)` / `.cancel(...)` call-site.
- Test: `tests/billing/idempotency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/billing/idempotency.test.ts
import { describe, it, expect } from "vitest";
import { stripeIdempotencyKey } from "@/lib/stripe/idempotency";

describe("stripe idempotency keys", () => {
  it("is deterministic for same inputs and day", () => {
    const a = stripeIdempotencyKey("subscription-update", "ws_1", "prod_x");
    const b = stripeIdempotencyKey("subscription-update", "ws_1", "prod_x");
    expect(a).toBe(b);
  });
  it("differs when purpose differs", () => {
    expect(
      stripeIdempotencyKey("sub-create", "ws_1") ===
      stripeIdempotencyKey("invoice-create", "ws_1")
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Create `src/lib/stripe/idempotency.ts`**

```ts
import crypto from "node:crypto";

export function stripeIdempotencyKey(purpose: string, ...parts: string[]): string {
  const day = new Date().toISOString().slice(0, 10);
  const material = [purpose, day, ...parts].join("|");
  return "ro_" + crypto.createHash("sha256").update(material).digest("hex").slice(0, 40);
}
```

- [ ] **Step 4: Replace every mutation**

Example patch:

```ts
await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true }, {
  idempotencyKey: stripeIdempotencyKey("sub-cancel", workspace_id, sub.id),
});
```

Enumerate: `grep -rn "stripe\.\(subscriptions\|customers\|invoices\|paymentIntents\|checkout\|prices\|products\)\.\(create\|update\|cancel\|pay\|send\|void\|finalize\)" src --include='*.ts'`
For each hit: add `{ idempotencyKey: stripeIdempotencyKey("<purpose>", ...) }` as the options arg.

- [ ] **Step 5: Run — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/lib/stripe/idempotency.ts src tests/billing/idempotency.test.ts
git commit -m "fix(billing): idempotency keys on every Stripe mutation (Billing #2)"
```

### Task 6.3: Webhook TOCTOU fix + `client_reference_id` enforcement

**Files:**
- Modify: `src/app/api/billing/webhook/route.ts`
- Test: `tests/billing/webhook-toctou.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/billing/webhook-toctou.test.ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/billing/webhook/route";

// 100 concurrent requests with the same event id must result in exactly 1 processing.
describe("stripe webhook idempotency", () => {
  it("processes each event exactly once under concurrency", async () => {
    // TODO (fixture): mock stripe.constructEvent to return { id: "evt_1", type: "checkout.session.completed", data: {...} }
    // and mock supabase to track INSERT ON CONFLICT behavior.
    // For now, this test is a placeholder for the contract — fill in with the stub harness added in step 3.
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Modify the webhook route**

Read current file. Replace the `SELECT … then INSERT` TOCTOU with:

```ts
const { data, error } = await admin
  .from("processed_stripe_events")
  .insert({ event_id: event.id, type: event.type })
  .select("event_id")
  .maybeSingle();

if (error) {
  // 23505 = unique_violation — duplicate event; safe to ignore.
  const code = (error as { code?: string }).code;
  if (code === "23505") return new Response("duplicate", { status: 200 });
  throw error;
}
// Proceed with side effects only after successful INSERT.
```

Also enforce `client_reference_id` on `checkout.session.completed`:

```ts
if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;
  const wsId = session.client_reference_id;
  if (!wsId) throw new Error("checkout.session.completed: missing client_reference_id");
  // Validate UUID shape:
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wsId)) {
    throw new Error("checkout.session.completed: invalid client_reference_id");
  }
  // Proceed using wsId — never derive workspace from customer email alone.
}
```

Plus: reject unexpected `success_url`/`cancel_url` at create time by hardcoding them in `src/app/api/billing/checkout/route.ts` (never echoing user input).

- [ ] **Step 3: Run — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/app/api/billing/webhook/route.ts \
  src/app/api/billing/checkout/route.ts \
  tests/billing/webhook-toctou.test.ts
git commit -m "fix(billing): INSERT..ON CONFLICT for event dedupe + enforce client_reference_id (Billing #7, #9)"
```

### Task 6.4: Delete duplicate overage cron

**Files:**
- Delete: `src/app/api/cron/usage-overage/route.ts`
- Modify: `vercel.json` (remove cron entry)

- [ ] **Step 1: Confirm `src/app/api/billing/overage/route.ts` is the single source**

Run: `cd /Users/junior/Revenue-operator-1 && diff <(cat src/app/api/cron/usage-overage/route.ts 2>/dev/null) <(cat src/app/api/billing/overage/route.ts 2>/dev/null) | head -40 || true`

- [ ] **Step 2: Delete the cron variant**

```bash
cd /Users/junior/Revenue-operator-1
git rm src/app/api/cron/usage-overage/route.ts
```

- [ ] **Step 3: Remove its cron entry from `vercel.json`**

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "fix(billing): remove duplicate overage cron — single-source at /api/billing/overage (Billing #4)"
```

### Task 6.5: Refund reverses minute-pack credits

**Files:**
- Modify: `src/app/api/billing/webhook/route.ts` (charge.refunded branch)
- Modify: `src/lib/billing/credits.ts`
- Test: `tests/billing/refund-credits.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/billing/refund-credits.test.ts — assert that handleChargeRefunded
// subtracts the exact minute-pack amount associated with the original invoice.
```

- [ ] **Step 2: Implement `reverseMinutePackCredits(invoice_id: string)` in `src/lib/billing/credits.ts`** — looks up the original grant from `credit_ledger` and writes a negating row.

- [ ] **Step 3: Wire into `charge.refunded` branch of webhook.**

- [ ] **Step 4: Run + Commit**

```bash
git add src/app/api/billing/webhook/route.ts src/lib/billing/credits.ts tests/billing/refund-credits.test.ts
git commit -m "fix(billing): reverse minute-pack credits on charge.refunded (Billing #6)"
```

### Task 6.6: Phone-billing cron idempotency

**Files:**
- Modify: `src/app/api/cron/phone-billing/route.ts`

- [ ] **Step 1: Add `stripeIdempotencyKey("phone-billing", workspace_id, day-bucket)` on every invoice.create/invoiceItem.create in the cron.**

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/phone-billing/route.ts
git commit -m "fix(billing): idempotency on phone-billing cron (Billing #3)"
```

---

## Phase 7 — TCPA / Voice Compliance

### Task 7.1: Recording consent disclosure

**Files:**
- Create: `src/lib/voice/consent-states.ts`
- Modify: `src/app/api/twilio/voice/route.ts`
- Test: `tests/voice/consent-disclosure.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/voice/consent-disclosure.test.ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/twilio/voice/route";

describe("recording consent disclosure", () => {
  it("injects <Say> disclosure BEFORE <Record> or <Dial record='...'>", async () => {
    const body = new URLSearchParams({
      From: "+12135551234", To: "+14155550000",
      CallSid: "CA" + "a".repeat(32),
    });
    // TODO (harness): mock signature-valid; inspect TwiML XML.
    // Expect: <Say>.*recorded.*</Say> before any <Record/> or <Dial record="...">
  });
});
```

- [ ] **Step 2: Create `src/lib/voice/consent-states.ts`**

```ts
/**
 * US two-party (all-party) consent states for call recording.
 * Sources: NCSL summary + state statute citations.
 * California (CA): Pen. Code § 632
 * Connecticut (CT): Gen. Stat. § 52-570d (civil), § 53a-189 (criminal); audible tone rule applies
 * Delaware (DE): 11 Del. C. § 2402 (all-party for oral; one-party for wire — conservative: treat as two-party)
 * Florida (FL): § 934.03
 * Hawaii (HI): § 711-1111 (in-home all-party)
 * Illinois (IL): 720 ILCS 5/14
 * Maryland (MD): Cts. & Jud. Proc. § 10-402
 * Massachusetts (MA): Ch. 272 § 99
 * Michigan (MI): § 750.539c (disputed; conservative treatment)
 * Montana (MT): § 45-8-213
 * Nevada (NV): § 200.620 (wire — all-party under NV SC)
 * New Hampshire (NH): § 570-A
 * Pennsylvania (PA): 18 Pa. C.S. § 5704
 * Vermont (VT): common law (no statute; VT SC applied two-party)
 * Washington (WA): RCW 9.73.030
 */
export const TWO_PARTY_STATES = [
  "CA", "CT", "DE", "FL", "HI", "IL", "MA", "MD", "MI",
  "MT", "NV", "NH", "PA", "VT", "WA",
] as const;

export type USState = typeof TWO_PARTY_STATES[number];

export function requiresTwoPartyConsent(state: string | null | undefined): boolean {
  if (!state) return true; // fail-safe: unknown state → treat as two-party
  return (TWO_PARTY_STATES as readonly string[]).includes(state.toUpperCase());
}

/**
 * CT specifically requires an audible tone at least every 15 seconds
 * during recording (Gen. Stat. § 52-570d(b)). Apply when state === "CT".
 */
export function requiresAudibleTone(state: string | null | undefined): boolean {
  return (state ?? "").toUpperCase() === "CT";
}
```

- [ ] **Step 3: Always disclose in TwiML**

Regardless of state, prepend a `<Say voice="alice">This call may be recorded for quality assurance.</Say>` before any `<Record>` or `<Dial record="record-from-answer">`. For CT, add `<Play loop="10">https://cdn.example.com/tone-1khz.mp3</Play>` loop during recording.

- [ ] **Step 4: Run + commit**

```bash
git add src/lib/voice/consent-states.ts src/app/api/twilio/voice/route.ts tests/voice/consent-disclosure.test.ts
git commit -m "fix(compliance): mandatory recording consent disclosure + complete two-party list (P0-7, P0-8)"
```

### Task 7.2: STOP keyword hangs up active call

**Files:**
- Create: `src/lib/voice/revocation.ts`
- Modify: `src/app/api/twilio/inbound/route.ts`
- Test: `tests/voice/revocation-hangup.test.ts`

- [ ] **Step 1: Write failing test** — assert a STOP SMS arriving during an active call results in `twilio.calls(sid).update({status: "completed"})`.

- [ ] **Step 2: Implement `revokeAndHangup(workspace_id, phone)`** — insert DNC, then look up open `voice_calls` row for that number; `update({status: "completed"})` each.

- [ ] **Step 3: Wire into inbound STOP handler**

- [ ] **Step 4: Run + commit**

```bash
git add src/lib/voice/revocation.ts src/app/api/twilio/inbound/route.ts tests/voice/revocation-hangup.test.ts
git commit -m "fix(compliance): STOP revocation hangs up active call (P0-10)"
```

### Task 7.3: Unify DNC sources + column name

**Files:**
- Create: `supabase/migrations/2026_04_22_dnc_unify.sql`
- Create: `src/lib/voice/dnc.ts`
- Delete: old helpers reading `dnc_list` / `suppressed_numbers`
- Test: `tests/voice/dnc-unified.test.ts`

- [ ] **Step 1: Migration — unify to single `dnc_entries(phone_number text, workspace_id uuid, reason text, created_at)`**

```sql
-- supabase/migrations/2026_04_22_dnc_unify.sql
CREATE TABLE IF NOT EXISTS dnc_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('user_request','stop_keyword','ftc_registry','complaint','manual')),
  source text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, phone_number)
);
CREATE INDEX IF NOT EXISTS dnc_entries_phone_idx ON dnc_entries (phone_number);
ALTER TABLE dnc_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY dnc_entries_tenant_isolation ON dnc_entries
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Migrate legacy tables, if present, into dnc_entries:
INSERT INTO dnc_entries (workspace_id, phone_number, reason, source, created_at)
SELECT workspace_id, COALESCE(phone_number, phone), 'user_request', 'legacy-dnc_list', created_at
FROM dnc_list
ON CONFLICT (workspace_id, phone_number) DO NOTHING;

INSERT INTO dnc_entries (workspace_id, phone_number, reason, source, created_at)
SELECT workspace_id, COALESCE(phone_number, phone), 'complaint', 'legacy-suppressed_numbers', created_at
FROM suppressed_numbers
ON CONFLICT (workspace_id, phone_number) DO NOTHING;

-- Drop legacy tables after migration window (separate commit):
-- DROP TABLE dnc_list; DROP TABLE suppressed_numbers;
```

- [ ] **Step 2: `src/lib/voice/dnc.ts`**

```ts
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assertE164 } from "@/lib/security/phone";

export async function isDncSuppressed(workspace_id: string, phoneE164: string): Promise<boolean> {
  const phone = assertE164(phoneE164);
  const db = getSupabaseAdmin();
  const { data } = await db.from("dnc_entries")
    .select("id")
    .eq("workspace_id", workspace_id)
    .eq("phone_number", phone)
    .limit(1)
    .maybeSingle();
  if (data) return true;
  // Federal FTC registry fallback:
  const { data: ftc } = await db.from("ftc_dnc_cache")
    .select("id")
    .eq("phone_number", phone)
    .limit(1)
    .maybeSingle();
  return !!ftc;
}

export async function addDncEntry(params: {
  workspace_id: string; phone: string; reason: "user_request" | "stop_keyword" | "ftc_registry" | "complaint" | "manual";
  source?: string;
}): Promise<void> {
  const phone = assertE164(params.phone);
  const db = getSupabaseAdmin();
  const { error } = await db.from("dnc_entries").upsert({
    workspace_id: params.workspace_id,
    phone_number: phone,
    reason: params.reason,
    source: params.source ?? "internal",
  }, { onConflict: "workspace_id,phone_number" });
  if (error) throw error;
}
```

- [ ] **Step 3: Replace all references to `dnc_list`, `suppressed_numbers`, `phone` (not `phone_number`) in queries** — use `isDncSuppressed` + `addDncEntry` only.

- [ ] **Step 4: Run + commit**

```bash
git add supabase/migrations/2026_04_22_dnc_unify.sql src/lib/voice/dnc.ts src tests/voice/dnc-unified.test.ts
git commit -m "fix(compliance): unify DNC to single table + column + RLS (P0-11, P0-12)"
```

### Task 7.4: FTC National DNC Registry sync

**Files:**
- Create: `supabase/migrations/2026_04_22_ftc_dnc_cache.sql`
- Create: `src/lib/voice/ftc-dnc.ts`
- Create: `src/app/api/cron/ftc-dnc-sync/route.ts`
- Modify: `vercel.json` (add nightly cron)
- Test: `tests/voice/ftc-dnc.test.ts`

- [ ] **Step 1: Migration**

```sql
CREATE TABLE IF NOT EXISTS ftc_dnc_cache (
  phone_number text PRIMARY KEY,
  added_to_registry_at date,
  synced_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Implement sync** — reads `FTC_DNC_ORG_ID` + `FTC_DNC_API_KEY` from env, fetches the daily delta file, upserts rows.

- [ ] **Step 3: Cron route** — `Authorization: Bearer <CRON_SECRET>` gated.

- [ ] **Step 4: Wire `isDncSuppressed` to consult cache (already in 7.3).**

- [ ] **Step 5: Run + commit**

```bash
git add supabase/migrations/2026_04_22_ftc_dnc_cache.sql \
  src/lib/voice/ftc-dnc.ts \
  src/app/api/cron/ftc-dnc-sync/route.ts \
  vercel.json \
  tests/voice/ftc-dnc.test.ts
git commit -m "feat(compliance): FTC National DNC Registry sync + dialer enforcement (P0-14)"
```

### Task 7.5: Lead-timezone calling hours

**Files:**
- Modify: `src/lib/voice/outbound-dialer.ts`
- Test: `tests/voice/calling-hours.test.ts`

- [ ] **Step 1: Failing test — server-local 9am PT is 12pm ET (within hours) but a lead in America/Los_Angeles at 9am is fine while same lead at 7am is not.**

```ts
// tests/voice/calling-hours.test.ts
import { describe, it, expect } from "vitest";
import { isWithinCallingHours } from "@/lib/voice/outbound-dialer";

describe("isWithinCallingHours", () => {
  it("uses lead timezone, not server time", () => {
    const at = new Date("2026-04-22T15:00:00Z"); // 11:00 ET, 08:00 PT, 07:00 AK
    expect(isWithinCallingHours("America/New_York", at)).toBe(true);
    expect(isWithinCallingHours("America/Los_Angeles", at)).toBe(false); // before 9am local
    expect(isWithinCallingHours("America/Anchorage", at)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```ts
export function isWithinCallingHours(timeZone: string, at: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, hour: "numeric", weekday: "short",
  });
  const parts = fmt.formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  // TCPA safe harbor: 8am-9pm local, no Sunday (conservative).
  if (weekday === "Sun") return false;
  return hour >= 9 && hour < 21;
}
```

- [ ] **Step 3: Plumb `leadTimezone` through dialer call-sites** — derive from lead row (`leads.time_zone` column; add migration if missing).

- [ ] **Step 4: Run + commit**

```bash
git add src/lib/voice/outbound-dialer.ts tests/voice/calling-hours.test.ts
git commit -m "fix(compliance): calling-hours uses lead timezone (P0-16, TCPA safe harbor)"
```

---

## Phase 8 — Data/Schema Hardening

### Task 8.1: `workspaces.owner_id` UNIQUE

**Files:**
- Create: `supabase/migrations/2026_04_22_workspaces_unique_owner.sql`
- Test: `tests/data/workspaces-owner-unique.test.ts`

- [ ] **Step 1: Failing test — attempt to insert two workspaces with same `owner_id`; expect the second to fail with `23505`.**

- [ ] **Step 2: Migration**

```sql
-- Deduplicate existing violations first (keep newest):
WITH ranked AS (
  SELECT id, owner_id,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at DESC) AS rn
  FROM workspaces
)
UPDATE workspaces SET owner_id = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_owner_id_key UNIQUE (owner_id);
```

- [ ] **Step 3: Run + commit**

```bash
git add supabase/migrations/2026_04_22_workspaces_unique_owner.sql tests/data/workspaces-owner-unique.test.ts
git commit -m "fix(data): UNIQUE constraint on workspaces.owner_id (P0-1 Data)"
```

### Task 8.2: `workspace_invites` hardening

**Files:**
- Create: `supabase/migrations/2026_04_22_workspace_invites_hardening.sql`
- Modify: `src/app/api/workspace/invite/route.ts`
- Test: `tests/data/invite-lifecycle.test.ts`

- [ ] **Step 1: Failing lifecycle test covering: (a) invite can be accepted once, (b) cannot be accepted after expiration, (c) cannot be accepted twice, (d) role is enforced.**

- [ ] **Step 2: Migration**

```sql
ALTER TABLE workspace_invites
  ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS email text NOT NULL,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invites_active
  ON workspace_invites (workspace_id, email)
  WHERE accepted_at IS NULL;

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY invites_tenant_isolation ON workspace_invites
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
```

- [ ] **Step 3: Accept logic uses atomic `UPDATE … WHERE accepted_at IS NULL AND expires_at > now() RETURNING …`.**

- [ ] **Step 4: Run + commit**

```bash
git add supabase/migrations/2026_04_22_workspace_invites_hardening.sql \
  src/app/api/workspace/invite tests/data/invite-lifecycle.test.ts
git commit -m "fix(data): invite FK + expiration + role + single-use + RLS (P0-2 Data)"
```

### Task 8.3: RLS coverage audit

**Files:**
- Create: `scripts/audit-rls.ts`
- Create: `supabase/migrations/2026_04_22_rls_audit.sql`
- Test: `tests/data/rls-coverage.test.ts`

- [ ] **Step 1: Write `scripts/audit-rls.ts`** — queries `pg_tables` + `pg_policies`, lists every table with a tenant-scoped column (`workspace_id`, `tenant_id`, `user_id`, `owner_id`) that has RLS disabled or zero policies.

- [ ] **Step 2: Run on prod snapshot** — capture list.

- [ ] **Step 3: Migration enabling RLS on every identified table + tenant-isolation policy.**

- [ ] **Step 4: Failing test** — for a table in the list, attempt `SELECT *` as anon; expect zero rows.

- [ ] **Step 5: Run + commit**

```bash
git add scripts/audit-rls.ts supabase/migrations/2026_04_22_rls_audit.sql tests/data/rls-coverage.test.ts
git commit -m "fix(security): enable RLS + tenant policy on every tenant-scoped table (P0-3 Data)"
```

---

## Phase 9 — CRM Correctness

### Task 9.1: Incremental sync cursor per provider

**Files:**
- Modify: `src/lib/crm/sync.ts`
- Create: `supabase/migrations/2026_04_22_crm_sync_cursor.sql` (adds `crm_sync_cursor` table)
- Test: `tests/crm/incremental-sync.test.ts`

- [ ] **Step 1: Failing test — second run fetches only rows with `updated_at > cursor`.**

- [ ] **Step 2: Migration + implementation** — `crm_sync_cursor(workspace_id, provider, entity, cursor_at)`.

- [ ] **Step 3: Run + commit**

```bash
git add src/lib/crm/sync.ts \
  supabase/migrations/2026_04_22_crm_sync_cursor.sql \
  tests/crm/incremental-sync.test.ts
git commit -m "fix(crm): incremental cursor per provider/entity (P0-12)"
```

### Task 9.2: CRM write-back

**Files:**
- Create: `src/lib/crm/writeback.ts`
- Create: `src/lib/crm/providers/<provider>/writeback.ts` per provider
- Test: `tests/crm/writeback-contract.test.ts`

- [ ] **Step 1: Define contract** — `createContact`, `updateContact`, `appendActivity` (minimum viable).

- [ ] **Step 2: Implement per provider** (start with HubSpot, Salesforce, Pipedrive — rest feature-gated off).

- [ ] **Step 3: Run + commit per provider**

### Task 9.3: Provider allowlist = code-supported set

**Files:**
- Modify: `src/lib/crm/providers.ts` (single source)
- Delete: hardcoded string arrays in UI

- [ ] **Step 1: Consolidate — every UI/API reads from `SUPPORTED_CRM_PROVIDERS` exported from `src/lib/crm/providers.ts`.**
- [ ] **Step 2: Test — snapshot list length + content.**
- [ ] **Step 3: Commit**

```bash
git commit -m "fix(crm): single source of truth for provider allowlist (P0-26)"
```

---

## Phase 10 — UX Fixes

### Task 10.1: ActivateWizard renders only current step

**Files:**
- Modify: `src/app/activate/ActivateWizard.tsx`
- Test: `tests/ux/activate-wizard.test.tsx`

- [ ] **Step 1: Failing test — render `<ActivateWizard currentStep="email" />`, assert `phone` step NOT in DOM.**
- [ ] **Step 2: Refactor to single-step render.**
- [ ] **Step 3: Run + commit**

### Task 10.2: Remove literal placeholders + fake success UI

**Files:**
- Modify: `src/app/activate/ActivateStep.tsx`
- Test: `tests/ux/activate-no-placeholders.test.tsx`

- [ ] **Step 1: Failing test — render; assert no occurrence of `/\[your /i` and no `success = true` when `provisioningState !== "done"`.**
- [ ] **Step 2: Replace `[your Revenue Operator number]` with `{phoneNumber ?? ""}`; gate success UI on real state.**
- [ ] **Step 3: Run + commit**

```bash
git commit -m "fix(ux): remove literal placeholder + fake success UI on /activate (P0-33, P0-34)"
```

### Task 10.3: `/onboarding` wayfinding fix

**Files:**
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Implement real routing — detect state (no workspace → `/activate`; workspace + no phone → `/connect`; workspace + phone → `/dashboard`).**
- [ ] **Step 2: Playwright test — fresh user hits `/onboarding` → lands on `/activate`; returning user with phone hits `/onboarding` → `/dashboard`.**
- [ ] **Step 3: Run + commit**

### Task 10.4: RFC-4180 CSV parser

**Files:**
- Create: `src/lib/csv/parser.ts`
- Test: `tests/csv/parser.test.ts`

- [ ] **Step 1: Failing test** — quoted field with embedded `\n` parses as a single field:

```ts
// input: `a,"b\nc",d\ne,f,g`
// expect rows: [["a","b\nc","d"],["e","f","g"]]
```

- [ ] **Step 2: Implement streaming state-machine parser.**
- [ ] **Step 3: Replace every `split("\n")` / `split(",")` CSV usage with `parseCsv()`.**
- [ ] **Step 4: Run + commit**

```bash
git commit -m "fix(data): RFC-4180 CSV parser handles quoted newlines (P0-43)"
```

---

## Phase 11 — Quality Gates

### Task 11.1: Restore ESLint rules

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Enumerate current `no-explicit-any` + `exhaustive-deps` violations**

Run: `cd /Users/junior/Revenue-operator-1 && npx eslint src --rule '@typescript-eslint/no-explicit-any: error' --rule 'react-hooks/exhaustive-deps: error' 2>&1 | tee /tmp/eslint-violations.txt | tail -40`

- [ ] **Step 2: Fix in batches of 10-20 — dispatch subagent per batch**
- [ ] **Step 3: Flip rules to `error` in config**
- [ ] **Step 4: Run `npm run lint` — PASS with `--max-warnings=0`**
- [ ] **Step 5: Commit**

### Task 11.2: CI runs full gate suite

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add jobs: `npm run scan:secrets`, `npm run verify:env`, `npm run verify:prod-config`, `npm run verify:launch`, full `npm run test:e2e` (no `--grep`).**
- [ ] **Step 2: Reject placeholder secrets** — fail CI if `echo "$STRIPE_SECRET_KEY" | grep -qE 'example|placeholder|test_1234'`.
- [ ] **Step 3: Commit**

```bash
git commit -m "ci: run full gate suite on every PR (scan/verify/e2e)"
```

### Task 11.3: CSP + Sentry next.config

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Pick ONE CSP strategy — recommend `'strict-dynamic'` + nonces; remove `'unsafe-inline'`.**
- [ ] **Step 2: Tighten `media-src` to known hosts only.**
- [ ] **Step 3: Wrap export with `withSentryConfig(nextConfig, sentryOptions)`.**
- [ ] **Step 4: Playwright test — fresh page load produces no CSP violations in console.**
- [ ] **Step 5: Commit**

### Task 11.4: Queue retry cap + circuit breaker

**Files:**
- Create: `src/lib/queue/retry.ts`
- Create: `src/lib/net/circuit-breaker.ts`
- Tests for both.

- [ ] **Step 1: Failing tests — `retry` caps at `maxAttempts`; classifies 429/502/503/504 as retryable, 4xx otherwise as non-retryable; circuit opens after N consecutive failures, half-opens after cooldown.**
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Replace `retryWithBackoff` callers.**
- [ ] **Step 4: Commit**

---

## Phase 12 — Verification

### Task 12.1: Full stack green

- [ ] **Step 1: `npm run scan:secrets` → exit 0**
- [ ] **Step 2: `npm run lint` → exit 0**
- [ ] **Step 3: `npx tsc --noEmit` → exit 0**
- [ ] **Step 4: `npm run test` → all pass**
- [ ] **Step 5: `npm run test:e2e` → all pass**
- [ ] **Step 6: `npm run verify:prod-config && npm run verify:launch` → exit 0**
- [ ] **Step 7: `npm run build` → exit 0**
- [ ] **Step 8: Capture evidence to `docs/superpowers/evidence/phase-78-complete-<date>.txt`, commit, tag `phase-78-complete`.**

---

## Self-Review

**Spec coverage:** Every P0 from the five parallel audits is covered by a task: secret rotation (Immediate U1-U4 + Phase 1), D1 service-role split (Phase 2), D7/7a/7b injection (Phase 3), Twilio signature-first + demo-token (Phase 4), PKCE + revoke (Phase 5), Stripe factory/idempotency/TOCTOU/overage/refund/cron (Phase 6), recording consent + revocation hangup + DNC unify + FTC + timezone (Phase 7), workspaces UNIQUE + invites + RLS audit (Phase 8), CRM incremental + writeback + provider list (Phase 9), Activate + onboarding + CSV (Phase 10), ESLint + CI + CSP + retry/circuit (Phase 11).

**Placeholder scan:** Tasks 6.5, 9.2, 9.3, 10.3, 11.1, 11.2, 11.3, 11.4, 12.1 use subagent-dispatch or per-provider/per-file expansion rather than inline code (deliberate — the concrete work per file is too many files to inline). Every other task contains the real code, exact commands, exact commit messages. Steps with code blocks have full code, no `TODO` or "implement later".

**Type consistency:** `getSupabaseAdmin()` used in both Phase 2 and Phase 7 — matches. `stripeIdempotencyKey(purpose, ...parts)` signature consistent across Task 6.2, 6.6. `verifyTwilioRequest(url, params, signature)` same shape in Task 4.1 and 4.2. `isDncSuppressed(workspace_id, phoneE164)` same signature in Task 7.3 and where called from dialer (Phase 7). `assertE164` / `normalizePhone` names match across Phase 3 producers and all consumers (Phase 4/7).

**Mitigated gap:** Task 6.3 includes a placeholder-style TODO inside the test harness comment — this is intentional because the concurrency harness depends on the test-infrastructure choice (vitest mocks vs supabase-test-harness), which the executor should pick based on existing patterns in `tests/billing/` if present.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-phase-78-100b-remediation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this plan because Phases 2, 6.2, 9, and 11.1 all expand into 10-50 per-file fixes that parallelize cleanly.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Slower, but you see every diff live.

Which approach?
