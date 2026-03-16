# CURSOR-MASTER-PROMPT — Recall Touch: Full System Fix

> **MANDATORY**: Fix every item below. Do NOT skip anything. Do NOT reorder.
> After ALL changes: `npx tsc --noEmit` must produce zero errors, then `npm run build` must succeed.
> Then commit and push.

---

## Issue 1 — PlanChangeModal: 100% Hardcoded English (CRITICAL)

**File:** `src/components/PlanChangeModal.tsx`

**Problem:** The entire plan-change modal is hardcoded English. Every string — titles, descriptions, labels, button text, error messages — is raw English. The component only calls `useTranslations("common")` for `t("close")`, `t("cancel")`, `t("back")`, and `t("genericErrorTryAgain")`. Everything else is a hardcoded string literal. When a user in any non-English locale opens the billing page and clicks "Change plan", they see a fully English modal.

**Hardcoded strings that must be replaced (with line numbers):**

1. **Line 19 — PLANS array:** All plan names, features are hardcoded:
   ```ts
   { id: "starter", name: "Starter", price: 297, minutes: 400, features: ["1 AI agent", "1 phone number", "400 min/mo", "Usage insights"] },
   { id: "growth", name: "Growth", price: 497, minutes: 1500, features: ["3 AI agents", "3 phone numbers", "1,500 min/mo", "Call Intelligence", "Priority support"] },
   { id: "scale", name: "Scale", price: 2400, minutes: 5000, features: ["Unlimited AI agents", "10 numbers", "5,000 min/mo", "Detailed reporting", "API access"] },
   { id: "enterprise", name: "Enterprise", price: null, minutes: null, features: ["Unlimited agents", "Unlimited numbers", "Custom integrations", "Dedicated support", "SLA"] },
   ```

2. **Line 114:** `"Change your plan"` and `` `Upgrade to ${selectedPlan?.name}` `` and `` `Downgrade to ${selectedPlan?.name}` ``
3. **Line 124:** `"Currently on {plan}. Select a new plan below."`
4. **Line 145–146:** `"Custom"` and `"/mo"`
5. **Line 155:** `"Current"` badge label
6. **Line 173:** `"Contact us"` and `"Continue"` button labels
7. **Line 180–182:** `"You'll be charged the prorated difference. Your new features are available right away."` and `"Your plan will change at your next billing date. You'll keep current features until then."`
8. **Line 186:** `"Current plan"` label
9. **Line 190:** `"New plan"` label
10. **Line 191:** `"— Contact us"` for enterprise
11. **Line 205:** `"Processing…"`, `"Upgrade now"`, `"Confirm downgrade"` button labels
12. **Lines 82–86:** Error message mapping: `"Billing is being set up. Contact support."` and `"Could not change plan."`

**Fix:**

Step A — Add a new `planChangeModal` namespace to ALL 6 locale JSON files inside their `"settings"` → `"billing"` section (or create a top-level `"planChange"` namespace). The namespace must contain every string above, with ICU `{planName}` interpolation for dynamic plan names.

Add these keys to `en.json` (create equivalent translations for es/fr/de/pt/ja):
```json
"planChange": {
  "title": "Change your plan",
  "upgradeTitle": "Upgrade to {planName}",
  "downgradeTitle": "Downgrade to {planName}",
  "currentlyOn": "Currently on {planName}. Select a new plan below.",
  "currentBadge": "Current",
  "contactUs": "Contact us",
  "continue": "Continue",
  "upgradeDescription": "You'll be charged the prorated difference. Your new features are available right away.",
  "downgradeDescription": "Your plan will change at your next billing date. You'll keep current features until then.",
  "currentPlanLabel": "Current plan",
  "newPlanLabel": "New plan",
  "contactUsPrice": "Contact us",
  "processing": "Processing…",
  "upgradeNow": "Upgrade now",
  "confirmDowngrade": "Confirm downgrade",
  "couldNotChange": "Could not change plan.",
  "billingBeingSetUp": "Billing is being set up. Contact support.",
  "perMonth": "/mo",
  "custom": "Custom",
  "plans": {
    "starter": {
      "name": "Starter",
      "features": ["1 AI agent", "1 phone number", "400 min/mo", "Usage insights"]
    },
    "growth": {
      "name": "Growth",
      "features": ["3 AI agents", "3 phone numbers", "1,500 min/mo", "Call Intelligence", "Priority support"]
    },
    "scale": {
      "name": "Scale",
      "features": ["Unlimited AI agents", "10 numbers", "5,000 min/mo", "Detailed reporting", "API access"]
    },
    "enterprise": {
      "name": "Enterprise",
      "features": ["Unlimited agents", "Unlimited numbers", "Custom integrations", "Dedicated support", "SLA"]
    }
  }
}
```

