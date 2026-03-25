# RECALL TOUCH V13.1 — SECOND PASS: RUTHLESS CORRECTIONS

This document corrects and tightens V13. Read V13 first. This overrides it where they conflict.

---

## WHAT V13 STILL MISSED

### Structural problems disguised as cosmetic

1. **Checkout returns HTTP 200 for ALL errors.** `src/app/api/billing/checkout/route.ts` returns `{ ok: false }` with status 200 for every failure — missing params, missing env vars, workspace creation failure, Stripe errors. The frontend cannot distinguish success from failure via HTTP status. This is not cosmetic. This breaks Stripe redirect flows, error recovery, and retry logic. **Fix: return proper 400/500 status codes for every error path.**

2. **Webhook idempotency relies on catching Postgres error code 23505 as a string.** `src/app/api/billing/webhook/route.ts` catches `(insertError as { code?: string }).code === "23505"` — an unsafe type assertion on a database error. If Supabase changes error format, duplicate events will be processed twice (double charges, double workspace creation). **Fix: use an explicit SELECT-before-INSERT dedup check, not catch-based.**

3. **Billing status has hardcoded plan minutes map.** `src/app/api/billing/status/route.ts` line 58 has `{ solo: 100, business: 500, scale: 3000 }` hardcoded, separate from `billing-plans.ts`. If billing-plans.ts changes, status diverges. **Fix: import BILLING_PLANS and derive limits from the source of truth.**

4. **Phone provisioning has no rate limiting.** `src/app/api/phone/provision/route.ts` lets any authenticated user buy unlimited numbers instantly. A script could purchase 100 numbers in seconds, each billed at $3/mo. **Fix: rate limit to 5 provisioning requests per hour per workspace.**

5. **E.164 phone formatting is naive.** Phone provision trusts user-provided E.164 if it starts with "+", otherwise blindly prepends "+". A number like "+999999999" passes validation. **Fix: validate against a known country code list and expected digit count per country.**

6. **Trial end date calculated in multiple places.** Checkout uses `Date.now() + 14 * 86400000`. Billing status uses `protection_renewal_at OR created_at + 14 days`. These can diverge. **Fix: single source of truth — store `trial_ends_at` on workspace row at creation time, read it everywhere.**

7. **Workspace creation from email is not atomic.** Checkout creates a user, then creates a workspace, then creates a Stripe session. If any step fails, orphaned records remain with no cleanup. **Fix: wrap in a transaction or add cleanup on failure.**

8. **Change-plan accepts both `plan_id` and `planId`.** The API accepts both snake_case and camelCase for the same field without documenting which is canonical. **Fix: accept only `plan_id`, reject `planId` with clear error.**

9. **No auth check on /activate page.** The activate page renders for everyone including already-authenticated users. A logged-in user with an active workspace can re-enter onboarding. **Fix: redirect authenticated users with active workspaces to /app.**

10. **Webhook logging function has empty branches.** `logWebhookEvent()` in webhook/route.ts has no-op error branches — logging never actually fires for some event types. Critical billing events may go unlogged. **Fix: audit every branch, ensure all event types log.**

### V13 was too optimistic about

- **Voice self-hosting timeline.** V13 says "Week 2-3 for Kokoro TTS." Running a GPU inference service in production with <100ms latency, failover, health checks, and auto-scaling is not a 1-week task. Realistic: 4-6 weeks for Phase 2 (Pipecat) alone. Full self-hosted stack: 3-4 months.
- **"Ship to 5 real businesses."** V13 treats this as a simple task. In reality: finding 5 businesses willing to forward their real phone number to an untested system requires personal relationships, free setup calls, hand-holding, and possibly 20-30 outreach attempts.
- **Blog to 15+ articles.** Each needs 1500+ words of genuinely useful content, not AI-generated filler. Realistic: 2-3 articles/week = 5-6 weeks for 15.

---

## STRUCTURAL vs COSMETIC — SEPARATED

### Structural (breaks things, loses money, creates liability)

1. Checkout returns 200 for errors (billing flow broken)
2. No webhook logging in some branches (billing events untracked)
3. Hardcoded plan limits diverge from billing-plans.ts (wrong usage calculations)
4. Phone provisioning has no rate limit (abuse vector)
5. Trial end date calculated inconsistently (trial length varies)
6. Non-atomic workspace creation (orphaned records)
7. No dunning emails (failed payments cause silent churn)
8. No email verification on signup (fake accounts, abuse)
9. No rate limit on signup (trial farming)
10. Auth guard only checks cookie existence, not validity (expired sessions pass)

