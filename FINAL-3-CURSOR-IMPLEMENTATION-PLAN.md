# RECALL TOUCH — FINAL IMPLEMENTATION PLAN FOR CURSOR

Read FINAL-1-AUDIT-AND-STRATEGY.md and FINAL-2-PRODUCT-AND-UX-SPEC.md first. This document tells you exactly what to build and in what order.

---

## TECH STACK (Do not change. Do not introduce alternatives.)

Next.js 16.1.6 App Router. React 19.2.3. TypeScript 5. Tailwind CSS 4 (@theme directives in globals.css, NOT tailwind.config.js). Supabase PostgreSQL + RLS. Stripe 20.3.1. Framer Motion 12.35.2. Lucide React 0.575.0. Recharts 3.8.0. @xyflow/react 12.10.1. @dnd-kit. next-intl 4.8.3. Resend. PostHog. Sentry 10.44.0. Sonner 2.0.7. Zod 4.3.6. date-fns 4.1.0.

**Forms:** Native React state + Zod. NO react-hook-form.

**NO middleware.ts.** Auth guard is in `src/app/app/layout.tsx` (server component redirect). Do not create a middleware.ts file. It breaks Vercel deployment with Next.js 16 Turbopack (ENOENT on middleware.js.nft.json).

**billing-plans.ts is the SINGLE source of truth** for all tier data. Never hardcode tier names, rates, or limits in any other file.

**529 tests must stay green.** Run tests before and after changes.

---

## PHASE 1: STRUCTURAL FIXES (Week 1 — before any customer)

These are not features. They are infrastructure that must exist for billing, auth, and onboarding to function correctly. Do them in this exact order.

### Fix 1: Checkout HTTP status codes

**File:** `src/app/api/billing/checkout/route.ts`

Every error path currently returns `NextResponse.json({ ok: false, ... }, { status: 200 })`. Change every error response to use the correct HTTP status:
- Missing params → 400
- Unauthorized → 403
- Missing env var (STRIPE_SECRET_KEY, NEXT_PUBLIC_APP_URL) → 503
- Stripe API error → 502
- DB error → 500
- Success → 200 with `{ url: session.url }`

### Fix 2: Billing status plan limits

**File:** `src/app/api/billing/status/route.ts`

Find the hardcoded plan minutes map (around line 58). Delete it. Replace with:

```typescript
import { BILLING_PLANS, type PlanSlug } from "@/lib/billing-plans";

const planMinutes = BILLING_PLANS[tier as PlanSlug]?.includedMinutes ?? 400;
```

### Fix 3: Store trial_ends_at on workspace

**File:** `src/app/api/billing/checkout/route.ts` (workspace creation section)

When creating a workspace, store `trial_ends_at`:

```typescript
const trialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString();
// Include in workspace INSERT:
// trial_ends_at: trialEndsAt
```

Then update `src/app/api/billing/status/route.ts` to read `trial_ends_at` from the workspace row instead of calculating it.

### Fix 4: Webhook dedup — SELECT before INSERT

**File:** `src/app/api/billing/webhook/route.ts`

Before the INSERT into webhook_events, add:

```typescript
const { data: existing } = await db
  .from("webhook_events")
  .select("id")
  .eq("stripe_event_id", event.id)
  .maybeSingle();
if (existing) {
  return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
}
```

Keep the INSERT with catch as a secondary safety net, but the SELECT is the primary dedup.

### Fix 5: Email verification on signup

**File:** `src/app/api/auth/signup/route.ts`

After creating the Supabase auth user, the user should receive a verification email. Set `emailRedirectTo` in Supabase auth config. Add a check in the auth guard (`src/app/app/layout.tsx`): if user exists but email is not verified, redirect to `/verify-email` page instead of `/sign-in`.

Create `src/app/verify-email/page.tsx`: "Check your inbox. We sent a verification link to {email}. [Resend]"

### Fix 6: Rate limit on signup

**File:** `src/app/api/auth/signup/route.ts`

Add rate limiting: 5 signups per IP per hour.

```typescript
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
const ip = getClientIp(req);
const rl = await checkRateLimit(`signup:${ip}`, 5, 3600_000);
if (!rl.allowed) {
  return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
}
```

### Fix 7: Rate limit on phone provisioning

**File:** `src/app/api/phone/provision/route.ts`

Add: 5 provisioning requests per hour per workspace.

```typescript
const rl = await checkRateLimit(`phone-provision:${workspaceId}`, 5, 3600_000);
if (!rl.allowed) {
  return NextResponse.json({ error: "Too many provisioning attempts" }, { status: 429 });
}
```

### Fix 8: Change-plan — accept only plan_id

**File:** `src/app/api/billing/change-plan/route.ts`

Remove acceptance of `planId`. Only accept `plan_id`:

```typescript
const plan_id = body.plan_id;
if (!plan_id || typeof plan_id !== "string") {
  return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
}
```

### Fix 9: Onboarding error boundary

**File:** `src/app/activate/page.tsx`

Wrap the ActivateWizard component in an error boundary:

```tsx
import { TranslatedErrorBoundary } from "@/components/ErrorBoundary";

export default async function ActivatePage() {
  return (
    <TranslatedErrorBoundary>
      <ActivateWizard />
    </TranslatedErrorBoundary>
  );
}
```

### Fix 10: Dunning emails

**File:** `src/app/api/billing/webhook/route.ts`

In the `invoice.payment_failed` handler, send an email via Resend:

```typescript
case "invoice.payment_failed": {
  const invoice = event.data.object;
  const workspaceId = await getWorkspaceIdByCustomer(invoice.customer);
  if (workspaceId) {
    await sendDunningEmail(workspaceId, invoice.attempt_count);
    // If attempt_count >= 4: update workspace status to 'payment_failed'
  }
  break;
}
```