Step B — Refactor `PlanChangeModal.tsx`:
- Add `const tPlan = useTranslations("planChange");`
- Replace the static PLANS array: plan names come from `tPlan("plans.starter.name")`, features come from `tPlan.raw("plans.starter.features")` (array), etc.
- Replace every hardcoded string with its `tPlan(...)` call using the keys above.
- The `price` and `minutes` numbers stay as numbers — only the labels/descriptions get i18n.

Step C — Add full translations for es/fr/de/pt/ja. Every key in `planChange` must exist in all 6 locales.

---

## Issue 2 — Setup Checklist: 10 Hardcoded English Labels (CRITICAL)

**File:** `src/lib/readiness.ts` lines 47–58

**Problem:** The dashboard setup checklist shows 10 items, ALL with English-only `label` values hardcoded in a TypeScript file. These are rendered on the dashboard as a checklist. When viewing in Spanish (or any non-English locale), the checklist items appear in English.

**Current hardcoded labels:**
```ts
{ key: "business", label: "Business info added", ... },
{ key: "use_cases", label: "Use cases selected", ... },
{ key: "agent", label: "Agent created", ... },
{ key: "voice", label: "Voice selected", ... },
{ key: "greeting", label: "Opening greeting set", ... },
{ key: "knowledge", label: "3+ knowledge entries", ... },
{ key: "behavior", label: "Behavior configured", ... },
{ key: "phone", label: "Phone number connected", ... },
{ key: "tested", label: "Agent tested", ... },
{ key: "launched", label: "Agent launched", ... },
```

**Fix:**

Step A — Remove the `label` field from the `ReadinessItem` interface and the items array in `readiness.ts`. Instead, each item should only have `key`, `done`, `weight`, `href`. The label will be resolved at render time.

Step B — Add checklist label keys to `en.json` under `dashboard.checklist`:
```json
"dashboard": {
  "checklist": {
    "business": "Business info added",
    "use_cases": "Use cases selected",
    "agent": "Agent created",
    "voice": "Voice selected",
    "greeting": "Opening greeting set",
    "knowledge": "3+ knowledge entries",
    "behavior": "Behavior configured",
    "phone": "Phone number connected",
    "tested": "Agent tested",
    "launched": "Agent launched"
  }
}
```

If `dashboard.checklist` keys already exist, merge into them. Add translations for all 6 locales.

Step C — In whatever component renders the checklist (find it via searching for `readiness` or `ReadinessItem` imports), use `useTranslations("dashboard")` and render labels via `t(\`checklist.${item.key}\`)`.

---

## Issue 3 — Homepage Pricing: PRICING_TIERS Hardcoded English (CRITICAL)

**File:** `src/lib/constants.ts` lines 38–117 (PRICING_TIERS)

**Consumed by:** `src/components/sections/PricingPreview.tsx`

**Problem:** The PRICING_TIERS constant contains hardcoded English for every plan's `name`, `description`, `features[]`, `cta`, and `period`. The PricingPreview component renders these raw strings directly at lines 59 (name), 61–62 (price + period), 64 (description), 70–72 (features), 77–80 (CTA). The homepage pricing section is therefore fully English for all locales.

