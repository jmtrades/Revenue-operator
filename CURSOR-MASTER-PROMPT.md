# HOMEPAGE i18n — 20 section components with hardcoded English

Every homepage section except Hero, Navbar, Footer, SocialProof, and ProblemStatement still has 100% hardcoded English. This is the ONLY remaining work. Fix all 20 files below.

---

## GLOBAL RULES

**Stack**: Next.js App Router · React 19 · TypeScript · next-intl ^4.8.3 · Tailwind CSS v4
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
**Pattern**: `useTranslations("homepage.sectionName")` → `t("key")` = `homepage.sectionName.key` in JSON
**Brand names**: "Recall Touch", "Salesforce", "HubSpot", "HIPAA" etc. — do NOT translate
**Numbers**: "$126K", "80%", "$297", "5 min" — keep the number, translate surrounding text
**For EVERY file below**: (1) Add `import { useTranslations } from "next-intl"` (2) Add `const t = useTranslations("homepage.xxx")` inside the component (3) Replace EVERY hardcoded string with `t("key")` or `{t("key")}` (4) Move any hardcoded arrays/objects inside the component as useMemo using t() (5) Add ALL new keys to `homepage` namespace in ALL 6 locale files with proper native translations

---

## FILE 1: `src/components/sections/HowItWorks.tsx`
Namespace: `homepage.howItWorks`

Replace these hardcoded strings:
- `"How it works"` → `t("label")`
- `"Three steps. Then it runs."` → `t("title")`
- `"Connect"` → `t("steps.connect.title")`
- `"Forward your number or get a new one. Any carrier. Any phone."` → `t("steps.connect.desc")`
- `"Configure"` → `t("steps.configure.title")`
- `"Tell your AI what to do: answer calls, handle texts, book appointments, follow up, qualify leads, or all of it. Use a template or start from scratch."` → `t("steps.configure.desc")`
- `"Done"` → `t("steps.done.title")`
- `"Every call answered. Every lead captured. Every follow-up sent."` → `t("steps.done.desc")`

Move the STEPS array inside the component as `useMemo` using `t()`.

---

## FILE 2: `src/components/sections/HomepageLiveDemo.tsx`
Namespace: `homepage.liveDemo`

Replace these hardcoded strings:
- `"Hear the difference in 30 seconds"` → `t("heading")`
- `"See how your AI handles real situations..."` → `t("subheading")`
- `"Caller"` → `t("cardLabels.caller")`
- `"Your AI"` → `t("cardLabels.agent")`
- `"Result"` → `t("cardLabels.result")`
- `"Sample conversation — your AI handles this 24/7 for any type of business."` → `t("sampleNote")`
- `"Ready to make this your phone line?"` → `t("cta.text")`
- `"Open interactive call demo"` → `t("cta.ariaLabel")`
- `"Start free →"` → `t("cta.button")`

Move the USE_CASES array inside the component. Each use case has label, caller, agent, result:
- Missed call recovery: `t("useCases.missedCall.label")`, `.caller`, `.agent`, `.result`
- Appointment booking: `t("useCases.appointment.label")`, `.caller`, `.agent`, `.result`
- Lead follow-up: `t("useCases.followUp.label")`, `.caller`, `.agent`, `.result`
- After-hours handling: `t("useCases.afterHours.label")`, `.caller`, `.agent`, `.result`
- Call screening: `t("useCases.screening.label")`, `.caller`, `.agent`, `.result`

---

## FILE 3: `src/components/sections/OutcomeCardsSection.tsx`
Namespace: `homepage.outcomes`

