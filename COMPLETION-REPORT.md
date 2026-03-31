# Recall Touch — Completion Report

**Date:** March 28, 2026
**Site:** https://www.recall-touch.com
**Latest Deploy:** `dpl_H8dT9spRz8LDhz4oJ6JCGXffMFgn` (READY)

---

## What Was Fixed This Session

1. **Billing page Retry button** — Updated to call `loadBillingData()` instead of stale inline fetch code. No more broken retry behavior.

2. **Billing page "Buy Minutes" error handling** — Now gracefully handles the Stripe-not-configured state (503/missing_env) with a user-friendly message instead of a generic error.

3. **Missing i18n translation keys** — Added 6 keys across two namespaces:
   - `followUps`: `allPaused`, `pauseAll`, `allResumed`, `resumeAll`
   - `campaigns.toast`: `exported`, `exportFailed`

4. **Stripe setup script** — Complete rewrite of `scripts/setup-stripe.ts` to create 3 Stripe products (Starter, Growth, Business) with monthly + annual prices, plus auto-webhook creation.

5. **Production deployment** — All fixes deployed and verified on production. Billing page loads real data, Follow-Ups/Campaigns/Appointments pages render without console errors.

---

## Production Verification Results

| Page | Status | Notes |
|------|--------|-------|
| Billing | Working | Real data (Starter $147/mo, 0/1000 min, Trial Ended). All buttons visible. |
| Follow-Ups | Working | Templates render, no i18n errors |
| Campaigns | Working | Stats cards, Export, Create Campaign all functional |
| Appointments | Working | Empty state, "Get started" card, zero console errors |

---

## What YOU Need To Do (Stripe Setup)

The Stripe backend code is 100% written and deployed. The **only blocker** is that your Stripe API keys and price IDs are not yet configured in Vercel. Here's exactly what to do:

### Step 1: Run the Stripe Setup Script

This creates products and prices in your Stripe account and outputs the env var values you need.

```bash
# For TEST mode:
STRIPE_SECRET_KEY=sk_test_YOUR_KEY npx tsx scripts/setup-stripe.ts

# For LIVE mode:
STRIPE_SECRET_KEY=sk_live_YOUR_KEY npx tsx scripts/setup-stripe.ts
```

The script will output something like:
```
STRIPE_PRICE_SOLO_MONTH=price_xxxxx
STRIPE_PRICE_SOLO_YEAR=price_xxxxx
STRIPE_PRICE_BUSINESS_MONTH=price_xxxxx
STRIPE_PRICE_BUSINESS_YEAR=price_xxxxx
STRIPE_PRICE_SCALE_MONTH=price_xxxxx
STRIPE_PRICE_SCALE_YEAR=price_xxxxx
```

### Step 2: Add Environment Variables to Vercel

Go to **Vercel Dashboard → Revenue Operator → Settings → Environment Variables** and add:

| Variable | Where to get it |
|----------|----------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys (publishable key) |
| `STRIPE_PRICE_SOLO_MONTH` | Output from Step 1 |
| `STRIPE_PRICE_SOLO_YEAR` | Output from Step 1 |
| `STRIPE_PRICE_BUSINESS_MONTH` | Output from Step 1 |
| `STRIPE_PRICE_BUSINESS_YEAR` | Output from Step 1 |
| `STRIPE_PRICE_SCALE_MONTH` | Output from Step 1 |
| `STRIPE_PRICE_SCALE_YEAR` | Output from Step 1 |

**Already set:** `STRIPE_WEBHOOK_SECRET` (whsec_mmav...)

### Step 3: Redeploy

After adding the env vars, trigger a new production deployment:
```bash
npx vercel --prod --yes --archive=tgz
```

### Step 4: Test the Flow

1. Go to Billing page → Click "Change plan" → Select a plan → Should redirect to Stripe Checkout
2. Complete a test payment with card `4242 4242 4242 4242`
3. Verify the subscription shows on the Billing page
4. Try buying a minute pack — should open a one-time Stripe Checkout

---

## What YOU Need To Do (Phone/Telnyx Setup)

For phone number provisioning (so users can receive AI-answered calls), add these to Vercel:

| Variable | Where to get it |
|----------|----------------|
| `TELNYX_API_KEY` | Telnyx Portal → API Keys |
| `TELNYX_PUBLIC_KEY` | Telnyx Portal → API Keys |
| `TELNYX_APP_ID` | Telnyx Portal → Voice API → Applications |
| `TELNYX_MESSAGING_PROFILE_ID` | Telnyx Portal → Messaging → Profiles |

---

## Current Feature Readiness

| Feature | Code Status | Env Vars Needed | Ready? |
|---------|-------------|-----------------|--------|
| Stripe Checkout (new subscriptions) | Complete | STRIPE_SECRET_KEY, PUBLISHABLE_KEY, PRICE_* | After env setup |
| Plan Changes (upgrade/downgrade) | Complete | Same as above | After env setup |
| Minute Pack Purchases | Complete | Same as above | After env setup |
| Stripe Customer Portal | Complete | Same as above | After env setup |
| Webhook Handling | Complete | STRIPE_WEBHOOK_SECRET (already set) | Partially ready |
| Activation Wizard | Complete | None (uses workspace API) | Ready now |
| Phone Provisioning | ~70% complete | TELNYX_* vars | After env + code |
| Agent Configuration | ~95% complete | None | Ready now |
| Billing Page UI | Complete | None | Ready now |
| i18n Translations | Complete | None | Ready now |