**Current hardcoded values (sample):**
```ts
name: "Starter",
description: "Answer every call. One number, one agent.",
features: ["400 inbound min included", "50 outbound calls", "100 SMS", "1 AI agent", "1 phone number", "Overage: $0.25/min"],
cta: "Start free",
period: "/mo",
```

**Fix:**

Step A — Add `homepage.pricingPreview.tiers` keys to `en.json`:
```json
"homepage": {
  "pricingPreview": {
    "tiers": {
      "starter": {
        "name": "Starter",
        "description": "Answer every call. One number, one agent.",
        "features": ["400 inbound min included", "50 outbound calls", "100 SMS", "1 AI agent", "1 phone number", "Overage: $0.25/min"],
        "cta": "Start free"
      },
      "growth": {
        "name": "Growth",
        "description": "One recovered lead pays for the whole month",
        "features": ["1,500 inbound min included", "500 outbound calls", "500 SMS", "3 AI agents", "3 numbers", "Appointment booking", "Follow-up sequences", "Analytics", "Overage: $0.18/min"],
        "cta": "Start free"
      },
      "scale": {
        "name": "Scale",
        "description": "Full AI communication team for a fraction of one hire",
        "features": ["5,000 inbound min included", "2,000 outbound calls", "Unlimited SMS", "Unlimited AI agents", "10 numbers", "Multi-location", "Compliance", "API", "Priority support", "Overage: $0.12/min"],
        "cta": "Start free"
      },
      "enterprise": {
        "name": "Enterprise",
        "description": "Custom pricing — white label, custom compliance, SSO, dedicated manager, SLA",
        "features": ["White label", "Custom compliance", "SSO", "Dedicated manager", "SLA"],
        "cta": "Talk to sales"
      }
    },
    "period": "/mo"
  }
}
```

Step B — Refactor `PricingPreview.tsx`: Instead of rendering `tier.name`, `tier.description`, `tier.features`, `tier.cta`, `tier.period` from the constant, use translation keys. Keep PRICING_TIERS for non-translatable data (price numbers, popular flag, href). Map each tier by `tier.name.toLowerCase()` to the translation key.

Step C — Add equivalent translations to es/fr/de/pt/ja.

---

## Issue 4 — Homepage Pricing FAQ: Hardcoded English (MODERATE)

**File:** `src/lib/constants.ts` lines 148–161 (PRICING_FAQ)

**Problem:** 12 FAQ entries with `q` and `a` fields, all hardcoded English. If a pricing FAQ section uses these, it's English-only.

**Fix:** Move to i18n. Add `pricing.faq` array keys to all 6 locale files. In the component that renders FAQ, use `useTranslations("pricing")` and iterate via `t.raw("faq")`.

---

## Issue 5 — Homepage Footer Constants: Hardcoded English (MODERATE)

**File:** `src/lib/constants.ts` — `FOOTER_SOLUTIONS` (lines 30–36), `FOOTER_PRODUCT` (119–126), `FOOTER_COMPANY` (128–132), `FOOTER_USE_CASES` (134–141), `FOOTER_LEGAL` (143–146), `COMPARISON_FEATURES` (163–175)

**Problem:** All footer link labels and comparison feature names are hardcoded English.

**Fix:** Either:
- Move labels to i18n keys and look them up at render time, OR
- Use `labelKey` (like NAV_LINKS already does) and resolve via `useTranslations`.

COMPARISON_FEATURES should have its feature names and category names in i18n.

---

## Issue 6 — HomepageActivityPreview: Hardcoded English Card Data (MODERATE)

**File:** `src/components/sections/HomepageActivityPreview.tsx` lines 6–10