Replace these hardcoded strings:
- `"What you get from day one"` → `t("heading")`
- `"Outcomes, not infrastructure. Your AI handles the rest."` → `t("subheading")`
- Card 1: `"Missed calls recovered"` → `t("cards.missedCalls.title")`, description → `t("cards.missedCalls.desc")`
- Card 2: `"Leads captured automatically"` → `t("cards.leads.title")`, description → `t("cards.leads.desc")`
- Card 3: `"Appointments booked on the spot"` → `t("cards.appointments.title")`, description → `t("cards.appointments.desc")`
- `"Simple pricing that matches your revenue"` → `t("pricing.heading")`
- `"No per-seat licenses..."` → `t("pricing.subheading")`
- `"All plans start with a 14-day free trial. No credit card required."` → `t("pricing.trialNote")`
- All pricing tier names, prices, taglines, features, badges → `t("pricingTiers.starter.name")` etc.
- `"Start free trial →"` → `t("cta.button")`

Move OUTCOME_CARDS and PRICING_TIERS arrays inside the component as useMemo.

---

## FILE 4: `src/components/sections/Features.tsx`
Namespace: `homepage.features`

Replace these hardcoded strings:
- `"What it does"` → `t("label")`
- `"Everything your phone communication needs. Nothing it used to cost."` → `t("heading")`
- 11 capability cards — move array inside component. Each gets: `t("capabilities.answersCalls.title")`, `t("capabilities.answersCalls.desc")`, etc.
- Full list: answersCalls, unifiedInbox, outbound, campaigns, books, captures, routing, texting, learns, roi, neverGivesUp

---

## FILE 5: `src/components/sections/UseCaseSection.tsx`
Namespace: `homepage.useCaseSection`

Replace:
- `"One platform. Every call type."` → `t("heading")`
- `"Inbound"` → `t("cases.inbound.title")`, description → `t("cases.inbound.desc")`
- `"Outbound"` → `t("cases.outbound.title")`, description → `t("cases.outbound.desc")`
- `"Intelligence"` → `t("cases.intelligence.title")`, description → `t("cases.intelligence.desc")`
- `"Start free →"` → `t("cta.button")`

Move USE_CASES array inside component.

---

## FILE 6: `src/components/sections/WhoUsesSection.tsx`
Namespace: `homepage.whoUses`

Replace:
- `"Who uses Recall Touch"` → `t("label")`
- `"Built for how you communicate"` → `t("heading")`
- 6 persona cards (solo, growing, agencies, afterHours, outbound, anyone) — each has `.name` and `.desc`
- `"Don't see your use case?..."` → `t("additionalNote")`
- `"Get started →"` → `t("cta.link")`

Move PERSONAS array inside component.

---

## FILE 7: `src/components/sections/MetricsSection.tsx`
Namespace: `homepage.metrics`

Replace:
- `"What if?"` → `t("label")`
- `"The numbers that matter"` → `t("heading")`
- 5 metrics — each has `.value` and `.label`: revenueLost ($126K), answerRate (100%), speedToLead (60 sec), inbox (1 inbox), setupTime (5 min)

Move METRICS array inside component.

---

## FILE 8: `src/components/sections/TestimonialsSection.tsx`
Namespace: `homepage.testimonials`

Replace:
- `"Built for businesses that depend on every call"` → `t("preamble")`
- `"What customers say"` → `t("label")`
- 5 testimonials — each has `.quote`, `.author`, `.role`: amanda, ryan, mike, sarah, james
- `"Trusted by businesses that never miss a call"` → `t("badge")`

Move TESTIMONIALS array inside component.

---

## FILE 9: `src/components/sections/PricingPreview.tsx`
Namespace: `homepage.pricingPreview`

Replace:
- `"Pricing"` → `t("label")`
- `"Plans that pay for themselves."` → `t("heading")`
- `"Monthly"` / `"Annual"` → `t("toggle.monthly")` / `t("toggle.annual")`
- `"Save 17%"` → `t("toggle.savings")`
- `"Popular"` → `t("badge")`
- Tier ROI descriptions (starter, growth, scale, enterprise)
- `"All plans include: encrypted records · compliance framework · audit trail · 14-day free trial"` → `t("footerNote")`
- `"View full plan comparison →"` → `t("cta.link")`

---

