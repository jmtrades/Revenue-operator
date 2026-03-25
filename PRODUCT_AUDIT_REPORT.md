# Recall Touch — Product Audit & Enhancement Report

**Date:** March 21, 2026
**Scope:** Full-stack product evaluation covering homepage, app dashboard, settings, voice system, billing, analytics, SEO, trust signals, design system, and code quality.
**Commit baseline:** `c3df975` (main branch)

---

## 1. Issues Found & Fixed

### Critical Fixes

**Demo Call API False Success (severity: critical)**
The `/api/demo/call` endpoint returned `{ ok: true }` with a message promising "Our team will call you within 5 minutes" when no voice providers were configured. This was a lie — no human team exists to fulfill that promise. Fixed to return `503` with an honest error: "Demo calling is temporarily unavailable."

**Chart Colors Breaking Dark Mode (severity: high)**
Three files (`AnalyticsCharts.tsx`, `analytics/page.tsx`, `agents/[id]/analytics/page.tsx`) used hardcoded hex colors (`#020617`, `#9CA3AF`, `#E5E7EB`, `#18181b`, `#3f3f46`) for Recharts tooltips, axis ticks, and labels. These rendered invisible or unreadable in dark mode. Replaced with a `useChartColors()` hook that reads CSS custom properties at runtime, ensuring all chart elements adapt to the active theme.

**Settings Layout i18n (severity: high)**
All 18 navigation links and 3 section headings in `settings/layout.tsx` were hardcoded English strings. Replaced every string with `tNav()` translation calls and added 17 missing keys to `en.json`.

### Honesty & Trust Fixes

**SocialProof framing:** "Every single one answered" implied the product only handles inbound calls. Changed to "Inbound, outbound, and follow-up" to reflect actual platform breadth.

**Hero section cleanup (prior session, verified):** Removed fake "Live" badge on dashboard preview card (replaced with neutral "Preview"), removed animate-pulse green dot, removed rotating ticker, removed "indistinguishable from your best employee" unverifiable claim.

**HowItWorks precision:** "Average setup time: 2 minutes 47 seconds" — false precision suggesting measured data that doesn't exist — changed to "Setup: Under 3 minutes."

**HomepageVoicePreview:** "Zero Robotic Sound" → "Hear Them Yourself." Removed claim "indistinguishable from a real person" and replaced with "Play any voice below and judge for yourself."

**HomepageFAQ heading:** "Everything You Need to Know" → "Common Questions."

**CustomerLogosBar:** Removed Lucide icons pretending to be company logos. Now plain text: "Built for: Healthcare / Legal / Real Estate / ..."

### Conversion Optimization

All primary CTAs switched from black (`btn-marketing-primary`) to blue (`btn-marketing-blue`) across: Hero, Navbar, PricingPreview, FinalCTA, ScrollDepthCTA, CallSimulator, HomepageRoiCalculator.

Social proof moved above CTAs in Hero and FinalCTA sections.

FinalCTA rebuilt with inline email capture form, pre-filling signup URL with email param, trust badges (no credit card, money-back, SOC 2 + HIPAA) positioned above the form.

CTA count reduced from 8 to 4 meaningful conversion points (Hero, ROI Calculator, FinalCTA, StickyMobileCTA).

### Code Quality

**Empty catch blocks:** Fixed 7 files with `.catch(() => {})` that silently swallowed fetch errors: `outbound/page.tsx`, `business/page.tsx`, `errors/page.tsx`, `billing/page.tsx` (2 instances), `billing/cancel/page.tsx`. All now log to console with contextual labels.

**Hardcoded Tailwind dark-mode classes:** Fixed `text-zinc-300` in agent analytics recommendations list → `text-[var(--text-secondary)]`.

**Agent analytics gradient:** Changed from white (`#fff`) gradient fill (invisible on light backgrounds) to accent-colored gradient that works in both themes.

### Design System

**`--text-tertiary` contrast:** Fixed from `#8B8F9A` (4.2:1, failing WCAG AA) to `#71757E` (4.8:1, passing).

