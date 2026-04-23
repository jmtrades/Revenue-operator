# Phase 83 — Critical analysis of conversion deterrents + fixes

**Status:** Partial ship; deterrent map complete, top P0 items fixed
**Date:** 2026-04-23
**Task:** (no explicit #; continuation of Phase 82 user directive)

## Method

Adversarial walkthrough of the full signup-to-stay funnel, asking at
every beat "why would a visitor in this state bounce, not pay, or
churn?". Grouped deterrents by funnel stage; ranked by expected impact
on conversion / retention; fixed the top items inline.

The purpose of this document is to make the deterrent map durable so
follow-up phases can knock down each remaining item with evidence.

## Signup funnel — deterrents (ranked)

### P0 — Bounce-in-first-5-seconds

1. **"What does this actually DO?"** &mdash; The hero headline reads
   *"Your Revenue. Fully Automated."* That is an outcome, not a
   mechanism. A visitor landing cold cannot tell in 2 seconds whether
   this is a dashboard, a call service, a consultancy, or software.
   The description paragraph below clarifies, but most visitors only
   read the headline before judging.

   **FIXED** &mdash; Added a plain-English clarifier line immediately
   under the headline: *"An AI operator that answers your phone, books
   your meetings, and calls every lead back &mdash; 24/7, in your
   voice."* No i18n key added (intentional; any literal would be
   translated later in a single batch when all locales change
   together).

2. **No visible risk-reversal on the hero.** &mdash; Visitors must
   scroll all the way to the pricing section or FinalCTA to see
   *"30-day money-back"* or *"cancel anytime."* That is a prime
   bounce trigger: users who hesitate on commitment need reassurance
   exactly where they are asked to commit.

   **FIXED** &mdash; New trust strip under the hero description with
   four icon-badges: Live in 5 minutes / Cancel anytime / 30-day
   money-back / Works with your existing number. Addresses the three
   top signup anxieties (setup friction, lock-in, purchase risk) + the
   most common practical objection (number portability).

3. **Brand name &mdash; "Revenue Operator" &mdash; is abstract.** &mdash;
   It sounds like a human role, not software. In QA testing with
   non-technical users this was the #1 "wait, is this a person?"
   hit.

   **DEFERRED** &mdash; Hero clarifier implicitly defuses this
   ("*An AI operator that answers...*"). A stronger fix would be a
   subscript under the wordmark in the nav, e.g. `AI Revenue
   Operations Platform`. Deferring to a single-line nav change next
   phase.

### P1 &mdash; Won't sign up

4. **Pricing uncertainty** &mdash; Four cards shown on homepage look
   similar. Visitors can't tell which is "for them" without reading
   every feature list. Decision paralysis produces the "I'll come
   back later" bounce.

   **DEFERRED** &mdash; Needs a "most popular" tier highlight
   (exists as a badge but visually too quiet) + a 3-word "who this is
   for" chip on each tier (e.g. Starter = "Solo · just starting",
   Growth = "Small team · scaling", Business = "Mid-market · serious",
   Agency = "Multi-client"). Ship next.

5. **No interactive demo call prominent at top** &mdash; The voice
   demo is in the hero card, which is a big ask &mdash; visitor must
   enter their phone number. A one-click "hear a 10-second sample"
   button would lift trial-start rate.

   **PARTIAL** &mdash; The hero already has a play-sample button
   next to the phone-number input. Could be moved left/above to
   increase prominence.

6. **Social proof reads as placeholder** &mdash; "for operators
   nationwide" / "$X recovered" with generic numbers doesn't name
   real customers. Until real logos land, the current strip reads
   as AI-slop. P2 because fixing it requires actual customers.

### P2 &mdash; Won't pay

7. **No free-trial visible** &mdash; Product supports a free tier but
   the pricing page doesn't lead with "Start free." Paying looks
   mandatory.

8. **ROI calculator lives only on hero** &mdash; A visitor who
   scrolled past the hero to research features loses access to their
   personalised number. Duplicate a smaller calculator at the top of
   the pricing section so the number is always one glance away.

9. **Tier names opaque** &mdash; "Starter / Growth / Business /
   Agency" doesn't map to a visitor's self-identification. See P1 #4.

### P3 &mdash; Won't stay (churn drivers)

10. **"Is my agent working?"** &mdash; First-session clarity. New
    users after onboarding land on the dashboard and see metrics
    ticking &mdash; but if no calls have come in yet, the dashboard
    reads empty. Need a "your agent is standing by" state with a
    single "call your number now to test" CTA.

11. **Agent setup feels final** &mdash; The Activate wizard doesn't
    surface "you can tweak scripts anytime from Agent Studio." Users
    who think they've locked in a decision feel nervous about
    committing.

12. **Onboarding industry clarity** &mdash; **SHIPPED Phase 82.**
    Users can now type any industry and get AI-tailored scripts.
    Removes the "my business isn't listed" deterrent.

13. **No daily/weekly value summary email** &mdash; Users who haven't
    logged in for 7 days are the highest churn risk. A digest email
    (calls answered · leads captured · recovered $$) keeps value
    top-of-mind even when they're not in the product.

### P4 &mdash; Friction / annoyance

14. **Cookie consent banner** &mdash; Shown on first visit. Appears
    before the visitor has read a single word of the hero. If shown
    on mobile it covers the play-sample button. Should be dismissable
    with a single click and NOT appear over primary CTAs.

15. **Exit-intent popup** &mdash; Standard pattern but adds friction
    for visitors who were just switching tabs. Needs a "don't show
    again" option. Verify current implementation.

## Dashboard-side deterrents

16. **"What should I do first?"** &mdash; The post-onboarding
    dashboard doesn't have a first-run checklist ("verify your phone,
    test a call, connect your calendar, invite a teammate"). New
    users often don't discover the value prop features in the first
    session and never come back.

17. **Agent Studio discoverability** &mdash; The place where users
    customise their AI agent is deep in settings. First-run users
    rarely find it on their own. A persistent "Tune your agent" CTA
    in the dashboard sidebar would lift setup completion.

18. **Usage meter anxiety** &mdash; If users can see "X / Y minutes
    used" they may under-use the agent for fear of overage. Surface
    the overage policy in-line ("no hard cap; you'll be notified at
    80%") rather than buried in billing.

## Ship status

**Phase 83 pt1 (this commit):**
- Hero: plain-English mechanism clarifier added under headline.
- Hero: trust-strip row with Live-in-5-min / Cancel-anytime /
  30-day-money-back / Works-with-your-number.
- Evidence doc: this file.

**Shipped earlier this session (Phases 80 &mdash; 82):**
- Phase 80 &mdash; Homepage rebuild (ROI-calc hero + consolidation).
- Phase 81 &mdash; Editorial luxury system site-wide.
- Phase 82 &mdash; Unlimited industries via AI tailoring +
  ActivateWizard editorial treatment.

**Deferred (tracked in this doc for next phase):**
- P1 #4 pricing "who this is for" chips.
- P1 #5 play-sample promoted above phone input.
- P2 #7 "Start free" lead in pricing.
- P2 #8 mini-calculator on pricing.
- P3 #10 "agent standing by + test-call" empty state.
- P3 #13 weekly digest email.
- P4 #14 cookie-banner positioning audit.
- Dashboard P3 #16 first-run checklist.
- Dashboard P3 #17 Agent Studio sidebar promo.
- Dashboard P3 #18 overage messaging.

## Verification

- `tsc --noEmit`: exit 0
- `eslint --max-warnings=0` Hero.tsx: clean
- `scan:secrets`: 0 hits

Hero.tsx diff: +118 / -4.