**Problem:** The CARDS constant has hardcoded English `summary` and `outcome` fields:
```ts
{ summary: "Scheduling consultation", outcome: "✅ Booked 2 PM" },
{ summary: "Pricing question", outcome: "✅ Info sent via text" },
{ summary: "Callback request", outcome: "✅ Follow-up in 30 min" },
```

These show up in the homepage activity preview widget. In non-English locales, users see these English phrases.

**Fix:** Move `summary` and `outcome` to i18n. Add keys under `homepage.activityPreview.cards`:
```json
"cards": {
  "1": { "summary": "Scheduling consultation", "outcome": "✅ Booked 2 PM" },
  "2": { "summary": "Pricing question", "outcome": "✅ Info sent via text" },
  "3": { "summary": "Callback request", "outcome": "✅ Follow-up in 30 min" }
}
```

In the component, replace `card.summary` with `t(\`cards.${card.id}.summary\`)` and `card.outcome` with `t(\`cards.${card.id}.outcome\`)`. Add translations for all 6 locales.

---

## Issue 7 — Campaigns Page: Hardcoded English ROI Text (MODERATE)

**File:** `src/app/app/campaigns/page.tsx`

**Problem:** Two ROI display sections use hardcoded English template literals:

**Line 349 (summary ROI):**
```tsx
Cost ~${(...).toFixed(0)} · Revenue ~${(...).toFixed(0)}
```

**Line 462 (per-campaign ROI):**
```tsx
Est. cost ~${(...).toFixed(2)} · Est. revenue ~${(...).toFixed(0)}
```

**Line 467:**
```tsx
Created {new Date(campaign.created_at).toLocaleDateString()}
```

**Fix:**
- Add i18n keys to the `campaigns` namespace:
  ```json
  "roiSummary": "Cost ~${cost} · Revenue ~${revenue}",
  "roiCampaign": "Est. cost ~${cost} · Est. revenue ~${revenue}",
  "createdDate": "Created {date}"
  ```
- Use `t("roiSummary", { cost: ..., revenue: ... })` and `t("roiCampaign", { cost: ..., revenue: ... })`.
- Use `t("createdDate", { date: new Date(campaign.created_at).toLocaleDateString() })`.
- Translate for all 6 locales.

---

## Issue 8 — en.json: Orphaned Flat Dotted Integration Keys (CLEANUP)

**File:** `src/i18n/messages/en.json` lines 3460–3494

**Problem:** Inside the `"settings"` namespace, there are flat dotted keys like:
```json
"integrations.defaultsLoaded": "Defaults loaded.",
"integrations.testSuccess": "Test run complete. See output below.",
"integrations.breadcrumbSettings": "Settings",
...
"integrations.crmFallback": "CRM",
```

These are DUPLICATES of the properly nested `"integrations"` object at lines 3238–3257 which already contains all these values. The flat dotted keys are orphaned and could cause confusion.

