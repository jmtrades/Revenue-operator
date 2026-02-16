# Launch Ready Report — Recall Touch

**Date:** 2025-02-10  
**Status:** Ready for production deploy

---

## 1. What was fixed

- **Activate flow:** "Start 14-day protection" always redirects to Stripe or shows a visible error with "Try again". No silent failures. Session check skips email and routes to `/connect` when session exists.
- **Checkout API:** Validates `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_APP_URL`; returns `STRIPE_NOT_CONFIGURED` and `missing[]` on 500. Subscription session uses 14-day trial, `payment_method_collection: "always"`, correct success/cancel URLs.
- **Currency:** All pricing copy uses USD ($). No £ in UI. `src/lib/currency.ts` used where pricing is displayed. CI: `grep -R "£" src` should be empty.
- **Session / middleware:** Session cookie restored on each request. `/activate`, `/connect`, `/live` reachable in correct states. No redirect loops. `workspace_id` query param allowed and not stripped. `/api/auth/session` returns `user_id`, `email`, `workspace_id` (snake_case and camelCase).
- **Connect page:** Auto-provision accepts `workspace_id` from request body when session is missing (post-Stripe redirect). Retries with backoff (up to 10 attempts, ~30s). Displays number in E.164 and pretty format, "Copy number", exact instruction text. Polls for inbound; on first message redirects to `/live?conversation_id=...&workspace_id=...`. After 45s no inbound: "Copy number again", "Open dashboard", "Need help?". WorkspaceGate: resolves workspace from URL param → session → `/api/workspaces` → else redirect to `/activate`. Never crashes on empty/delayed workspaces; shows "Restoring workspace…" and retry.
- **Live page:** Timeline for real conversation; reads `conversation_id` from URL; shows real message bubbles; polls messages; "Go to dashboard" and auto-redirect after reply. No fake simulation in production; dev simulate only with `DEV_SIM_SECRET`.
- **Dev simulate:** `/api/dev/simulate-inbound` returns 403 in production unless `DEV_SIM_SECRET` matches request `Authorization: Bearer <secret>`.
- **Error boundaries:** `src/app/error.tsx`, `src/app/global-error.tsx`. Empty states are calm and clear.
- **Env validation:** `npm run verify:env` runs `scripts/verify-env.ts` and prints a readiness report (no secrets). Server-side env validation; client shows friendly messages ("Payment setup isn't complete yet.", etc.) when APIs return config errors.
- **Billing webhooks:** Handles `customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed` (and deleted). Trial reminders cron: `/api/cron/trial-reminders`; idempotent where needed.

---

## 2. Vercel env to set

Set these in Vercel → Project → Settings → Environment Variables (Production):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Yes | e.g. `https://your-app.vercel.app` |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Yes | Price ID for subscription |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SESSION_SECRET` or `ENCRYPTION_KEY` | Yes | At least one for session/encryption |
| `TWILIO_ACCOUNT_SID` | If SMS | For Twilio auto-provision |
| `TWILIO_AUTH_TOKEN` | If SMS | For Twilio auto-provision |
| `CRON_SECRET` | If cron | For cron route auth |
| `RESEND_API_KEY` | Optional | Trial reminder emails |
| `EMAIL_FROM` | Optional | Sender for Resend |
| `DEV_SIM_SECRET` | Optional | Only if you need dev simulate in prod |
| `TWILIO_PROXY_NUMBER` | Optional | Fallback when number purchase fails |

Run before deploy: `npm run verify:env` (no secrets printed).

---

## 3. Required Stripe settings

- **Product:** One subscription product with a price (recurring).
- **Webhook:** Add endpoint `https://<NEXT_PUBLIC_APP_URL>/api/billing/webhook`. Events: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Copy signing secret to `STRIPE_WEBHOOK_SECRET`.
- **Checkout:** Success URL must point to your app (e.g. `{APP_URL}/connect?workspace_id={CHECKOUT_SESSION_METADATA_workspace_id}` or equivalent). Cancel URL e.g. `{APP_URL}/activate?canceled=1`.
- **Trial:** 14-day trial; payment method collected at signup (`payment_method_collection: "always"`).

---

## 4. Required cron schedules (Vercel)

If using Vercel Cron:

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/trial-reminders` | Daily (e.g. 0 9 * * *) | Trial reminder emails |
| `/api/cron/process-queue` | Every 1–5 min | Process job queue |
| `/api/cron/no-reply` | Daily | No-reply follow-ups |

Send `Authorization: Bearer <CRON_SECRET>` or use Vercel’s cron secret header if configured.

---

## 5. Deploy commands

**Option A — Git (recommended)**  
1. Commit and push to `main`.  
2. Vercel auto-deploys from `main`.  
3. Or trigger deploy from Vercel dashboard.

**Option B — Vercel CLI**  
```bash
vercel --prod
```

After deploy: run through `docs/LAUNCH_VERIFY_ONBOARDING.md` checklist (incognito, Stripe success/cancel, Twilio inbound, /live timeline, session persistence, error states).

---

## 6. Remaining known risks (none critical)

- **Edge runtime:** `crypto` usage in middleware may show a warning; session still works in API routes.
- **Workspace race:** New workspace might not be visible for a short time; WorkspaceGate retries (e.g. 20s) cover this.
- **Twilio number purchase:** If Twilio fails, fallback to `TWILIO_PROXY_NUMBER` when set; otherwise user sees error and can retry.

---

**Sign-off:** End-to-end flow is production-ready: activate → Stripe checkout → connect → Twilio number → user texts → live timeline → dashboard, with no dead-ends, no silent failures, and clear errors and recovery UI.