## FILE 10: `src/components/sections/WhatMakesUsDifferentSection.tsx`
Namespace: `homepage.difference`

Replace:
- `"What makes us different"` → `t("heading")`
- `"No voicemail. No missed opportunities..."` → `t("subheading")`
- Row 1 — `"Manual answering / voicemail"` + 3 items
- Row 2 — `"Generic voicemail or IVR"` + 3 items
- Row 3 — `"Recall Touch"` + 3 items (keep "Recall Touch" as brand name)

Move COMPARISON_ROWS inside component.

---

## FILE 11: `src/components/sections/EnterpriseComparisonCard.tsx`
Namespace: `homepage.enterpriseComparison`

Replace single hardcoded comparison text → `t("text")`

---

## FILE 12: `src/components/sections/FinalCTA.tsx`
Namespace: `homepage.finalCta`

Replace:
- `"Your AI phone team starts in 5 minutes"` → `t("heading")`
- `"No credit card. Set up in 5 minutes. Answer every call."` → `t("subheading")`
- `"Start free →"` → `t("buttons.start")`
- `"Book a demo →"` → `t("buttons.demo")`
- `"Works for calls, texts, scheduling, follow-ups, and campaigns. One platform."` → `t("note")`
- `"View documentation"` → `t("links.docs")`

---

## FILE 13: `src/components/sections/ScrollDepthCTA.tsx`
Namespace: `homepage.scrollCta`

Replace:
- `"Your next customer could be calling. Ready?"` → `t("message")`
- `"Start free →"` → `t("button")`
- `"Dismiss"` aria-label → `t("dismiss")`

---

## FILE 14: `src/components/sections/TrustStackSection.tsx`
Namespace: `homepage.trust`

Replace:
- `"Trusted by operators who can't afford to miss decisive calls."` → `t("text")`

---

## FILE 15: `src/components/sections/Industries.tsx`
Namespace: `homepage.industries`

Replace:
- `"Industries"` → `t("label")`
- `"See how it works across industries"` → `t("heading")`
- `"Recall Touch adapts to any business..."` → `t("subheading")`
- 5 industries (plumbing, healthcare, legal, realEstate, dental) + custom — each has `.name` and `.desc`

Move INDUSTRIES array inside component.

---

## FILE 16: `src/components/sections/BentoVisuals.tsx`
Namespace: `homepage.bentoVisuals`

Replace all hardcoded strings:
- Timeline labels: "Call", "Follow-up", "Confirm", "Close"
- Compliance record labels: "Governed record", "Jurisdiction", "Verified", "Review depth", "Duration", "Status", "Chain"
- Compliance values: "Standard", "Compliant", "3 verified events"
- Audit trail: "Recorded under declared jurisdiction", "Forwarded without modification", "Audit trail complete"
- Escalation levels: "Agent", "Manager", "Director"
- Channel labels: "Voice", "Message", "Payment"
- `"Single governance layer"` → `t("channelNote")`

---

## FILE 17: `src/components/sections/HomepageActivityPreview.tsx`
Namespace: `homepage.activityPreview`

Replace:
- `"Preview of the Recall Touch activity dashboard"` aria-label → `t("ariaLabel")`
- `"Recall Touch — Activity"` → `t("title")`
- `"Recent calls"` → `t("heading")`
- Type labels: "Lead", "Appointment", "Follow-up"

Move type labels / feed items inside component.

---

## FILE 18: `src/components/sections/ActivityFeedMockup.tsx`
Namespace: `homepage.activityFeed`

Replace ALL hardcoded strings:
- 5 feed cards — each has label, time, name, meta, detail
- `"Recall Touch"` header (keep brand name)
- `"Today"` → `t("dateLabel")`
- Chips: "All", "Needs action", "Leads" → `t("chips.all")`, etc.

Move FEED_ITEMS and CHIPS arrays inside component.

---

## FILE 19: `src/components/sections/MockDashboard.tsx`
Namespace: `homepage.mockDashboard`

