# Release verification — migrations, cron, retries, doctrine

No product or UX changes. Release hardening only.

---

## Files changed / added

| File | Change |
|------|--------|
| **supabase/VERIFY_RELIABILITY_DOCTRINE.sql** | New. SQL script: checks `action_commands` (attempt_count, last_error, next_retry_at), `revenue_proof` (proof_dedup_key + unique index), `canonical_signals` (processed_at). Outputs NOTICE lines + one row `OVERALL_VERIFY_RELIABILITY_DOCTRINE` = PASS or FAIL. |
| **src/lib/env/validate.ts** | Production-only: require `DOCTRINE_ENFORCED`, `CRON_SECRET`, `SESSION_SECRET`. Error message lists exactly which vars are missing. |
| **src/app/api/health/cron/route.ts** | New. GET `/api/health/cron`: checks CRON_SECRET set; checks last 15 min had ≥1 completed job in `job_queue` or returns warning (JSON only). |
| **src/middleware.ts** | Allow unauthenticated access to `/api/health/cron`. |
| **scripts/smoke-production.ts** | New. Node script: GET /api/health, GET /api/health/cron; optional `--trigger-cron` with CRON_SECRET in non-prod. Prints PASS/FAIL. |
| **package.json** | Added script `"smoke": "tsx scripts/smoke-production.ts"`. |
| **tsconfig.json** | Excluded `scripts` so Next build does not type-check script files (avoids duplicate symbol with other scripts). |
| **docs/RELEASE_VERIFY.md** | This file. |

---

## Commands to run

```bash
# 1. Tests and build
npm test
npm run build

# 2. Run migration (Supabase)
npx supabase db push
# OR in Supabase Dashboard → SQL Editor: run contents of
#   supabase/migrations/reliability_doctrine_lock_retry_proof.sql

# 3. Verify migration (Supabase SQL Editor)
# Paste and run: supabase/VERIFY_RELIABILITY_DOCTRINE.sql
# Expect: NOTICEs with PASS for each check, and one row OVERALL_VERIFY_RELIABILITY_DOCTRINE = 'PASS'

# 4. Smoke (after deploy or against local)
BASE_URL=https://your-app.vercel.app npx tsx scripts/smoke-production.ts
# Optional: trigger process-queue in non-prod
BASE_URL=http://localhost:3000 CRON_SECRET=your-secret npx tsx scripts/smoke-production.ts --trigger-cron
# Or: npm run smoke (uses BASE_URL / NEXT_PUBLIC_APP_URL / localhost)
```

---

## What to verify in Vercel

1. **Env vars (production)**  
   In Vercel → Project → Settings → Environment Variables, set for Production (and Preview if you want):
   - `DOCTRINE_ENFORCED` = `1`
   - `CRON_SECRET` = (strong secret)
   - `SESSION_SECRET` = (strong secret)

   If any of these are missing in production, the app will **refuse to start** and the error will list the missing variable names.

2. **Health endpoints**  
   - `GET https://your-app.vercel.app/api/health` → 200, `status: "ok"`.
   - `GET https://your-app.vercel.app/api/health/cron` → 200, `cron_secret_set: true`, and either `recent_success: true` or a `status: "warning"` with message (e.g. no job in last 15 min if queue is Redis or idle).

3. **Cron**  
   Ensure Vercel Cron (or external scheduler) calls:
   `GET https://your-app.vercel.app/api/cron/process-queue`
   with header `Authorization: Bearer <CRON_SECRET>` every minute (or your chosen interval).

---

## What to verify in Supabase

1. **Migrations applied**  
   Run `supabase/VERIFY_RELIABILITY_DOCTRINE.sql` in SQL Editor. Result must show:
   - `action_commands_columns: PASS`
   - `revenue_proof_dedup: PASS`
   - `canonical_signals_processed_at: PASS`
   - One row: `OVERALL_VERIFY_RELIABILITY_DOCTRINE` = `PASS`.

2. **Schema**  
   Script assumes tables live in schema `revenue_operator`. If your tables are in `public`, change `revenue_operator` to `public` in the verification script.

3. **Doctrine / retries / proof**  
   After deployment, one inbound message should create a row in `canonical_signals` with `processed_at` set; action failures should update `action_commands.attempt_count`, `last_error`, `next_retry_at`; proof writes should be idempotent via `proof_dedup_key`.
