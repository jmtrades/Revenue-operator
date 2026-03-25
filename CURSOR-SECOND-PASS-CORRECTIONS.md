# RECALL TOUCH — SECOND PASS CORRECTIONS TO CURSOR PROMPTS

Read this AFTER completing Tasks 1-50. This document fixes gaps and weaknesses in those prompts.

---

## WHAT THE PROMPTS STILL MISSED

### 1. The auth guard checks cookie existence, not validity

`src/app/app/layout.tsx` lines 180-187 check `cookieStore.has("revenue_session")` — this only confirms the cookie EXISTS, not that it is valid, unexpired, or properly HMAC-signed. An attacker could set a fake `revenue_session` cookie with any value and bypass the guard.

**Fix:** After confirming the cookie exists, call `getSessionFromCookie()` from `src/lib/auth/session.ts` to verify the HMAC signature and check expiry. If verification fails, delete the cookie and redirect to /sign-in:

```typescript
const cookieStore = await cookies();
const rawCookie = cookieStore.get("revenue_session")?.value;
if (!rawCookie) {
  redirect("/sign-in");
}
const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
const session = getSessionFromCookie(cookieHeader);
if (!session?.userId) {
  redirect("/sign-in");
}
```

### 2. No CSRF protection on state-mutating API routes

POST/PUT/DELETE routes in `/api/` accept requests from any origin. A malicious site could make a user's browser send authenticated requests to Recall Touch API endpoints. This is especially dangerous for billing routes (checkout, change-plan, cancel) and agent config routes.

**Fix:** Add Origin/Referer header validation on all state-mutating API routes. Check that the Origin header matches `NEXT_PUBLIC_APP_URL`. Reject requests from other origins with 403.

### 3. Blog posts in Task 32 will be AI-generated content

Cursor will generate 10 blog posts of 1,500 words each. These will read like generic AI content unless constrained. Google penalizes thin/duplicative AI content.

**Fix:** Each blog post must include: specific dollar amounts sourced from the ProblemStatement industry data (dental $54,600/year, HVAC $46,800/year, legal $208,000/year), at least one concrete example scenario (not hypothetical), internal links to specific product features (not just /activate), and a unique angle that no other post covers. Do NOT use phrases like "in today's fast-paced world" or "it's no secret that" — these are AI content markers.

### 4. Voice cloning consent (Task 20) has no legal review

The consent checkbox "I confirm I have the right to use this voice recording" is not legally sufficient. Different states have different voice likeness laws (Illinois BIPA, California, Texas).

**Fix:** Consent text should be: "I confirm that (a) this is my own voice or I have written authorization from the voice owner, (b) I understand this voice will be used by an AI to make phone calls on my behalf, and (c) I accept the Voice Cloning Terms of Service." Link to a /terms/voice-cloning page. Store the full consent text version along with timestamp and IP — not just a boolean.

### 5. No database migration strategy

Tasks 2, 6, 12, 20, 24 all add new columns or tables (trial_ends_at, test_call_completed, call quality columns, voice_profiles, sandbox_actions). There is no mention of how these schema changes get applied to the production Supabase database.

**Fix:** For each schema change, create a numbered migration file in `supabase/migrations/`. Apply via `supabase db push` or through the Supabase dashboard. Never modify production schema by running raw SQL in the app code.

### 6. The product tour (Task 23) will break when DOM changes

A tooltip tour that highlights specific DOM elements by selector or position is fragile. If any dashboard component changes layout, the tour breaks silently.

**Fix:** Instead of highlighting DOM elements, use a full-screen overlay with a centered modal for each step. Show a screenshot or illustration of the feature being described. This is more robust and looks more premium than a dotted-border highlight that can misalign.

### 7. No rate limiting on voice clone uploads

Task 20 creates `/api/voice/clone` with file upload but Task 44's campaign safeguards don't cover clone abuse. A user could upload hundreds of audio files to try to extract voice embeddings.

**Fix:** Rate limit clone uploads to 3 per day per workspace. Validate audio file: must be WAV/MP3, 10-30 seconds duration, file size under 5MB.

---

## STRUCTURAL vs COSMETIC — SEPARATED

### Structural (these break things or create liability)

1. Auth guard checks cookie existence, not validity (security hole)
2. No CSRF protection on mutation routes (security hole)
3. Voice cloning consent is legally insufficient (liability)
4. No database migration files for schema changes (deployment risk)
5. Blog content will be AI-detectable filler (SEO penalty risk)
6. No rate limit on voice clone uploads (abuse vector)
7. Campaign launch has no subscription status check (revenue leak — expired users could launch campaigns)
8. Webhook retry (Task 43) has no dead letter queue — after 3 failures, events are just "marked failed" with no recovery path

### Cosmetic (these look bad but don't break operations)

1. Product tour may misalign on DOM changes
2. Loading skeletons are visual polish
3. Settings progressive disclosure is navigation UX
4. Dark theme classes on HeroRevenueWidget (marketing page, not app)
5. Annual discount is 17% vs 20% (minor pricing tweak)
6. Demo page missing screenshots (conversion impact but not structural)