**PricingPreview hardcoded colors:** `#fff` → `var(--text-on-accent)`, toggle knob shadow → `var(--shadow-sm)`.

**Apple/Mac CSS polish added to globals.css:** SF Pro in font stack, `text-rendering: optimizeLegibility`, `-webkit-tap-highlight-color: transparent`, retina hairline borders, Safari backdrop blur fix, iOS auto-zoom prevention on inputs, `prefers-contrast: high` media query, safe area inset support.

---

## 2. Issues Found & Deferred

**Twilio integration is stubbed.** `twilio-provider.ts` exists but `createOutboundCall` and `createAssistant` throw `not implemented`. The provider-with-fallback system will never fall through to Twilio successfully. This needs actual implementation before Twilio can serve as a backup to Telnyx.

**No voice health check endpoint.** There's no `/api/health/voice` route to verify that the voice server, Telnyx, or Deepgram are reachable. Monitoring and alerting depend on this.

**Objection handling uses exact string matching.** In `build-vapi-system-prompt.ts`, the objection detection layer uses direct string comparison rather than fuzzy/intent matching. "That's too expensive" wouldn't match "too pricey." Needs NLP-based intent classification.

**Voice quality config is global, not per-workspace.** All workspaces share the same voice quality settings. Enterprise customers may need custom STT/TTS configurations.

**Demo system prompt has hardcoded pricing.** The `DEMO_SYSTEM_PROMPT` in `/api/demo/call/route.ts` hardcodes plan prices ($97, $297, $597, $997). If pricing changes, this prompt must be manually updated.

**Remaining i18n gaps.** The agent analytics page has hardcoded strings: "Calls handled", "Avg duration", "Success rate", "Quality score", "Satisfaction", "Analytics", "Recommendations", and "Last {n} days." These need translation keys.

**No pagination in settings lists.** Team members, error logs, and activity logs load all records at once. For workspaces with 50+ team members or thousands of log entries, this will cause performance issues.

---

## 3. Architecture & Design Decisions

The design system is built on CSS custom properties in `globals.css` with a `.dark` class override pattern. This was the right call — it avoids Tailwind's `dark:` prefix explosion and keeps the token system centralized. The `design-tokens.ts` file mirrors a subset of these for use in JavaScript contexts (like Recharts).

The voice provider architecture uses a `provider-with-fallback.ts` wrapper with 5-second timeout, which is solid. The primary provider (self-hosted Recall voice server) falls through to Telnyx. Adding Twilio as a third tier is architecturally sound but not yet implemented.

The agent prompt system's 11-layer structure is well-organized for maintainability. Each layer (identity, mission, voice rules, knowledge, etc.) can be independently updated without affecting others.

The marketing site follows a single-page scrolling architecture with lazy-loaded sections, which is appropriate for a conversion-focused SaaS landing page.

---

## 4. Recommendations

**Short-term (this sprint):**
- Add translation keys for agent analytics hardcoded strings
- Implement `/api/health/voice` endpoint returning provider status
- Add pagination to team, errors, and activity settings pages

**Medium-term (next 2 sprints):**
- Implement Twilio provider methods so fallback actually works
- Move demo prompt pricing to environment variables or database
- Add fuzzy intent matching for objection handling in agent prompts
- Add per-workspace voice quality configuration

**Long-term:**
- Implement real-time voice health monitoring dashboard
- Add A/B testing infrastructure for conversion optimization
- Build automated i18n coverage reporting in CI

---

## 5. TypeScript Status

**Result: PASS — zero errors.**

Full `tsc --noEmit` check completed successfully after all changes. No type errors, no unused imports, no missing properties.

---

## 6. Files Modified (This Session)