### Cosmetic (looks bad, hurts conversion, but doesn't break operations)

1. No social proof
2. Industries section only shows 5
3. ROI calculator too far down page
4. No product tour
5. No founder photo
6. Enterprise tier hollow
7. Blog only 6 articles
8. Dark theme inconsistencies in some components
9. "Follow-Ups" label hardcoded (not i18n)
10. FAQ JSON-LD mismatch with component

---

## LAUNCH-CRITICAL vs LATER — SEPARATED

### Launch-critical (must fix before any real customer uses the product)

1. **Fix checkout HTTP status codes** — without this, payment flows are unreliable
2. **Fix billing status plan limits** — import from billing-plans.ts, not hardcoded
3. **Add email verification on signup** — prevent abuse
4. **Add rate limit on signup** — prevent trial farming
5. **Add rate limit on phone provisioning** — prevent abuse
6. **Store trial_ends_at on workspace** — single source of truth
7. **Add dunning emails** — Stripe retry + email on failure
8. **Add trial grace period** — 3 days, banner + calls still answered
9. **Add cancellation survey** — capture churn reason
10. **Validate auth session, not just cookie existence** — check expiry + signature
11. **Test Stripe webhook idempotency** — send duplicate events, verify no double-processing
12. **Test Google Calendar 2-way sync** — end-to-end booking flow
13. **Add error boundary to /activate** — translation failures shouldn't crash onboarding
14. **Ship to 1 real business** — not 5. One is the milestone. Prove the system works.

### Later (important but not launch-blocking)

1. Social proof / case studies
2. Product tour
3. Voice self-hosting (Phase 2+)
4. Blog expansion
5. Agency partner dashboard
6. Push notifications
7. Data export
8. A/B testing
9. Status page
10. Event-driven speed-to-lead

---

## REVISED UI/UX PRIORITIES

V13 listed "dashboard light theme migration" as a priority. After reading globals.css, the dashboard already uses CSS variables (confirmed in UnifiedDashboard.tsx). The only holdout is `HeroRevenueWidget.tsx` which has a few hardcoded zinc/white classes on the marketing hero card — NOT the app dashboard. **Remove dashboard theme migration from priority list.** It is already done.

**Actual UI priorities for premium feel:**

1. **Onboarding error boundary.** /activate has no error handling. If translations fail or the wizard crashes, users see a white screen. Add Suspense + error boundary with "Something went wrong, try again" fallback.

2. **Empty states everywhere.** When a new user opens Calls, Contacts, Inbox, Campaigns, Analytics — every page must have a purposeful empty state that says what to do next, not a blank screen. Check each page.

3. **Loading skeletons.** Dashboard fetches from `/api/dashboard/summary` — while loading, show skeleton placeholders matching the layout (cards, bars, lists), not a spinner.

4. **Agent setup: validate before go-live.** The 5-step agent wizard should not allow "Go Live" until a test call succeeds. Currently there is no gate. A user could deploy a misconfigured agent.

5. **Billing page: show real plan name and price.** Previous commits noted hardcoded "Starter/$297" — verify this is fixed. The page should pull dynamically from billing status API.

6. **Settings progressive disclosure.** 16+ settings sub-pages are overwhelming. Group into 3 sections: "Your Business" (business, call-rules, hours, industry), "Integrations" (phone, calendar, CRM, webhooks), "Account" (billing, team, compliance, notifications). Show section headers in sidebar, collapse sub-pages.

---

## REVISED BILLING/SUBSCRIPTION SAFEGUARDS

### Checkout flow

```
POST /api/billing/checkout
├─ Validate: workspace_id OR email (400 if neither)
├─ Validate: tier in ["solo","business","scale"] (400 if invalid)
├─ Validate: interval in ["month","year"] (400 if invalid)
├─ Lookup STRIPE_PRICE_* env var for tier+interval (503 if missing)
├─ If workspace_id: verify access (403 if unauthorized)
├─ If email only: lookup or create workspace (ATOMIC)
├─ Create Stripe checkout session with trial_end
├─ Return { url: session.url } with status 200
├─ On ANY error: return proper status code (400/403/500/503), NEVER 200
```

### Webhook flow

