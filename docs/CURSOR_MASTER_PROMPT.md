# CURSOR MASTER PROMPT — REVENUE OPERATOR LAUNCH / “MAKE IT WORK” (CANONICAL)

You are operating inside the **Revenue Operator** repository.

Your mission has two simultaneous constraints:

1) **Make everything work in production (Vercel + Supabase + Stripe + Cron)**
2) **Do not violate doctrine**: this is an operational record, not a SaaS dashboard.

You must not introduce any “advice”, “optimization”, “performance”, “KPI”, “increase”, “improve”, “recommend”, “should”, “please”, “your”, “better”, “faster”, “efficient”, or persuasive language in user-facing copy, logs, or tests. No metrics, no ROI, no dashboards.

This repo already contains doctrine tests. **All changes must keep tests green and build green.**

---

## PRODUCT TRUTH (NON-NEGOTIABLE)

This product is **not**:
- CRM, automation tool, workflow manager, messaging system, task tracker
- analytics or productivity software
- a “chatbot” that freeforms replies

This product **is**:
- The place where work completion becomes real.
- If an outcome is not recorded here, operationally it is incomplete.

The system expresses only:
- what occurred
- what depends on it
- what would happen if removed

Never instruct. Never persuade. Only consequence.

---

## CURRENT ARCHITECTURE (DO NOT BREAK)

The repository already implements:
- **Continuity evidence ladder**: causality → continuation → displacement → responsibility → detachment → operability anchor → assumption → normalization → institutional state
- **Coordination network**: reciprocal events (thread activity), public corridor participation, downstream actions, responsibilities, assignments, evidence, dependencies, reference memory, auditability amendments, temporal stability.
- **Four surfaces UI**: Situation / Record / Activity / Presence
- **Emergent fifth surface**: Continuation (only when chain length > 1)

Gating:
- Settlement activation is locked behind the ladder + institutional state + stability + no recent amendments + cross-party reliance + dependency pressure + anchored across days + provider detachment + assumption + normalization.
Do not loosen it. Do not add shortcuts.

---

## HARD CONTRACTS (MUST HOLD)

### A) Billing / Trial routes contract
All billing/trial routes MUST:
- run on **nodejs runtime**
- be deterministic and idempotent
- return JSON only, never redirect on failure
- never throw raw errors to client

`POST /api/trial/start` returns:
- Success checkout:
  - `{ ok: true, checkout_url: string }`
- Already active:
  - `{ ok: true, reason: "already_active", workspace_id?: string }`
- Failure:
  - `{ ok: false, reason: one_of(...) }`

Allowed failure reasons (stable strings):
- `missing_env`
- `invalid_json`
- `invalid_email`
- `workspace_creation_failed`
- `checkout_creation_failed`
- `wrong_price_mode`
- `stripe_unreachable`

`POST /api/billing/checkout` returns `{ ok, checkout_url? , reason? }` with the same reason strings when possible.

`POST /api/billing/webhook`:
- Must use `req.text()` raw body
- Must verify Stripe signature
- Must be idempotent and always return 200 for known events (even duplicates)
- Must never redirect (middleware must not interfere)

### B) System health contract
`GET /api/system/health`:
- Always returns 200
- Returns booleans only:
  `{ ok, core_recent, db_reachable, public_corridor_ok }`
- On any error: safe defaults (false)
- No stack traces, no IDs, no secrets

### C) Core status contract
`GET /api/system/core-status`:
- Doctrine-safe booleans only (and dependence_level if present)
- Must be auth-protected where intended
- Must return deterministic defaults on error

### D) Public corridor safety
Public endpoints (`/api/public/*` and `/public/work/*`) must:
- expose no internal ids
- include rate limiting with hashed IP keys only
- return neutral empty structures when over limit or missing
- remain deterministic

### E) Middleware contract
Middleware must:
- never redirect API routes
- allow all public pages/apis explicitly:
  `/`, `/activate`, `/onboard/*`, `/public/work/*`,
  `/api/trial/*`, `/api/billing/webhook`, `/api/billing/checkout`,
  `/api/onboard/*`, `/api/public/*`, `/api/cron/*`,
  `/api/system/health`
- Protected POST APIs without session must return `401` JSON (not redirect)

---

## UI/UX DOCTRINE (MUST HOLD)

UI must feel like a record, not an app.
No:
- cards, icons, badges, charts, graphs, progress indicators
- success toasts
- marketing copy
- onboarding stepper UI
Only:
- text sections, hairline dividers, documentary lines
- one-column layouts
- single primary action per screen

### Dashboard surfaces
Only these surfaces exist:
- Situation
- Record
- Activity
- Presence
Continuation appears only when reciprocal chain length > 1.

Each surface must have an invariant fallback line:
- Situation: `No unresolved condition was present.`
- Record: `What actually happened.`
- Activity: `No external action was required.`
- Presence: `Operation did not depend on the record.`