---

## LAUNCH-CRITICAL vs LATER

### Must fix before ANY customer (in the prompts but verify completion)

1. Dunning emails (Task 1) — silent churn without it
2. Trial grace period (Task 2) — abrupt cutoff without it
3. Auth guard validation (NOT in Tasks 1-50 — add now)
4. Empty states (Task 4) — blank screens without them
5. Agent go-live gate (Task 6) — misconfigured agent risk
6. Campaign launch safeguards (Task 44) — add subscription status check

### Important but not launch-blocking

7. PostHog tracking (Task 11)
8. SEO pages and blog (Tasks 28-34)
9. Self-hosted voice (Tasks 13-17)
10. Voice cloning (Task 20)
11. Product tour (Task 23)
12. Loading skeletons (Task 21)

---

## REVISED UI/UX PRIORITIES

The prompts list 50 tasks but don't rank the UX impact. Here is the actual priority by user-experience impact:

**Highest UX impact (do these first within the task list):**
1. Empty states (Task 4) — transforms new-user experience from confused to guided
2. Agent go-live gate (Task 6) — prevents worst possible first impression
3. Error boundary on /activate (Task 5) — prevents white screen on signup crash
4. Cancellation flow (Task 3) — only matters when customers exist, but must work correctly when it does

**Medium UX impact:**
5. Loading skeletons (Task 21) — difference between "prototype" and "product"
6. Settings grouping (Task 22) — reduces overwhelm for new users
7. Product tour (Task 23) — helpful but not essential if empty states are good
8. ROI calculator range selector (Task 7) — perception improvement

**Low UX impact (polish, not essential):**
9. Dark theme cleanup on HeroRevenueWidget (Task 39) — marketing hero card only
10. Pricing page outcome framing (Task 40) — copy improvement
11. Demo page screenshots (Task 41) — conversion improvement
12. Founder photo in footer (Task 10) — trust signal

---

## REVISED BILLING/SUBSCRIPTION SAFEGUARDS

The prompts define dunning and grace period logic but miss these edge cases:

**Edge case 1: User upgrades during trial.** What happens to trial_ends_at? It should be set to null — the user is now on a paid plan. The trial-reminders cron should skip workspaces where stripe_subscription_id is not null.

**Edge case 2: User downgrades mid-cycle.** Stripe handles proration, but the app must immediately update feature gates. A user downgrading from Business to Solo should lose access to outbound campaigns, no-show recovery, and reactivation features at the end of the current billing period — not immediately. Store `downgrade_effective_at` and check it.

**Edge case 3: Workspace has multiple team members and owner cancels.** All team members should see a banner: "This workspace has been cancelled by the owner. Service ends on [date]." Team members should NOT be able to undo the cancellation — only the owner.

**Edge case 4: Overage during grace period.** If a trial-expired workspace is in the 3-day grace period and uses minutes, those minutes should NOT generate overage charges — the user has no active subscription. Track them but do not bill.

---

## REVISED INBOUND/OUTBOUND SAFEGUARDS

**Inbound — the prompts miss this scenario:** What happens when two calls arrive simultaneously for the same workspace? If the workspace has a concurrent call limit (Solo: 2, Business: 10, Scale: 25), the system must: accept calls up to the limit, and for calls beyond the limit, either queue them (if queue support exists) or play a message: "All agents are currently busy. Please hold or leave a message." This is not in any task.

**Fix:** Add concurrent call counting in the Pipecat server. Track active calls per workspace. Reject calls beyond the tier limit with a busy message. Log the rejection as a missed call in needs-attention.

**Outbound — the prompts miss this scenario:** What if a campaign targets 500 contacts but the daily outbound limit is 100? The campaign should execute over 5 days, not fail or send all at once. The process-sequences cron should respect daily limits and carry over remaining contacts to the next day.

**Fix:** In the campaign execution logic, add a daily counter per workspace. When the counter hits the tier daily limit, stop processing for that workspace until the next day. Resume from where it left off.

---

## REVISED VOICE PLAN

The prompts say "all three models fit on one RTX 4090." This is technically true (14GB of 24GB VRAM) but operationally risky:

**Problem 1:** Running TTS, STT, and LLM inference on the same GPU creates contention. When a call comes in, all three models compete for GPU compute. Under load (10+ concurrent calls), latency will spike because the GPU is context-switching between models.

**Fix:** For production, use two GPUs: one for TTS+STT (Kokoro 82M + Canary 1B = 6GB, light compute), one for LLM (Llama 8B = 8GB, heavy compute). Cost: $490/mo for 2x RTX 4090 on RunPod. This is still $0.002/min amortized over 500 customers. Margins stay above 97%.