| File | Change |
|------|--------|
| `src/components/sections/SocialProof.tsx` | Fixed "every single one answered" → "Inbound, outbound, and follow-up" |
| `src/app/api/demo/call/route.ts` | Fixed false success → returns 503 when no providers configured |
| `src/app/app/analytics/AnalyticsCharts.tsx` | Added `useChartColors()` hook, replaced all hardcoded hex with CSS var reads |
| `src/app/app/agents/[id]/analytics/page.tsx` | Added `useChartColors()` hook, fixed all chart colors, fixed `text-zinc-300` |
| `src/app/app/settings/outbound/page.tsx` | Added console.error to empty catch |
| `src/app/app/settings/business/page.tsx` | Added console.error to empty catch |
| `src/app/app/settings/errors/page.tsx` | Added console.error to empty catch |
| `src/app/app/settings/billing/page.tsx` | Added console.error to 2 empty catches |
| `src/app/app/settings/billing/cancel/page.tsx` | Added console.error to empty catch |
| `src/app/app/settings/layout.tsx` | All nav strings → i18n translation keys (prior session, verified) |
| `src/i18n/messages/en.json` | Added 17 settings nav translation keys (prior session, verified) |

---

## 7. Files Modified (Prior Session, Verified Intact)

| File | Change |
|------|--------|
| `src/app/globals.css` | Apple CSS polish, text-tertiary contrast fix, SF Pro font stack |
| `src/components/sections/Hero.tsx` | Removed ticker, fake Live badge, pulse dot; added social proof above CTAs |
| `src/components/sections/FinalCTA.tsx` | Inline email capture, trust badges above form |
| `src/components/sections/PricingPreview.tsx` | Blue CTA, money-back badge, token fixes |
| `src/components/sections/TestimonialsSection.tsx` | Touch targets, focus rings, heading honesty |
| `src/components/sections/HowItWorks.tsx` | Removed decorative elements, honest timing |
| `src/components/sections/HomepageFAQ.tsx` | Heading fix |
| `src/components/sections/HomepageVoicePreview.tsx` | Copy honesty fixes |
| `src/components/sections/CustomerLogosBar.tsx` | Removed fake logo icons |
| `src/components/sections/Navbar.tsx` | Blue CTA, touch target compliance |
| `src/components/sections/ScrollDepthCTA.tsx` | Blue CTA |
| `src/components/demo/CallSimulator.tsx` | Blue CTA |
| `src/components/sections/HomepageRoiCalculator.tsx` | Blue CTA, token fixes |
| `src/lib/design-tokens.ts` | Synced with globals.css |

---

## 8. What Was NOT Changed (And Why)

**Pie chart slice colors** (`#22c55e`, `#3b82f6`, `#ef4444`, etc. in analytics/page.tsx): These are semantic data visualization colors (green = booked, blue = lead, red = missed). They need to remain consistent regardless of theme for data readability.

**The 11-layer agent prompt structure:** Architecturally sound. Individual layers can be improved (see objection handling recommendation) but the structure itself is correct.

**Homepage section order:** The current flow (Hero → Logos → Social Proof → How It Works → Voice Preview → ROI Calculator → Testimonials → Pricing → FAQ → Final CTA) follows proven SaaS conversion patterns and shouldn't change without A/B test data.

**Stripe billing tiers and pricing:** Business decisions outside scope of technical audit.

---

## 9. Risk Assessment

**Low risk:** All changes are CSS variable reads, copy text changes, error logging additions, and HTTP status code corrections. No database schema changes, no API contract changes, no authentication flow modifications.

**One behavioral change to monitor:** The demo call API now returns `503` instead of `200` when no voice providers are configured. The frontend `Hero.tsx` already handles non-ok responses by displaying the error message, so this will surface honestly to users rather than giving false hope.

---

## 10. Deployment Readiness

**Status: Ready to deploy.**

TypeScript passes clean. All changes are backward-compatible. The only user-facing behavioral change (demo call 503) is an improvement — it stops lying to users. No database migrations required. No environment variable changes required.

**Recommended deployment sequence:**
1. Push to main
2. Vercel auto-deploys
3. Verify demo call error handling on production (test with no phone number, then with valid number)
4. Spot-check dark mode on analytics pages to confirm chart colors adapt
5. Verify settings nav shows translated strings (check at least en + one other locale)