Replace:
- `"Preview of the Recall Touch dashboard interface"` aria-label → `t("ariaLabel")`
- `"Recall Touch — Active records"` → `t("title")`
- `"Active Records"` → `t("heading")`
- `"Search calls…"` placeholder → `t("searchPlaceholder")`
- Table headers: "Name", "Time", "Duration", "Status", "Jurisdiction"
- Status labels: "Governed", "Pending"

Move table data inside component.

---

## FILE 20: `src/components/sections/UseCases.tsx`
Namespace: `homepage.useCasesAlt`

Replace:
- `"Built for"` → `t("label")`
- `"From solo operators to regulated enterprises."` → `t("heading")`
- 3 use cases (inbound, outbound, regulated) — each has `.title` and `.desc`
- `"Learn more →"` → `t("cta.link")`

Move USE_CASES array inside component.

---

## LOCALE KEY STRUCTURE

Create the `homepage` namespace in ALL 6 locale files. Structure:

```json
{
  "homepage": {
    "problem": { ... },  // ALREADY EXISTS — do not touch
    "howItWorks": { "label": "...", "title": "...", "steps": { ... } },
    "liveDemo": { "heading": "...", "subheading": "...", "useCases": { ... }, ... },
    "outcomes": { "heading": "...", "cards": { ... }, "pricing": { ... }, ... },
    "features": { "label": "...", "heading": "...", "capabilities": { ... } },
    "useCaseSection": { "heading": "...", "cases": { ... }, "cta": { ... } },
    "whoUses": { "label": "...", "heading": "...", "personas": { ... }, ... },
    "metrics": { "label": "...", "heading": "...", "items": { ... } },
    "testimonials": { "preamble": "...", "label": "...", "testimonials": { ... }, "badge": "..." },
    "pricingPreview": { "label": "...", "heading": "...", "toggle": { ... }, ... },
    "difference": { "heading": "...", "subheading": "...", "rows": { ... } },
    "enterpriseComparison": { "text": "..." },
    "finalCta": { "heading": "...", "subheading": "...", "buttons": { ... }, ... },
    "scrollCta": { "message": "...", "button": "...", "dismiss": "..." },
    "trust": { "text": "..." },
    "industries": { "label": "...", "heading": "...", "industries": { ... } },
    "bentoVisuals": { "timelineLabels": { ... }, "complianceRecord": { ... }, ... },
    "activityPreview": { "ariaLabel": "...", "title": "...", ... },
    "activityFeed": { "feedCards": { ... }, "dateLabel": "...", "chips": { ... } },
    "mockDashboard": { "ariaLabel": "...", "title": "...", "heading": "...", ... },
    "useCasesAlt": { "label": "...", "heading": "...", "cases": { ... }, ... }
  }
}
```

English gets the original text. es, fr, de, pt, ja get PROPER NATIVE translations (not placeholders, not English).

---

## VERIFICATION

After implementing all files, run:

```bash
# All section files should use useTranslations
grep -rL 'useTranslations\|getTranslations' src/components/sections/*.tsx
# Should return EMPTY (only non-section files if any)

# Homepage namespace should exist with all sub-namespaces
python3 -c "
import json
data = json.load(open('src/i18n/messages/en.json'))
hp = data.get('homepage', {})
expected = ['howItWorks','liveDemo','outcomes','features','useCaseSection','whoUses','metrics','testimonials','pricingPreview','difference','enterpriseComparison','finalCta','scrollCta','trust','industries','bentoVisuals','activityPreview','activityFeed','mockDashboard','useCasesAlt','problem']
missing = [k for k in expected if k not in hp]
print(f'MISSING: {missing}' if missing else f'ALL {len(expected)} HOMEPAGE SECTIONS PRESENT')
"

# TypeScript check
npx tsc --noEmit

# Build
npm run build

# Commit
git add -A && git commit -m "feat: complete homepage i18n — all 20 section components translated across 6 locales" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