```
POST /api/billing/webhook
├─ Verify Stripe signature (400 if invalid)
├─ SELECT FROM webhook_events WHERE stripe_event_id = event.id
├─ If exists: return 200 (already processed)
├─ INSERT webhook_events (catch unique violation = return 200)
├─ Handle event:
│   ├─ checkout.session.completed → activate workspace, set plan
│   ├─ customer.subscription.updated → update plan tier
│   ├─ customer.subscription.deleted → mark workspace cancelled
│   ├─ invoice.payment_failed → send dunning email, increment failure count
│   └─ invoice.payment_succeeded → reset failure count
├─ Log ALL events to system_webhook_events (no empty branches)
├─ On handler error: return 500 (Stripe retries), log to Sentry
```

### Dunning sequence

```
Payment fails → Email: "Payment failed. Update method." → Stripe retries day 1
Retry fails → Email: "Second attempt failed. Service pauses in 5 days." → Day 3
Retry fails → Email: "Final notice. Update payment now." → Day 5
Retry fails → Pause workspace (status='payment_failed'). Banner in app. → Day 7
Reactivation: Update payment → Stripe charges → workspace unpaused automatically
```

### Trial lifecycle

```
Signup → workspace.trial_ends_at = NOW() + 14 days
Day 1: check-in email
Day 3: nudge with stats
Day 7: weekly digest (revenue recovered)
Day 10: in-app banner "Trial ends in 4 days"
Day 12: email with revenue summary + upgrade CTA
Day 14: trial_ends_at reached → status='trial_expired'
  Grace: 3 days. Calls still answered. Banner: "Trial ended. Upgrade to continue."
Day 17: status='expired'. Calls stop. Reactivation email.
Day 47: Data deleted (30 days after expiry). Warning email at day 37.
```

---

## REVISED OUTBOUND/INBOUND SAFEGUARDS

### Phone provisioning

```
POST /api/phone/provision
├─ Rate limit: 5 requests/hour per workspace (429 if exceeded)
├─ Validate E.164: must match /^\+[1-9]\d{6,14}$/ (RFC standard)
├─ Validate country code against SUPPORTED_PHONE_COUNTRIES
├─ Check workspace phone count < tier limit (or unlimited on all tiers)
├─ Purchase via Telnyx API
├─ On purchase success: INSERT phone_numbers with status='active'
├─ On purchase failure: return 502 with provider error (DO NOT swallow)
├─ Billing: create Stripe invoice item for setup fee ($1)
```

### Outbound campaign launch safeguards

```
Before launching ANY campaign:
├─ Verify workspace has active subscription (not trial_expired, not paused)
├─ Verify workspace has at least 1 active phone number
├─ Verify workspace has outbound settings configured
├─ Verify campaign audience count > 0 and < tier daily limit
├─ Verify all contacts in audience have opted in (or are manual uploads with consent)
├─ Verify sequence has at least 1 step with valid template
├─ Show confirmation modal: "{X} contacts will be contacted starting {date}. Estimated cost: {minutes * overage_rate}. Confirm?"
├─ On launch: set campaign.status = 'active', schedule first batch
├─ If any check fails: show specific error, do not launch
```

### Inbound call failure handling

```
Call arrives → Pipecat/Vapi answers
├─ If voice service unavailable: play pre-recorded "We're experiencing technical difficulties. Please leave a message after the tone." → record voicemail → create needs-attention item
├─ If LLM times out (>5s): "I apologize, I'm having trouble understanding. Let me transfer you." → transfer to human or voicemail
├─ If booking fails (calendar API error): "I'd love to book that for you. Let me have someone call you back to confirm." → create needs-attention item
├─ If call drops mid-conversation: auto-SMS within 60s: "Sorry we got disconnected. Can we call you back?"
├─ Every call failure: log to Sentry, increment workspace error counter, alert if >5 failures/hour
```

---

## REVISED VOICE PLAN

V13 said "Week 2-3 for Kokoro TTS." That is unrealistic. Revised:

### Phase 1 (Now — Month 0): Stay on current stack

Vapi + Deepgram + Claude + Twilio at $0.099/min. This works. Ship product. Get customers. Do not touch voice until you have 10+ paying customers providing real call data to benchmark against.

### Phase 2 (Month 2-3): Replace Vapi with Pipecat

This is the single biggest cost saving ($0.035/min eliminated). Pipecat is open source and battle-tested. Deploy as Docker container on Fly.io. Connect to existing Deepgram + Claude + Twilio APIs. Takes 2-4 weeks of focused engineering. Quality gate: A/B test 100 calls, measure answer latency (<3s), transcription accuracy (WER), caller stay rate. Roll back instantly if quality drops.

### Phase 3 (Month 4-6): Self-host TTS (Kokoro)