**Fix:** DELETE all flat dotted `"integrations.xxx"` keys from en.json lines 3460–3494. The nested object at line 3238 is the authoritative source. Verify no component accesses these via the flat dotted path (they shouldn't — `tSettings("integrations.breadcrumbSettings")` resolves through the nested object).

---

## Issue 9 — es/fr/de/pt/ja.json: Duplicate `integrations` Key in Settings (CLEANUP)

**File:** All non-en locale JSON files

**Problem:** Each non-en locale has TWO `"integrations"` keys at the same level inside `"settings"`:
1. A minimal one near line ~2954 with only `"title"`: `"integrations": { "title": "Integraciones" }`
2. A complete one near line ~3130 with all keys: `"integrations": { "defaultsLoaded": "...", "breadcrumbSettings": "...", ... }`

JSON parsers use the LAST duplicate key, so the second object wins. This means the first one's `title` value is lost if it's not repeated in the second object.

**Fix for each locale:**
- MERGE the two `"integrations"` objects into ONE. Keep the complete object (the one with `defaultsLoaded`, `breadcrumbSettings`, etc.) and ensure it also has the `title` key from the first one.
- DELETE the duplicate minimal `"integrations"` object.
- Verify every key from en.json's nested `"integrations"` object (lines 3238–3257) exists in every locale's merged object.

---

## Issue 10 — Missing Stripe Environment Variables on Vercel (CRITICAL — BLOCKING ALL BILLING)

**Problem:** The following environment variables are COMPLETELY ABSENT from Vercel production. This causes:
- Checkout returns `{ ok: false, reason: "missing_env" }` with HTTP 200 (silently fails — user sees nothing)
- Plan change returns HTTP 503 "This feature is being configured"
- Portal returns `{ ok: false, reason: "missing_env" }` with HTTP 200
- Webhook crashes with undefined STRIPE_SECRET_KEY (non-null assertion)
- No plans can be purchased, changed, or managed. Billing is 100% broken.

**STRIPE_WEBHOOK_SECRET is present** (`whsec_mmav297RF0jRAa8zE7VDFRrlkIuUpIEv`). Twilio vars are present. Only Stripe billing vars are missing.

**Required environment variables to add in Vercel Dashboard → Project Settings → Environment Variables:**

| Variable | Example | Where it's used |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | checkout, change-plan, portal, webhook, stripe-prices |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | StripePricingTable.tsx client embed |
| `STRIPE_PRICE_SOLO_MONTH` | `price_xxxxx` | checkout + change-plan for Starter monthly |
| `STRIPE_PRICE_SOLO_YEAR` | `price_xxxxx` | checkout for Starter annual |
| `STRIPE_PRICE_GROWTH_MONTH` | `price_xxxxx` | checkout + change-plan for Growth monthly |
| `STRIPE_PRICE_GROWTH_YEAR` | `price_xxxxx` | checkout for Growth annual |
| `STRIPE_PRICE_TEAM_MONTH` | `price_xxxxx` | checkout + change-plan for Scale monthly |
| `STRIPE_PRICE_TEAM_YEAR` | `price_xxxxx` | checkout for Scale annual |

**NOTE:** The code uses `solo` internally for "Starter" and `team` for "Scale". See `PLAN_TO_TIER` in `src/app/api/billing/change-plan/route.ts` line 15–19.

**This is NOT a code fix.** These must be added manually in the Vercel Dashboard. The Stripe Price IDs must be created in the Stripe Dashboard first (Products → create recurring prices), then copied to Vercel env vars.

---

## Issue 11 — Webhook + stripe-prices: Non-null Assertion Crash on Missing STRIPE_SECRET_KEY

**Files:**
- `src/app/api/billing/webhook/route.ts` line 83
- `src/lib/stripe-prices.ts` line 73

**Problem:** Both files use `process.env.STRIPE_SECRET_KEY!` (non-null assertion). If the env var is undefined (which it currently is in production), this creates a Stripe client with `undefined` as the key, which will crash or throw cryptic errors when making API calls.

**Current code (webhook line 83):**
```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

**Current code (stripe-prices line 73):**
```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

**Fix for webhook/route.ts:**
The webhook already checks for `webhookSecret` at line 69, but does NOT check for `STRIPE_SECRET_KEY`. Add a guard:
```ts
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  logWebhookEvent("webhook_no_stripe_key", null, "error");
  return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
}
const stripe = new Stripe(stripeKey);
```

**Fix for stripe-prices.ts:**
```ts
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  return { ok: false, reason: "stripe_unreachable" as PriceResolutionReason };
}
const stripe = new Stripe(stripeKey);
```

---

## Issue 12 — Phone Provisioning: No Subscription/Billing Check (SECURITY GAP)

**File:** `src/app/api/phone/provision/route.ts`

**Problem:** The phone provisioning endpoint checks authentication (`getSession` + `requireWorkspaceAccess`) but does NOT verify that the workspace has an active subscription or trial. Any authenticated user can provision phone numbers (which cost $1.50–$2.00/month via Twilio) without ever paying. With Stripe broken (Issue 10), users on expired trials or cancelled subscriptions can still add numbers.

**Fix:** After the auth check (line 28), add a billing status check:

```ts
const db = getDb();

// Check billing status before allowing provisioning
const { data: workspace } = await db
  .from("workspaces")
  .select("billing_status")
  .eq("id", session.workspaceId)
  .maybeSingle();

const status = (workspace as { billing_status?: string } | null)?.billing_status;
if (!status || !["trial", "active"].includes(status)) {
  return NextResponse.json(
    { error: "Active subscription required to provision phone numbers." },
    { status: 403 }
  );
}
```

Move the existing `const db = getDb();` from line 90 up to before this check to avoid creating it twice.

---

## Issue 13 — change-plan Route: Only Supports Monthly Interval (BUG)

**File:** `src/app/api/billing/change-plan/route.ts` line 53

**Problem:** The change-plan endpoint hardcodes `"month"` as the interval:
```ts
const priceResult = await getPriceId(tier, "month");
```

This means users can NEVER switch to an annual plan via the plan change modal. The PricingPreview component offers annual pricing toggle, but the backend ignores it.

**Fix:** Accept `interval` from the request body:
```ts
const interval = (body as { interval?: string }).interval ?? "month";
const priceResult = await getPriceId(tier, interval);
```

Update the body type to include `interval?: string`. The PlanChangeModal should also pass `interval` when calling the API.

---

## Issue 14 — validate-environment.ts: Stripe Keys Are Optional Even When Settlement Enabled

**File:** `src/lib/runtime/validate-environment.ts`

**Problem:** Lines 46–58 only log a warning when STRIPE_SECRET_KEY is missing but settlement is enabled. In production, the `logStructured` function does nothing (line 75: `if (process.env.NODE_ENV === "production") return;`). So in production, missing Stripe keys are completely silent.

**Fix:** Either:
1. Make the production guard in `logStructured` allow warnings through: remove the `if (process.env.NODE_ENV === "production") return;` check, OR
2. Use `console.warn()` directly in the Stripe check block for production visibility, OR
3. Throw an error when STRIPE_SECRET_KEY is missing and settlement is enabled.

At minimum, the warning should be visible in production Vercel logs.

---

## Issue 15 — Checkout Returns HTTP 200 for All Errors (UX BUG)

**File:** `src/app/api/billing/checkout/route.ts`

**Problem:** Every error case returns HTTP 200 with `{ ok: false, reason: "..." }`. This means:
- Missing Stripe key → 200
- Workspace not found → 200
- Customer creation failed → 200
- Subscription creation failed → 200

Client-side code that checks `res.ok` will think the request succeeded. The PlanChangeModal at line 81 checks `!res.ok || !data?.ok`, which handles the `data.ok` case, but any other client that only checks HTTP status will miss errors.

**Fix:** Return appropriate HTTP status codes:
- `missing_env` → 503
- `workspace_not_found` → 404
- `customer_create_failed` → 502
- `subscription_create_failed` → 502
- `invalid_json` → 400
- `workspace_id_or_email_required` → 400

---

## Verification

After completing ALL issues above:

```bash
npx tsc --noEmit    # zero errors
npm run build       # succeeds
```

Then check in browser for each locale (en, es, fr, de, pt, ja):

1. **Dashboard** — Setup checklist items should display in the active locale's language
2. **Billing page** → Click "Change plan" — PlanChangeModal must be fully translated
3. **Billing page** → Upgrade confirmation step — all labels translated
4. **Homepage** → Pricing section — plan names, descriptions, features, CTAs translated
5. **Homepage** → Activity preview widget — card summaries and outcomes translated
6. **Campaigns** → ROI text should be in the active locale
7. **Settings → Phone** — Breadcrumb should show translated "Settings" not raw key
8. **Console** — No `MISSING_MESSAGE` warnings for any key