### Onboarding flow (must remain)
Routes:
- `/onboard`
- `/onboard/identity`
- `/onboard/source`
- `/onboard/record`
- `/onboard/send`
- `/onboard/waiting`
- `/onboard/complete`

Hard copy requirements (exact):
- Send message: `This matches what we agreed. Adjust it if anything is off.`
- Send idle fallback (after 20s): `A record can be sent now or shared later.`
- Waiting lines:
  - `The other side has the record.`
  - `Completion happens when they see the same thing.`
- Completion append line:
  - `The outcome now exists independently of this conversation.`
- Post-completion input placeholder:
  - `Add another outcome to this record`

Waiting signals must be factual and deterministic:
- Not viewed after 3 min: `The other side has not viewed the record yet.`
- Viewed but not confirmed: `The record was seen but not confirmed.`
- Disputed: `The outcome requires alignment.`

No tutorials. No tooltips. No persuasion.

---

## EXECUTION SEPARATION (DO NOT MERGE PROJECTS)

We keep “execute everything” as a separate project.
This repo emits **action intents** but does not call external systems directly.

Action intents:
- append-only `action_intents` table
- create/claim/complete APIs exist
- no external API calls from inside this repo
- executor runs elsewhere

---

## LAUNCH SUCCESS DEFINITION

A production deployment is considered correct only when:

1) `npm test` passes
2) `npm run build` succeeds
3) `BASE_URL=https://<prod-domain> npm run prod:gate` exits 0
4) The onboarding loop completes end-to-end and the public corridor is usable from a phone
5) Stripe trial start works, and webhook confirms subscription state

---

## YOUR WORKFLOW (DO THIS EXACTLY)

### Step 0 — Do not change product scope
No new features. Only correctness, reliability, UX polish (within doctrine), and production readiness.

### Step 1 — Run repo gate locally
- `npm test`
- `npm run build`

If anything fails, fix with minimal diffs.

### Step 2 — Validate prod contracts
Ensure these exist and match contracts:
- `/api/trial/start`
- `/api/billing/checkout`
- `/api/billing/webhook`
- `/api/system/health`
- `/api/system/core-status`
- middleware allowlist

### Step 3 — Validate launch gate
Ensure these scripts exist and behave:
- `scripts/verify-prod-config.ts`
- `scripts/self-check.ts`
- `scripts/prod-gate.ts`
- `package.json` has `"prod:gate": "tsx scripts/prod-gate.ts"`

`npm run prod:gate` must:
- require `BASE_URL`
- run verify-prod-config
- run self-check
- exit non-zero on any failure

### Step 4 — Fix “failed to start free trial” class issues
Treat failures as **contract mismatches**:
- missing env
- wrong Stripe price mode
- webhook blocked by middleware
- webhook signature mismatch
- checkout origin mismatch

Rules:
- never show raw error in UI
- return `{ ok:false, reason }` only
- log PII-free structured event with reason

### Step 5 — Make onboarding look and feel correct (11-figure grade, within doctrine)
- typography: consistent, one column, no visual noise
- spacing: comfortable, hairline dividers
- one primary action per page
- all lines ≤90 chars
- no “helpful” tone; documentary only
- no icons, no cards

### Step 6 — Produce Launch Pack docs (already exists; keep accurate)
Ensure:
- `docs/VERCEL_ENV.md`
- `docs/CRON_PROD.md`
- `docs/SUPABASE_PROD_CHECKLIST.md`
- `docs/INTEGRATIONS_PROD.md`
- `docs/VERCEL_DEPLOY.md`
- `docs/LAUNCH_CHECK.md`
- `LAUNCH_READINESS.md` (if present)
are consistent with current route names and contracts.

### Step 7 — Final verify
Run:
- `npm test`
- `npm run build`
Then deploy.
Then run:
- `BASE_URL=https://<prod-domain> npm run prod:gate`

Only then call it “launched”.

---

## WHAT YOU MUST OUTPUT AFTER CHANGES

Whenever you implement changes, output:
1) Exact files changed
2) Exact contracts affected (JSON shapes + reason strings)
3) Exact tests added/updated
4) `npm test` status
5) `npm run build` status
6) How to verify in production (single command: prod:gate)

Never output marketing language.

---

## IF YOU NEED TO MODIFY ANY COPY

Rules:
- short
- factual
- past-tense where possible
- ≤90 chars
- no “you/your/please/should”
- no “improve/increase/optimize/performance”
- no emojis
- no exclamation marks

---

## PRIMARY GOAL

Make the system **reliably launchable** and **operationally inevitable**:
- work is complete only when recorded and confirmed
- participation flows without accounts
- the record becomes the shared truth

Proceed with minimal diffs and keep the gate green.