**Problem 2:** The prompts say "one GPU supports ~500 Business customers." This assumes average concurrent calls of ~5-10 at any time. But during peak hours (9am-12pm), a 500-customer base could have 30-50 concurrent calls. One GPU cannot handle 50 concurrent TTS+STT+LLM inferences without latency degradation.

**Fix:** Add auto-scaling: RunPod Serverless scales GPU instances based on queue depth. Configure to scale from 1 to 4 instances. Base cost: $490/mo (2 always-on). Peak: up to $1,960/mo (4 instances during peak). Still under $4/customer/month at 500 customers.

**Problem 3:** The prompts include a fallback chain (Task 19) but don't define health checks. If the GPU instance crashes, how quickly does the system detect it and switch to cloud APIs?

**Fix:** Pipecat server must expose `/health` endpoint that returns 200 when all models are loaded and responding. The heartbeat cron (every 5 min) should ping this endpoint. If it fails twice: automatically switch all new calls to cloud API fallback (Deepgram + Claude) and alert via Sentry. Resume self-hosted when health check passes again.

---

## REVISED QA/PRODUCTION-READINESS

The prompts define Task 48 as "final verification" but it only checks TypeScript, tests, and build. Missing:

**Add to Task 48:**
1. Verify ALL API routes return proper HTTP status codes for errors (grep for `status: 200` in catch blocks — any found is a bug)
2. Verify NO API route has an empty catch block (`catch {}` or `catch { }` — must at minimum log to console.error or Sentry)
3. Verify NO API route uses `.single()` instead of `.maybeSingle()` for Supabase queries (`.single()` crashes when row doesn't exist — this was a previous bulk fix but new code may have reintroduced it)
4. Verify sitemap.ts includes ALL new pages (outbound, enterprise, new industries, new comparisons, new blog posts)
5. Verify NO `console.log` statements exist in production code (should use logger.ts or be removed)

---

## REVISED SEO REQUIREMENTS

The prompts define metadata rules but miss:

**1. Open Graph images.** Every page should have an og:image. The homepage already has one (/opengraph-image). Every industry page, comparison page, and blog post should have a unique og:image or at minimum reuse the default. Without og:image, social media shares show a blank preview — this kills referral traffic.

**Fix:** For pages that don't warrant custom images, set og:image to the default `/opengraph-image` in page metadata. For blog posts, consider generating simple og:images with the post title on a branded background.

**2. Blog URL structure.** The prompts create 10 blog posts but don't specify URL slugs. Slugs must be keyword-optimized:
- /blog/dental-office-missed-call-revenue (not /blog/article-1)
- /blog/ai-vs-human-receptionist-cost (not /blog/comparison)
- /blog/what-is-ai-revenue-operations (not /blog/guide)

**3. robots.txt verification.** Confirm that robots.txt allows crawling of all public pages and blocks /app/*, /admin/*, /ops/*, /api/*. The sitemap URL should be listed in robots.txt.

---

## REVISED FINAL DECISION STACK

| # | Decision | Answer |
|---|----------|--------|
| 1 | Most critical fix not in either prompt | Auth guard validates cookie existence only, not signature. A fake cookie bypasses all auth. Fix this before anything else. |
| 2 | Most dangerous task to do wrong | Voice cloning (Task 20). Insufficient consent + no legal review = lawsuit under BIPA/state voice laws. Get legal language right. |
| 3 | Most overestimated task | Blog posts (Task 32). Cursor will generate 15,000 words of AI-detectable content unless heavily constrained with specific data points and unique angles. |
| 4 | Most underestimated task | GPU infrastructure for self-hosted voice (Tasks 13-17). Running 3 ML models on shared GPU works in benchmarks, fails under concurrent load. Need 2 GPUs minimum for production. |
| 5 | Biggest gap in both prompts | No database migration files. 5 tasks add columns/tables with no defined migration strategy. First deploy will fail or corrupt data. |
| 6 | Task most likely to break deployment | Task 49 (git commit + push). If ANY task introduced a TypeScript error, build error, or test failure, the push triggers a broken Vercel deploy. Task 48 must genuinely catch ALL issues. |
| 7 | Single best investment of engineering time | Empty states (Task 4). 2 hours of work. Transforms every new user's first experience from "is this broken?" to "I know exactly what to do next." |
| 8 | Single biggest waste of time if done now | Voice cloning (Task 20). Zero customers need it. Build it when a Business-tier customer asks for it, not before. |
| 9 | The real launch blocker | Not a code issue. It is: zero humans have forwarded their real phone number to this system. Until that happens, every feature is theoretical. The auth guard fix and empty states are the only code blockers. Everything else is either working or not yet needed. |
| 10 | What "done" actually means | Auth guard validates properly. Billing works end-to-end (checkout, dunning, grace, cancel). Every /app page has an empty state. Agent cannot go live without test call. One real business is forwarding their number. Weekly digest sends with real data. That is done. Everything else is optimization. |

---

*Apply these corrections to the work produced by Tasks 1-50. The auth guard fix is the highest priority item in this document.*