Deploy Kokoro 82M on RunPod. Single L4 GPU. Build gRPC service for Pipecat integration. Generate 6 voice presets. Quality gate: blind comparison of 50 calls between Kokoro and Deepgram Aura-2. Only deploy if quality is indistinguishable. Keep Deepgram as fallback for 30 days after rollout.

### Phase 4 (Month 6-8): Self-host STT (Canary)

Same pattern. Deploy, test, fallback. Only proceed after TTS is stable for 60 days.

### Phase 5 (Month 8-12): Self-host LLM (Llama 3 8B)

Highest risk phase. LLM quality directly impacts booking accuracy and customer satisfaction. Implement confidence routing: Llama handles 90% of turns, Claude Haiku fallback for complex conversations. Only proceed after extensive A/B testing with real customer calls. Keep Claude as permanent fallback — never go 100% self-hosted on LLM.

### Phase 6 (Month 3, parallel): Telnyx migration

Can happen independently of voice self-hosting. Replace Twilio SDK with Telnyx. Port numbers. Save 60% on telephony. Low risk, straightforward.

**Key rule: never migrate two voice components at the same time.** One change, one A/B test, one rollout, one month of stability, then the next.

---

## REVISED QA/PRODUCTION-READINESS

### Top 20 exact test cases (launch-critical, not generic)

1. **Checkout: error returns proper HTTP status.** POST with missing params → 400, not 200.
2. **Checkout: Stripe session created with correct trial_end.** Verify trial_end = 14 days from now.
3. **Webhook: duplicate event rejected.** Send same event twice → second returns 200, workspace not double-modified.
4. **Webhook: invoice.payment_failed triggers dunning email.** Simulate failure → verify Resend email sent.
5. **Billing status: minutes match billing-plans.ts.** Solo = 100, Business = 500, Scale = 3000. Not hardcoded separately.
6. **Phone provision: rate limited at 5/hour.** Send 6 requests → 6th returns 429.
7. **Phone provision: invalid E.164 rejected.** "+999" → 400. "+1234567890" (valid US) → success.
8. **Trial expiry: workspace paused at day 14.** Set trial_ends_at to past → next cron run sets status='trial_expired'.
9. **Trial grace: calls still answered for 3 days after expiry.** Workspace status='trial_expired', call arrives → still answered with upgrade banner.
10. **Cancellation: survey shown, reason captured.** Click cancel → see survey → select reason → confirm → subscription cancelled at period end.
11. **Campaign launch: blocked without phone number.** Create campaign without phone → launch button disabled with "Connect a phone number first."
12. **Campaign launch: confirmation modal shown.** Click launch → modal with contact count + estimated cost → confirm → campaign starts.
13. **Outbound: respects suppression.** Contact called today → second campaign attempt today → skipped, logged as "suppressed."
14. **Outbound: respects business hours.** Campaign scheduled for 11pm → execution delayed to 9am next day (recipient timezone).
15. **Inbound: answer latency <3s.** Time from ring to AI greeting. Fail if >3s on 95th percentile.
16. **Inbound: booking creates calendar event.** AI books appointment → verify Google Calendar event exists.
17. **Dashboard: revenue_recovered_cents displays correctly.** Insert test data → verify dashboard shows correct USD formatting.
18. **Signup: email verification required.** Sign up → check inbox → click link → account activated. No link = no access.
19. **Auth: expired session redirects to /sign-in.** Set session cookie to expired → navigate to /app → redirect.
20. **Agent go-live: blocked without test call.** Create agent → try to go live → blocked with "Complete a test call first."

### Top 10 fallback behaviors (must implement)

1. Voice service down → pre-recorded message + voicemail
2. LLM timeout → transfer to human
3. Calendar API error → "We'll call you back to confirm"
4. SMS send failure → retry 3x with 30s backoff, then log error
5. Stripe checkout redirect failure → show inline payment form fallback
6. Database query timeout → return cached data with "last updated" timestamp
7. Phone provisioning failure → show error with "Try again in 5 minutes"
8. Campaign sequence step failure → skip step, log, continue to next
9. Contact opt-out during call → immediately stop, mark opted-out, never contact again
10. Webhook processing failure → return 500 (Stripe retries), alert on Sentry

---

## REVISED SEO REQUIREMENTS

### Exact pages needed at launch (not "later")

