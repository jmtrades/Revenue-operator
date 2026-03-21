# Recall Touch — Internal Evaluation Memo

**Date:** March 21, 2026 | **TypeScript:** Clean (0 errors) | **Branch:** main

---

## 1. What Is Now Strong

**Voice infrastructure is production-grade.** RecallVoiceProvider creates real assistants, places real outbound calls via Telnyx, handles webhooks, and has a working fallback system. The 11-layer agent prompt builder is well-architected and fully customizable per workspace.

**Auth and billing are complete.** Signup, signin, session management, Stripe subscriptions, phone number provisioning (Telnyx), and email notifications (Resend) are all real implementations with proper rate limiting and error handling.

**Design system is honest and consistent.** CSS custom property foundation with proper dark mode support. All marketing claims have been audited — fake "Live" badges, unverifiable percentages, false-precision stats, and pulsing-dot theater have been removed. Every CTA is blue, conversion flow is streamlined (4 CTAs max), trust badges sit above forms.

**Chart dark mode now works.** Both analytics pages use `useChartColors()` hook that reads CSS variables at runtime. No more invisible text or unreadable tooltips in dark mode.

**Social proof is centralized.** `SOCIAL_PROOF` constant in `constants.ts` feeds Hero, SocialProof, FinalCTA, HomepageTrustBar. One place to update when numbers change.

**Email capture persists before redirect.** FinalCTA now POSTs to `/api/leads/capture` before sending users to signup. Leads are no longer lost if users bounce.

**CRM sync no longer lies.** Sync jobs are marked `pending_integration` with action `skipped` instead of `completed`. Dashboards won't show false sync success.

**Dead links fixed.** `/book-demo` → `/demo`. Pricing CTAs now pass `?plan=growth` (etc.) so user intent survives the signup redirect.

---

## 2. What Is Still Risky

**CRM integrations are non-functional.** HubSpot, Salesforce, Pipedrive are UI options with zero backend. Customers who enable them will see "synced" statuses with nothing actually pushed. The sync engine now correctly marks jobs as pending, but the customer-facing UI may still be misleading.

**Session security degrades silently.** If `SESSION_SECRET` is missing from env, `signin/route.ts` returns 200 with `session: "missing"` — all `/app/` routes become effectively public. No warning, no alert.

**SOC 2 and HIPAA claims have no backing links.** Trust badges on Hero, FinalCTA, Footer, CompetitorComparison assert compliance with no verification URL. If challenged, there's nothing to point to.

**`human-voice-defaults.ts` still contains the 90% claim** in code comments (lines 8 and 193). These propagate to system prompt documentation. Not user-facing, but a source of future copy-paste into marketing.

**PricingContent.tsx and PricingTestimonials.tsx** still have hardcoded `12,400+` strings not yet migrated to `SOCIAL_PROOF` constant. Lower risk but will drift.

---

## 3. What Absolutely Must Be Checked Manually

1. **Demo call end-to-end on production.** Call the demo number after deploy. Verify the 503 error renders properly when providers are unconfigured. Verify the actual call connects when providers ARE configured.

2. **Dark mode analytics.** Open `/app/analytics` and `/app/agents/{id}/analytics` in dark mode in a real browser. Verify chart axes, tooltips, and legends are readable.

3. **Pricing plan param flows through.** Click a pricing tier CTA, verify the URL has `?plan=growth` (or equivalent), verify the signup page reads and uses it.

4. **Email capture fires.** Submit an email in FinalCTA, open browser Network tab, confirm `/api/leads/capture` POST returns 200 before redirect.

5. **Settings nav translations.** Switch locale to `es` or `fr`. Navigate to `/app/settings`. Verify sidebar nav labels are translated, not showing raw keys.

6. **CRM sync UI.** Enable a CRM integration in settings, trigger a sync, check what the sync log page shows. Verify it does NOT say "completed" — should show pending/skipped status.

---

## 4. What Still Should Not Be Considered Finished

**i18n coverage is partial.** HomepageFAQ (11 Q&A pairs), Footer industry names, CompetitorComparison, billing page strings, agent analytics KPI labels, and the features page — all still hardcoded English. The site claims 6 locales. Any non-English user sees broken mixed-language pages in these sections.

**Cancellation flow is broken.** `billing/cancel/page.tsx` walks through a 4-step cancellation wizard but every step calls `handlePauseCoverage()` instead of an actual cancellation handler. Users who try to cancel can't.

**Compliance export is a stub.** The export button in compliance settings shows a toast but generates no file.

**Team management is display-only.** Invites work. Changing roles, removing members — no functionality.

**No cookie consent mechanism.** PostHog and Vercel Analytics fire on page load in EU markets with no opt-in.

**Twilio provider is stubbed.** `createOutboundCall` and `createAssistant` throw "not implemented." The fallback chain breaks if Telnyx goes down.

**Demo voice page and `demo/voice/page.tsx`** still have 3 hardcoded `12,400+` / `8.7M+` instances not migrated to `SOCIAL_PROOF`.

---

## 5. Final Recommendation Before Broader Rollout

**Deploy what's here now.** The fixes are backward-compatible, TypeScript is clean, and the behavioral changes (demo 503, sync status, email capture) are all improvements. Nothing regresses.

**Before any paid marketing spend, fix these 4 things:**

1. **Cancellation flow** — a product that charges $97–$997/mo and can't be cancelled is a chargeback and trust liability
2. **Cookie consent** — GDPR exposure in EU markets, straightforward to add
3. **CRM integration UI** — either hide the options entirely or add clear "Coming Soon" labels instead of letting users configure a sync that does nothing
4. **SOC 2 / HIPAA links** — either add verification URLs or remove the claims from trust badges; asserting compliance without proof is worse than not mentioning it

Everything else (i18n gaps, team management, Twilio fallback, compliance export) is real work that can ship incrementally without blocking revenue.
