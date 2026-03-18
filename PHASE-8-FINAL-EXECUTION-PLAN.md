# RECALL TOUCH — FINAL EXECUTION PLAN

**Date:** March 17, 2026

---

## WEEK 1: TRUST EMERGENCY

**Goal:** Remove every piece of fabricated content. Make the site honest.

| Task | File(s) | Priority |
|------|---------|----------|
| Delete fake testimonials (both sets) | TestimonialsSection.tsx, all i18n/messages/*.json, demo/voice/page.tsx | CRITICAL |
| Remove "500+" claims | Hero.tsx, HomepageTrustBar.tsx, PricingContent.tsx, demo/voice/page.tsx | CRITICAL |
| Remove "$2.1M+ revenue recovered" | PricingContent.tsx | CRITICAL |
| Change SOC 2 to "SOC 2 in progress" | Footer.tsx, all trust badge locations, PricingContent.tsx | CRITICAL |
| Remove "99.9% uptime" SLA | Footer.tsx, trust sections | CRITICAL |
| Fix Solutions nav links → /industries/* | constants.ts (SOLUTIONS_LINKS) | HIGH |
| Update pricing tiers | constants.ts (PRICING_TIERS), stripe-prices.ts, billing-plans.ts | HIGH |
| Add annual pricing to website | PricingContent.tsx, constants.ts | HIGH |
| Create /about page | New page: src/app/about/page.tsx | HIGH |

**Deliverable:** A website that is honest. Nothing fabricated. Nothing unearned.

---

## WEEK 2: ONBOARDING REDESIGN

**Goal:** Users go from signup to hearing their AI handle a call in 5 minutes.

| Task | Details |
|------|---------|
| Reduce onboarding to 3 steps | Replace current 5-step wizard |
| Build industry selector cards | Large clickable cards with icons (Dental, HVAC, Legal, Med Spa, Roofing, Other) |
| Build industry pack auto-loading | On industry select: load greeting, knowledge base, appointment types, workflow templates |
| Build website scraper for business info | Already exists at /api/onboarding/scrape — integrate into Step 1 |
| Build phone connection step | Three options: forward existing, get new number, skip |
| Build "You're Live" celebration screen | CTA: "Call [number] to test" with phone dialer link |
| Auto-generate AI agent from industry defaults | No manual naming, greeting, or capability selection required |
| Build fallback SMS for users who don't call | 1 hour after signup: "Your AI is ready. Call [number] to hear it." |

**Deliverable:** 3-step onboarding. Industry → Phone → Live. Test call as the aha moment.

---

## WEEK 3: DASHBOARD + INBOX REDESIGN

**Goal:** The dashboard shows revenue impact. The inbox shows every conversation.

| Task | Details |
|------|---------|
| Build RevenueImpactCard | Four metrics: calls, leads, appointments, estimated value. Trend vs. previous period. |
| Build NeedsAttentionList | Action items with urgency colors. Click → contact timeline. |
| Build RecentCallsList | Time, name, outcome, duration. Click → contact detail. |
| Replace current dashboard | Remove capsule data, handoffs, reversion states, retention intercept |
| Build unified contact timeline | Calls + SMS + emails in chronological order per contact |
| Build conversation list panel | Left panel with name, preview, channel icon, time, urgency dot |
| Build inline SMS reply | Text input at bottom of contact timeline |
| Build call playback | Play button on each call entry with audio player |
| Build transcript view | Expandable/collapsible within timeline |
| Build AI summary per call | Auto-generated after call ends |

**Deliverable:** Dashboard that answers "is this worth paying for?" Inbox that shows the full story of every contact.

---

## WEEK 4: FOLLOW-UP ENGINE + SETTINGS

**Goal:** Automated follow-up sequences running. Voice and billing settings accessible.

| Task | Details |
|------|---------|
| Build workflow scheduler | BullMQ + Redis. Processes due workflow_enrollments every 60 seconds. |
| Build follow-up list view | Cards for each workflow: name, trigger, steps, active count, success rate |
| Build linear workflow editor | Trigger → Steps (channel, delay, condition, template) → Stop conditions |
| Pre-populate industry templates | Load from industry pack configs on workspace creation |
| Build voice selector | 6 voice cards with play sample. "Preview with your greeting" button. |
| Build billing/usage page | Plan display, usage meters, billing history, change plan, cancel |
| Build usage tracking | usage_events table populated on every call end and SMS send |
| Build overage calculation | Real-time: current minutes used vs. included, projected overage |
| Build team management | Invite by email, role selection (owner/admin/member) |

**Deliverable:** Follow-up automation live. Voice selection with preview. Transparent billing.

---

## WEEKS 5-8: MARKETING PAGES + VISUAL REDESIGN

| Task | Week |
|------|------|
| Homepage full redesign (new copy, new layout, warm-white design) | 5-6 |
| /pricing page redesign with ROI calculator | 5 |
| /industries/dental landing page | 6 |
| /industries/hvac landing page | 6 |
| /industries/legal landing page | 7 |
| /compare page (vs. Smith.ai, Goodcall, Dialzara) | 7 |
| /results page (beta metrics, case study template) | 7 |
| Analytics page with charts | 8 |
| Calendar view for appointments | 8 |
| Light-mode design system implementation | 5-6 |

---

## MONTHS 3-6: GROWTH ENGINE

| Task | Details |
|------|---------|
| Onboard 10-20 free beta customers | Hand-selected dental, HVAC, legal businesses |
| Document metrics for each | Calls, leads, appointments, revenue impact |
| Create 3-5 real case studies | Specific numbers, real names (with permission) |
| Get G2 listing live | With real reviews from beta customers |
| Get Trustpilot listing live | Same |
| Build email capture on homepage | Lead magnet: "Missed Call Revenue Calculator" |
| Build product walkthrough video | Screen recording of dashboard, inbox, follow-ups |
| Launch outbound sales motion | Target dental practices in top-10 US metros |
| Add real customer logos to trust bar | With permission |
| Build /industries/medspa and /industries/roofing pages | Based on demand |

---

## MONTHS 7-12: PRODUCT EXPANSION

| Task | Details |
|------|---------|
| Solo Mode ($49/mo) | Simplified dashboard, personal follow-up templates |
| Advanced analytics | Trends, benchmarks, team comparison |
| CRM webhook integration | HubSpot, Zapier at minimum |
| Quote chasing workflow | For home services |
| Reactivation campaign builder | 30/60/90 day dormant contact re-engagement |
| Review request automation | Post-appointment Google review prompt |
| Multi-location support | One account, multiple businesses |
| Referral program | "Refer a business, get one month free" |
| Agency/reseller exploration | Scoping, pricing, pilot with 2-3 agencies |

---

## MONTHS 13-24: SCALE

| Task | Details |
|------|---------|
| Sales Mode | Pipeline view, speed-to-lead, setter/closer workflows |
| In-house call orchestration | Replace Vapi. Direct Twilio + Deepgram + ElevenLabs + Claude. |
| API access for Scale+ customers | Developer docs, webhooks, programmatic access |
| White-label for Enterprise | Custom branding, subdomain |
| SOC 2 audit (for real) | Engage auditor, complete Type II |
| Mobile app (native or PWA) | Monitoring and response on the go |
| HIPAA implementation (real) | Technical controls, BAA, audit trail |
| International expansion | UK, Canada, Australia first |
| In-house TTS evaluation | Open-source voice model quality testing |
| Smart LLM routing | Fine-tuned small model for simple calls, Claude for complex |

---

## SUCCESS METRICS

### Month 3 Targets
- 50+ paying customers
- $15K+ MRR
- 5+ real case studies published
- G2 listing with 10+ reviews
- <5% trial-to-churn rate in first 30 days

### Month 6 Targets
- 200+ paying customers
- $60K+ MRR
- NPS > 40
- Follow-up engine recovering measurable revenue for >70% of customers
- Inbound leads from organic/referral > 30% of new customers

### Month 12 Targets
- 600+ paying customers
- $180K+ MRR
- 65%+ gross margin (COGS-only)
- <5% monthly logo churn
- Agency/reseller channel contributing 10%+ of new revenue

### Month 24 Targets
- 3,000+ paying customers
- $900K-1M+ MRR
- In-house call orchestration live (saving $45K+/month)
- SOC 2 Type II certified
- Multiple sales reps, customer success team, product team

---

## THE 10 DECISIONS THAT DEFINE RECALL TOUCH

1. **Category:** AI Revenue Closer — not AI receptionist, not automation, not assistant.

2. **Headline:** "Your phone rings. Then what?" — lead with the gap, not the technology.

3. **Wedge:** Dental practices first. Highest LTV, lowest support, strongest case study narrative.

4. **Product shape:** Follow-up engine is the product. Call answering is the entry point.

5. **Pricing:** Solo $49, Business $297, Scale $997. One recovered call pays for the month.

6. **Trust:** Zero fabrication. Real customers, real metrics, real proof — or nothing.

7. **Retention:** Revenue impact card. "Recall Touch recovered $X for your business this month."

8. **Margin:** Minutes are metered. Overage rates protect economics. Annual plans reduce churn.

9. **Voice:** Keep ElevenLabs for now. Build in-house orchestration at $180K MRR. Evaluate in-house TTS at $500K MRR.

10. **Biggest blocker:** Not features, not pricing, not design. External proof of existence. Fix that first.

---

*All phases complete.*