| Page | URL | Title Tag | H1 | Min Words |
|------|-----|----------|-----|-----------|
| Homepage | / | Recall Touch — AI Revenue Operations | Stop Losing Revenue to Missed Calls and Broken Follow-Up | 800 |
| Pricing | /pricing | Pricing — Recall Touch | Simple Pricing. Serious Results. | 600 |
| Dental | /industries/dental | AI Revenue Recovery for Dental Offices — Recall Touch | Recover Every Dollar Your Dental Office Is Losing | 1500 |
| HVAC | /industries/hvac | AI Revenue Recovery for HVAC Companies — Recall Touch | Stop Losing HVAC Revenue to Missed Calls | 1500 |
| Legal | /industries/legal | AI Revenue Recovery for Law Firms — Recall Touch | Capture Every Legal Intake Call | 1500 |
| vs Smith.ai | /compare/smith-ai | Recall Touch vs Smith.ai — Comparison | Recall Touch vs Smith.ai | 1000 |
| vs Ruby | /compare/ruby | Recall Touch vs Ruby Receptionists — Comparison | Recall Touch vs Ruby | 1000 |
| Security | /security | Security and Compliance — Recall Touch | Enterprise-Grade Security | 800 |
| Results | /results | Customer Results — Recall Touch | Real Results from Real Businesses | 400 (+ placeholder for case studies) |

### Exact schema types required

- `Organization` on all pages (exists)
- `SoftwareApplication` on homepage (exists)
- `FAQPage` on homepage and /pricing (homepage exists, needs fix)
- `LocalBusiness` on each /industries/[slug] page
- `Product` with `AggregateRating` when reviews exist
- `HowTo` on /demo or product pages
- `BreadcrumbList` on all sub-pages

### Exact metadata rules

- Title: `{Page Title} — Recall Touch` (max 60 chars)
- Description: unique per page, 150-160 chars, include primary keyword + CTA
- H1: one per page, matches primary keyword intent
- H2s: section headings, include secondary keywords naturally
- Alt text on all images: descriptive, keyword-relevant
- Canonical: self-referencing on every page
- No index on /app/*, /admin/*, /ops/* (already set in app layout)

---

## REVISED FINAL DECISION STACK

| # | Decision | Answer | Conviction |
|---|----------|--------|-----------|
| 1 | Category | AI Revenue Operations | This is the only framing that justifies $297/mo and spans inbound + outbound + attribution. Everything else is either too narrow (receptionist) or too vague (communication OS). |
| 2 | Homepage message | Stop Losing Revenue to Missed Calls and Broken Follow-Up | Tested. Names the pain. Implies the solution. Does not cap value. Does not limit to one segment. |
| 3 | Wedge | Single-location service businesses (dental, HVAC, legal) at $297/mo | Acute pain, strong ability to pay ($297 < one appointment), fast speed to value, high retention via weekly digest. |
| 4 | Product shape | Answer + Follow Up + Book + Recover + Attribute Revenue, 3 modes | Nobody else does all five. The follow-up engine is the moat. Revenue attribution is the retention lock. |
| 5 | Pricing | Solo $49 / Business $297 / Scale $997 / Enterprise Custom | Correct. Do not lower. Do not add a free tier. Solo exists to capture self-serve demand. Business is the target. |
| 6 | Trust fix | Ship to 1 real customer this week. Get their revenue-recovered data. Put a real number on the homepage. | Not 5 customers. One. One is the milestone. One real proof point beats 100 pages of marketing copy. |
| 7 | Margin move | Pipecat (Phase 2, Month 2-3). Not full self-hosted stack. | Pipecat alone saves $0.035/min per call. At 500 customers that is $8,750/mo saved. Self-hosted TTS/STT/LLM comes later after the business is proven. |
| 8 | Generic signal | Anonymous product with zero customers, zero proof, and examples that cap deal sizes at $650. | Add a founder face. Add one real customer number. Remove the $650 cap from the ROI calculator defaults. Show ranges up to $10K+. |
| 9 | Scale blocker | Billing flow returns 200 for errors. No dunning. No trial grace period. No email verification. These are not features — they are infrastructure that must exist before the first customer. | Fix all 4 before any customer onboarding. |
| 10 | Path to #1 | Own AI RevOps with real revenue data from real customers. Build the weekly digest into an addictive proof-of-value loop. Revenue attribution becomes the switching cost. Agencies scale the base 10x. | Execution speed is the only variable. The product is built. The category is open. The margins are extraordinary. Ship. |

---

*End of V13.1. Structural issues identified. Launch-critical items separated. Timelines made realistic. Billing hardened. Voice plan phased properly. QA made specific. SEO made exact. Decision stack sharpened.*