Create `src/lib/email/dunning.ts` with templates for attempts 1, 2, 3, and 4.

---

## PHASE 2: CONVERSION IMPROVEMENTS (Week 2-3)

### Task 1: Homepage section reorder

**File:** `src/app/page.tsx`

Move `<HomepageRoiCalculator />` to after `<ProblemStatement />` and before `<HowItWorks />`.

### Task 2: ROI Calculator — remove deal-size cap

**File:** `src/components/sections/HomepageRoiCalculator.tsx`

Replace the average job value slider (currently $50-$5,000 with $650 default) with a range selector: $200, $500, $1,000, $2,500, $5,000, $10,000+. Default to $1,000. This prevents the product from looking like it is only for small jobs.

### Task 3: Expand Industries section

**File:** `src/components/sections/Industries.tsx`

Add 3 more industries: Roofing, Med Spa, Recruiting. Total: 8 + custom = 9 cards.

### Task 4: Create /results page

**File:** `src/app/results/page.tsx`

Structure: "Real Results from Real Businesses." If no customers yet: "We are onboarding our first customers. Here is what the system is designed to deliver:" with projected metrics by industry. Template for future case studies. CTA: "Start Your Free Trial."

### Task 5: Create /security page

**File:** `src/app/security/page.tsx`

Content from FINAL-2 Section 7. Encryption, access control, rate limiting, compliance, monitoring, data handling.

### Task 6: Fix FAQ JSON-LD in page.tsx

**File:** `src/app/page.tsx`

In the FAQPage JSON-LD schema, update question 3 from "What does 'Revenue Execution OS' mean?" to "How is this different from an AI receptionist?" with the matching answer from HomepageFAQ.tsx.

### Task 7: Empty states for all /app pages

For each page (Calls, Contacts, Inbox, Campaigns, Analytics, Follow-Ups): add a purposeful empty state component that tells the user what to do next. See FINAL-2 Section 2 for exact copy.

### Task 8: Cancellation flow

**File:** `src/app/app/settings/billing/cancel/page.tsx` (create)

Survey modal → save offer → export option → confirmation. See FINAL-2 Section 3 for exact flow. Track cancellation reason in PostHog.

### Task 9: Trial grace period

In the trial-reminders cron (`src/app/api/cron/trial-reminders/route.ts`): when `trial_ends_at` is reached, set status to `trial_expired`. Do NOT immediately stop service. Show banner in dashboard. After 3 additional days, set status to `expired` and stop answering calls.

### Task 10: PostHog event tracking

Add `track()` calls for: signup_started, signup_completed, onboarding_step_completed (each of 5), first_call_received, first_appointment_booked, first_revenue_attributed, upgrade_clicked, plan_changed, campaign_created, campaign_launched, contact_imported, subscription_cancelled.

---

## PHASE 3: VOICE MIGRATION (Month 2-3 — only after 10+ paying customers)

### Phase 2: Pipecat replaces Vapi

Create `services/voice/` directory. Deploy Pipecat pipeline server as Docker container. Connect to existing Deepgram + Claude + Twilio APIs. Quality gate: A/B test 100 calls measuring answer latency (<3s), WER, caller stay rate. Roll back instantly if quality drops. Saves $0.035/min.

### Phase 6 (parallel, Month 3): Telnyx replaces Twilio

Replace Twilio SDK with Telnyx SDK. Port existing phone numbers. Update all telephony endpoints. Saves 60% on telephony.

### Phases 3-5 (Month 4-12): Self-hosted TTS, STT, LLM

Only proceed after Pipecat is stable for 60 days. One component at a time. Each phase: deploy, A/B test 50+ calls, quality gate, 30-day fallback to previous vendor. See FINAL-2 Section 4 for details.

---

## PHASE 4: SCALE FEATURES (Month 3+)

1. Agency partner dashboard with 15% revenue share
2. Event-driven speed-to-lead (replace 2-min poll)
3. Push notifications for needs-attention queue
4. Data export (contacts, calls, analytics to CSV)
5. Case study auto-generation from revenue_recovered data
6. Status page (status.recall-touch.com)
7. Load testing (100 concurrent API requests, 10 concurrent calls)
8. Customer health scoring for churn prediction
9. API documentation page
10. Blog expansion to 15+ articles

---

## WHAT NOT TO BUILD

- **No middleware.ts.** It breaks Vercel deployment.
- **No react-hook-form.** Codebase uses native state + Zod.
- **No dark theme in /app/*.** Marketing pages stay dark. App is light.
- **No new sidebar items.** 9 is correct. Advanced features go under Settings.
- **No additional crons in vercel.json.** 13 is correct. 90 dormant enterprise crons stay dormant.
- **No free tier.** Solo at $49 is the floor.
- **No mobile native app.** Responsive web works. Push notifications are the mobile priority.
- **No turbopack.root in next.config.ts.** It was removed because it caused issues.

---

## BUILD RULES

1. `billing-plans.ts` is the single source of truth for all tier data.
2. All new UI strings must use `t("key")` via next-intl.
3. All /app/* pages use light theme CSS variables from globals.css.
4. 529 tests must stay green after every change.
5. Every error path must return the correct HTTP status code, not 200.
6. Every async function that calls an external service (Stripe, Telnyx, Resend, Deepgram) must have try-catch with Sentry logging.
7. Every user-facing form must have Zod validation.
8. Every API route that mutates data must have rate limiting.
9. Every empty page must have a purposeful empty state.
10. Every loading state must show a skeleton, not a spinner.

---

*Execute Phase 1 first. Test all 10 fixes. Then Phase 2. Ship to 1 customer. Everything else follows.*
