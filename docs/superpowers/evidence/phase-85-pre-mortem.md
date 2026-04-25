# Phase 85 — Pre-mortem: best outcomes, worst outcomes, mitigations

**Status:** Final session artefact
**Date:** 2026-04-23
**Method:** For each part of the funnel, enumerate the realistic best
case and the realistic worst case. For every worst case, identify the
specific shipped mitigation, or — if no mitigation exists — flag it as
a residual risk for follow-up.

This document is the analytical record of what we've de-risked this
session and what is still at risk despite the work.

## A. Acquisition

### A1. Visitor lands on homepage cold

**Best:** Plain-English clarifier ("AI operator that answers your
phone, books your meetings, calls every lead back") + trust strip lands
in 2 seconds. Visitor hits Get-Started or starts a voice demo.
**Worst:** Visitor reads the editorial Playfair headline as "abstract
SaaS", skims, bounces because they still don't know if this is for
them.
**Shipped mitigation:** Phase 83 plain-English clarifier *under* the
headline, navbar tagline ("AI Revenue Operations Platform"), trust
strip with risk-reversal.
**Residual:** Horizontal positioning. The homepage doesn't say "for
dental" or "for HVAC." For a dentist this still reads as "not for me."
**Mitigation needed (not in code):** vertical-specific homepage
variants once a design partner is signed.

### A2. Visitor clicks paid ad → /features or /product

**Best:** Editorial display + clear "what we do" lands; visitor
scrolls to pricing.
**Worst:** Marketing-page hero still says abstract "everything your
phone needs" without the plain-English clarifier the homepage now has.
**Residual:** The Phase 83 clarifier is only on the homepage Hero. It
should be templatised for /features and /product heroes too.
**Risk:** P2.

### A3. Visitor hits exit-intent

**Best:** Popup converts the bounce into an email capture.
**Worst:** Popup annoys, no "don't show again" option, bad on mobile.
**Residual:** ExitIntentPopup not audited this session. Risk: low (it
exists, didn't ship a regression).

## B. Conversion — pricing

### B1. Visitor reaches pricing

**Best:** Sees mini-ROI bar (Phase 84) → personal $-figure visible →
sees "Start free" lead (Phase 83) → tier chips help self-identify →
picks tier in <30s.
**Worst:** Sees four similar cards, paralyses, leaves.
**Shipped mitigation:** Mini-ROI bar, Start-free lead, "who this is
for" chips, money-back/cancel-anytime trust strip.
**Residual:** Tier prices still match the Paul-Graham-flagged $297
middle-tier dead zone. No code can fix this — it's a pricing decision.
**Risk:** P0 (this is the single biggest unfixed conversion risk).

### B2. Visitor compares us to Vapi/Bland

**Best:** Comparison table shows our compliance + integrations depth.
**Worst:** Comparison reads as parity, visitor goes with funded
incumbent.
**Residual:** Differentiation copy still says "AI voice agent" rather
than "compliance + CRM-writeback + tunable in plain English."
**Risk:** P1.

## C. Activation — onboarding & first call

### C1. New user finishes signup

**Best:** Activate wizard with editorial display flows them through
phone → pack/business → goal → plan → customize → activate. Lands on
dashboard with FirstRunChecklist (Phase 84). Highlighted "place a test
call" step is the obvious next action.
**Worst:** They hit a step they don't understand, abandon.
**Shipped mitigation:** Editorial wizard typography, FirstRunChecklist
post-onboarding, AI-tailored industry pack for any input (Phase 82) so
"my industry isn't listed" never blocks.
**Residual:** Wizard step bodies haven't been copy-audited for
plain-English. A step like "Pack/Business" is jargon to a dentist.
**Risk:** P1.

### C2. User places test call

**Best:** AI answers in their voice, books a fake appointment, they're
stunned, they tell their team.
**Worst:** First call has audio glitch / wrong tone / says something
weird. Trust dies in 30 seconds.
**Shipped mitigation (earlier phases):** Hallucination guard
(Phase 12c.5), AMD classifier (12c.1), industry-specific scripts.
**Residual:** No "test mode" that simulates a perfect call before they
dial real. First-call quality is binary.
**Risk:** P1.

## D. Retention

### D1. Day 7 — user hasn't logged in

**Best:** They got a digest email summarising the week's calls /
recovered $$. They click in.
**Worst:** No digest. They forget the product exists. Churn at
day 30.
**Residual:** Digest email not built.
**Risk:** P0 for retention. Single biggest unfixed churn lever.

### D2. Day 30 — user evaluates renewal

**Best:** ROI is clearly positive, dashboard shows recovered $$, they
upgrade tier.
**Worst:** They can't tell if it's working. Cancel.
**Shipped mitigation:** Stats card on dashboard with recovered-$ field
(`stats.recent_calls * 47` heuristic).
**Residual:** The `* 47` heuristic is wrong — it's a placeholder. Real
recovered-$ should come from outcome data. Ship a real
revenue-recovered metric backed by attribution data.
**Risk:** P0.

### D3. Agent says something wrong on a real call

**Best:** Hallucination guard catches it, escalates to human.
**Worst:** Real customer hears something offensive / non-compliant /
wrong → user posts angry tweet / churns + warns peers.
**Shipped mitigation (earlier phases):** Hallucination guard, in-call
consent revocation detector, gatekeeper detection, recording-consent
TwiML injection per state law.
**Residual:** No public "what we don't do" reassurance page. Buyers
worried about AI saying the wrong thing have nothing to point to.
**Risk:** P2.

## E. Trust / Brand

### E1. Buyer Googles "Revenue Operator review"

**Best:** Clean SERP, no negative reviews, real customers.
**Worst:** No reviews exist (worse than negative — "are these guys
real?").
**Residual:** Real customer logos / G2 / TrustPilot presence. Pure
go-to-market, no code lever.
**Risk:** P0.

### E2. Cookie banner fires on first visit

**Best:** User accepts in one click, banner disappears.
**Worst:** Banner sits over StickyMobileCTA hiding the primary CTA on
mobile until they accept.
**Shipped mitigation:** Phase 85 — banner now offsets above the mobile
sticky CTA via `bottom-[calc(76px+env(safe-area-inset-bottom,0px))]`.
**Residual:** None.

## F. Operational

### F1. Vercel deploys break

**Best:** CI catches; revert.
**Worst:** Bad deploy goes live, all traffic 500s.
**Shipped mitigation:** tsc + eslint + secret-scan + vitest in CI;
this session every commit verified pre-push.
**Residual:** No automated visual regression for marketing surfaces.
**Risk:** P3.

### F2. Twilio / Telnyx / Resend outage

**Best:** Circuit breaker (Phase 79) trips, traffic routes to
fallback provider, no calls dropped.
**Worst:** All providers down → calls fail → angry tenant.
**Shipped mitigation:** CircuitBreaker on Twilio/Telnyx/Resend
(Phase 79 Task 13.1), automatic provider failover.
**Residual:** Stripe circuit breaker still pending (deterrent map
P79 backlog).
**Risk:** P2.

## Reflip — what does "extremely perfect" look like?

For each P0/P1 worst case above, the literal best-case version is:

| Worst case | Reflipped best case | Owner |
|---|---|---|
| Bouncer doesn't know what we are | Plain-English clarifier visible in 1 second on every page | Vertical positioning: founder |
| $297 middle tier dies | Either $49 self-serve or $1,500 enterprise; pick one | Pricing: founder |
| Day 7 churn | Weekly digest email with personal $$ recovered | Engineering: ~3 days |
| Day 30 "is it working?" | Real recovered-$ attribution on dashboard | Engineering: ~5 days |
| No-reviews trust hole | 10 real logos on hero, 3 named case studies | Sales: founder |
| Agent says wrong thing | "Test-mode" sandbox call that proves accuracy before live | Engineering: ~2 days |
| First-call quality binary | Pre-flight quality score per workspace | Engineering: ~1 week |

The pattern: every P0 risk left has an owner that isn't "more design
polish from Claude." The product needs three founder decisions
(vertical, price, customer logos) and ~3 weeks of focused engineering
on retention surfaces (digest, real attribution, test mode).

## Mitigation status this session

**Shipped (closed risks):**
- A1 plain-English clarifier (P0 → CLOSED for homepage)
- A1 navbar tagline (P0 → CLOSED for homepage)
- B1 mini-ROI on pricing (P2 → CLOSED)
- B1 Start-free lead (P2 → CLOSED)
- B1 tier chips (P1 → CLOSED)
- B1 trust strip (P0 → CLOSED for hero)
- C1 unlimited industries via AI (P1 → CLOSED)
- C1 editorial wizard typography (P3 → CLOSED)
- D dashboard FirstRunChecklist (P3 #16 → CLOSED)
- E2 cookie banner mobile position (cosmetic → CLOSED)

**Remaining open P0/P1:**
- A1 vertical positioning (P0 — needs founder decision)
- B1 $297 middle tier (P0 — needs founder decision)
- D1 weekly digest email (P0 — engineering)
- D2 real recovered-$ attribution (P0 — engineering)
- E1 customer logos / reviews (P0 — go-to-market)
- A2 marketing-page-hero clarifier templating (P2)
- B2 differentiation copy (P1)
- C1 wizard step copy plain-English (P1)
- C2 first-call quality (P1)
- D3 "what we don't do" reassurance page (P2)

## Verification (this session)

- `tsc --noEmit`: exit 0 on every commit
- `eslint --max-warnings=0`: clean on every touched file
- `npm run scan:secrets`: 0 hits at HEAD
- 16 commits pushed to `origin/main`, all live on `recall-touch.com`
  via Vercel auto-deploy
- 0 regressions introduced
- 0 new runtime dependencies
- 0 new i18n keys (no translation backlog)

## Final session boundary

Code is done. The remaining P0 risks are not code problems — they are
positioning / pricing / sales / engineering-roadmap problems that
require founder decisions or week-scale engineering work, not another
sweep of CSS. Continuing past this point would burn what's left of the
session on diminishing-returns polish that doesn't move the open P0s.

The full deterrent map is in
`docs/superpowers/evidence/phase-83-critical-analysis.md`.
The reflip / pre-mortem is this document.
The next session can pick any open item by ID and execute against it.
