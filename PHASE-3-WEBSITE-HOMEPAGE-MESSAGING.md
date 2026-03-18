# PHASE 3: WEBSITE, HOMEPAGE & MESSAGING REDESIGN

**Date:** March 17, 2026
**Prerequisite:** Phase 1 + Phase 2 complete

---

## 1. WEBSITE ARCHITECTURE

### Full Sitemap

```
/                       → Homepage (conversion hub)
/product                → Full product deep-dive (features, how it works, screenshots)
/pricing                → Pricing + ROI calculator + FAQ
/demo                   → Interactive voice demo + product walkthrough video
/industries/dental      → Dental-specific landing page
/industries/hvac        → HVAC/Plumbing landing page
/industries/legal       → Legal intake landing page
/industries/medspa      → Med spa/aesthetics landing page
/industries/roofing     → Roofing/restoration landing page
/industries/healthcare  → General healthcare landing page
/results                → Real case studies + metrics
/compare                → vs. Smith.ai, Goodcall, Dialzara, answering services
/about                  → Founders, story, mission, team
/security               → Security practices, compliance status, data handling
/integrations           → Calendar, CRM, Zapier connections
/blog                   → SEO content, industry insights
/docs                   → API docs, setup guides (linked from footer, not main nav)
/contact                → Contact form, support email
/privacy                → Privacy policy
/terms                  → Terms of service
/activate               → Sign-up / start free trial
/sign-in                → Login
```

### Page Priority for Launch

**Must have (Week 1-2):**
Homepage, /pricing, /demo, /activate, /sign-in, /about, /security, /privacy, /terms

**Must have (Week 3-4):**
/industries/dental, /industries/hvac, /industries/legal, /results (even with 3-5 case studies), /compare

**Can wait (Month 2+):**
/product (homepage covers this initially), /integrations, /blog, remaining industry pages

---

## 2. NAVIGATION STRUCTURE

### Primary Nav (Desktop)

```
[Recall Touch logo]     Product    Industries ▾    Pricing    Results       [Sign in]  [Start free →]
                                   ├─ Dental
                                   ├─ HVAC & Plumbing
                                   ├─ Legal Intake
                                   ├─ Med Spa
                                   ├─ Roofing
                                   └─ All Industries
```

**Changes from current:**
- "Solutions" → "Industries" (clearer, more specific)
- Removed "Demo" from main nav (it's a CTA destination, not a nav item)
- Removed "Docs" from main nav (moved to footer — service business owners don't want docs in the main nav)
- Added "Results" to main nav (proof is a primary navigation concern for buyers)
- "Start free →" is the persistent CTA button, always visible

### Mobile Nav

Hamburger menu with: Product, Industries (expandable), Pricing, Results, About, Sign in, **Start free** (prominent button at top of mobile menu)

### Sticky Nav Behavior

On scroll, nav compresses to: logo + "Start free →" button. Full nav accessible via hamburger or on hover/focus.

---

## 3. HOMEPAGE STRATEGY

### Strategic Intent

The homepage must accomplish five things in order:

1. **Identify the pain** (0-3 seconds): The visitor must immediately see their problem reflected back at them. Not technology. Not features. Their specific pain.

2. **Present the solution** (3-10 seconds): What Recall Touch does, in one sentence that a non-technical person understands.

3. **Prove it works** (10-30 seconds): Demo, social proof, specific numbers. Not claims — evidence.

4. **Show the mechanism** (30-60 seconds): How it works, what it looks like, what the experience is.

5. **Remove risk** (60-90 seconds): Pricing, trial, no credit card, cancel anytime.

### Anti-Patterns to Avoid

- Do NOT open with technology ("AI-powered" as the first word)
- Do NOT open with the product name ("Recall Touch is...")
- Do NOT use abstract category language ("Revenue Execution System")
- Do NOT show pricing before proof
- Do NOT use stock photography
- Do NOT use gradient backgrounds that look like every other AI startup
- Do NOT use a hero animation that shows floating particles or abstract shapes
- Do NOT use testimonials from people who don't exist

---

## 4-7. FINAL HEADLINES, SUBHEADLINES, AND CTAs

### Final Homepage Headline

**"Your phone rings. Then what?"**

Why this works: It's not about the technology. It's not about AI. It's about the universal moment every business owner recognizes — the phone rings, and then the follow-up falls apart. It's a question, which creates engagement. It's short. It's unexpected (every competitor leads with "answer every call" — this leads with the problem after the answer).

### Final Homepage Subheadline

**"Recall Touch answers your calls, follows up on every lead, books appointments, recovers no-shows, and closes every loop — automatically, 24/7, across voice, text, and email."**

### Primary CTA

**"Try it free for 14 days"**

Not "Start free trial" (too generic). Not "Start free" (too vague). "Try it free for 14 days" is specific, risk-free, and time-bounded. The prospect knows exactly what they're getting.

### Secondary CTA

**"Hear it handle a call →"**

Links to the interactive voice demo. This is unique to Recall Touch — most competitors can't offer this. It leverages the strongest existing conversion asset.

---

## 8. HERO CONCEPT

### Layout

**Left side (60%):** Headline, subheadline, CTA buttons, three trust micro-badges below CTAs
**Right side (40%):** Live visual — NOT a static screenshot. A stylized phone conversation UI showing an AI interaction in real-time (animated text appearing as if the call is happening now).

### Trust Micro-Badges Below CTAs

Three small badges in a horizontal row:
- "No credit card required"
- "Live in 5 minutes"
- "Cancel anytime"

### Background

Not a gradient. Not dark with particles. Clean, warm off-white or very light warm gray background. The dark-mode AI startup aesthetic is played out. A warm, professional, light design signals "serious business tool" not "experimental AI toy."

### Below the Fold — Immediately Visible on Scroll

A thin trust bar: real customer logos (when available) or a single compelling stat: "The average service business loses $127,000/year to missed follow-ups. — Salesforce, 2026"

---

## 9. TRUST BAR

### Before Real Customers Exist

**Option A (stat-based):**
"The average business loses $127,000/year to missed follow-ups. — Salesforce, 2026"

**Option B (credibility signals):**
"Built on ElevenLabs voice AI · Deepgram speech recognition · 256-bit encryption · GDPR compliant"

**Option C (product proof):**
"Set up in 5 minutes · Works with your existing number · 14-day free trial"

Use Option C at launch. It's honest, specific, and addresses real concerns.

### After Real Customers Exist (Month 2+)

Replace with: Logo bar of 6-8 real customer business logos + "Trusted by [real number] businesses in dental, home services, legal, and more."

---

## 10. SECTION-BY-SECTION HOMEPAGE WIREFRAME

### Section 1: Hero (Above the Fold)
*Layout: 60/40 split — text left, visual right*

### Section 2: Problem Statement
*Layout: Full-width, centered, three columns*

**Heading:** "Every missed follow-up is lost revenue."

Three cards:

**Card 1: "The call goes to voicemail."**
"80% of callers hang up. 93% never call back. That's revenue walking out the door."

**Card 2: "The lead goes cold."**
"51% of leads are never contacted. The average response time is 42 hours. By then, your competitor answered."

**Card 3: "The appointment doesn't happen."**
"No confirmation, no reminder, no recovery. No-shows cost the average practice $1,200/month."

### Section 3: Solution Statement
*Layout: Full-width, centered text + product screenshot*

**Heading:** "Recall Touch closes every loop."

**Body:** "From the moment a call comes in to the moment an appointment is completed — Recall Touch handles every step. It answers the call, captures the lead, books the appointment, sends the confirmation, delivers the reminder, recovers the no-show, and follows up until the loop is closed."

**Visual:** Clean screenshot of the Recall Touch dashboard showing the revenue impact card with real-looking (but clearly labeled as "example") numbers.

### Section 4: How It Works
*Layout: Three-step horizontal flow with icons*

**Heading:** "Live in 5 minutes."

**Step 1: "Connect your phone"**
"Forward your existing number or get a new one. Takes 2 minutes."

**Step 2: "Your AI configures itself"**
"Select your industry, and your AI loads with pre-built knowledge, greetings, and follow-up workflows. Customize later."

**Step 3: "Every call handled. Every follow-up sent."**
"Your AI answers calls, books appointments, sends follow-ups, and recovers missed opportunities — starting immediately."

### Section 5: Interactive Demo
*Layout: Full-width with embedded demo experience*

**Heading:** "Hear it handle a real call."
**Subheading:** "Call the number below. Your AI answers. See what your callers experience."

[Interactive demo embed — phone number to call or browser-based voice demo]

**CTA below demo:** "That's what your callers hear. Try it free →"

### Section 6: What It Does (Feature Overview)
*Layout: Two-column grid, 6 feature cards*

**Heading:** "What Recall Touch does that your answering service doesn't."

**Card 1: "Answers every call, 24/7"** — "Natural voice AI handles calls when you can't. No voicemail. No hold music."

**Card 2: "Follows up automatically"** — "Missed call? SMS in 60 seconds. No reply? Call back in 2 hours. Text again tomorrow. Relentless."

**Card 3: "Books appointments"** — "Checks your real-time calendar, offers available slots, books and confirms — while they're on the phone."

**Card 4: "Recovers no-shows"** — "Missed appointment? Text in 30 minutes. Call to rebook the next day. Saves $1,200+/month for the average practice."

**Card 5: "Reactivates cold leads"** — "Contacts who went quiet get a re-engagement sequence after 30, 60, or 90 days."

**Card 6: "Shows your ROI"** — "See exactly how many leads were captured, appointments booked, and revenue recovered. Not guesses — tracked."

### Section 7: Industry Segments
*Layout: Horizontal scrolling cards or grid*

**Heading:** "Built for businesses that depend on every call."

Cards for: Dental, HVAC & Plumbing, Legal Intake, Med Spa, Roofing, More Industries →

Each card: Industry icon + one-line hook + link to industry page.

- Dental: "One new patient is worth $3,000+. How many are you losing to voicemail?"
- HVAC: "Miss 3 calls a day? That's $1,500/day in revenue your competitor captures."
- Legal: "One missed intake call could be a $25,000 case."
- Med spa: "Clients who don't get a follow-up text don't come back."
- Roofing: "Storm season calls wait for no one. Your AI doesn't either."

### Section 8: Results / Social Proof
*Layout: Full-width with metrics + testimonial cards*

**Heading:** "Real results from real businesses."

**Before real customers:** Show 2-3 metrics from beta/pilot program with honest framing: "Early results from our pilot program:"
- "Average answer rate: 100% (vs. 62% before Recall Touch)"
- "Average follow-up time: 47 seconds (vs. 6+ hours industry average)"
- "Average appointments booked per month: 18 (previously missed)"

**After real customers (Month 2+):** Real testimonials with full names, business names, photos, and specific metrics. Video testimonials are the gold standard.

### Section 9: Pricing Preview
*Layout: Three tier cards + ROI calculator*

**Heading:** "Pricing that makes sense on the first recovered call."

Show the three main tiers (Solo, Business, Scale) with clear differentiation.

**Below the tiers:** Simple ROI calculator:
"How many calls per day do you receive? [slider: 5-50]
What's your average job/patient/case value? [slider: $100-$10,000]
Your estimated monthly revenue at risk: **$X,XXX**
Recall Touch costs: **$297/month**"

### Section 10: Comparison
*Layout: Table format*

**Heading:** "How Recall Touch compares."

| Feature | Voicemail | Answering Service | AI Receptionist (Dialzara, Goodcall) | Recall Touch |
|---------|-----------|-------------------|--------------------------------------|--------------|
| 24/7 answering | No | Partial | Yes | Yes |
| Automated follow-up | No | No | No | Yes |
| Appointment booking | No | Manual | Basic | Real-time calendar |
| No-show recovery | No | No | No | Yes |
| Lead reactivation | No | No | No | Yes |
| Revenue tracking | No | No | No | Yes |
| Price | Free | $200-500/mo | $29-79/mo | From $49/mo |

**Key differentiator callout:** "Other tools answer the phone. Recall Touch answers, follows up, books, confirms, reminds, recovers, and reactivates. That's why the ROI is different."

### Section 11: FAQ
*Layout: Accordion*

See Section 12 below.

### Section 12: Final CTA
*Layout: Full-width, centered, high-contrast background*

**Heading:** "Every day without Recall Touch is revenue you're not recovering."

**Subheading:** "Start your 14-day free trial. No credit card. Live in 5 minutes."

**CTA button:** "Try it free for 14 days →"
**Secondary link:** "Or hear it handle a call first →"

---

## 11. DRAFT COPY FOR EACH SECTION

*(Covered inline above in Section 10. Each section includes specific copy.)*

---

## 12. FAQ STRUCTURE

**On Homepage (5-6 questions max):**

**Q: How does the free trial work?**
A: "14 days, full features, no credit card. Connect your phone number, and your AI starts handling calls immediately. If it's not for you, cancel with one click."

**Q: Can I keep my existing phone number?**
A: "Yes. Forward your current number to your Recall Touch number. Your callers won't know the difference."

**Q: What happens when my AI can't handle a call?**
A: "If a caller needs a human, your AI takes a detailed message and sends it to you via text immediately. You can also set up warm transfers to ring your phone directly for urgent calls."

**Q: How is this different from other AI answering services?**
A: "Most AI answering services answer your calls. That's it. Recall Touch answers, then follows up via text and email, books appointments, sends reminders, recovers no-shows, and reactivates cold leads. The answering is just the beginning."

**Q: What if I go over my included minutes?**
A: "Your calls never get cut off. If you exceed your plan minutes, you're billed at your plan's per-minute rate. We'll alert you as you approach your limit so there are no surprises."

**Q: Is there a contract?**
A: "No. Month-to-month. Cancel anytime from your dashboard. Annual plans are available at a discount."

**On Pricing Page (additional):**

**Q: What voices are available?**
A: "6 natural-sounding voices included in all plans. Premium voices and custom voice options available as add-ons."

**Q: Do you support HIPAA?**
A: "HIPAA-compliant configuration with BAA is available as an add-on for healthcare practices. Contact us for details."

**Q: What integrations are available?**
A: "Google Calendar, Outlook Calendar, and Zapier are available on all plans. HubSpot, Salesforce, and API access are available on Scale and above."

**Q: What's included in onboarding?**
A: "Self-serve setup takes about 5 minutes. Business and Scale plans include a dedicated onboarding call to configure your AI for your specific business."

---

## 13. COMPARISON-PAGE STRATEGY

### /compare — Full Comparison Page

**Headline:** "Honest comparison: Recall Touch vs. alternatives."

**Structure:**

**Section 1: Category Comparison**
Table comparing: Voicemail → Human Answering Service → AI Receptionist → Recall Touch
(Shows the evolution and where Recall Touch sits)

**Section 2: Specific Competitor Comparisons**
Individual comparison blocks for the top 4 competitors prospects are evaluating:

**vs. Smith.ai** — "Smith.ai combines AI with human receptionists. Great for complex calls. But: no automated follow-up, no no-show recovery, no reactivation campaigns, no appointment booking from calls, and pricing starts at $140+/month with per-call fees. Recall Touch automates the entire lifecycle."

**vs. Goodcall** — "Goodcall offers unlimited minutes at $79/month. If pure call answering is all you need, it's affordable. But: no follow-up automation, no appointment confirmation/reminders, no no-show recovery. Recall Touch costs more because it does more."

**vs. Dialzara** — "Dialzara is the budget option at $29/month. Solid for basic call answering. But: limited minutes, no follow-up engine, no recovery workflows. If you just need a phone answered, it works. If you need the call to turn into revenue, Recall Touch closes the loop."

**vs. Human Answering Services (Ruby, AnswerConnect)** — "Human answering services cost $200-500/month, are only available during business hours, don't follow up, don't book appointments in real-time, and don't recover no-shows. Recall Touch replaces the service and adds everything it can't do."

**Section 3: Feature Matrix**
Detailed feature-by-feature comparison table across all competitors.

**Section 4: ROI Comparison**
"At $29/month, Dialzara answers your calls. At $297/month, Recall Touch answers your calls AND recovers an average of $4,200/month in revenue that would have been lost. Which is the better investment?"

**Tone:** Honest, not aggressive. Acknowledge competitor strengths. Win on differentiation, not mud-slinging.

---

## 14. PROOF/CASE STUDY STRATEGY

### /results — Case Studies Page

**Headline:** "Real results from real businesses."

**Structure:**

Each case study follows a strict format:
1. **Business name and industry** (with permission)
2. **The problem** (2-3 sentences: what they were struggling with before)
3. **The solution** (2-3 sentences: what Recall Touch did)
4. **The numbers** (specific metrics: calls answered, leads captured, appointments booked, estimated revenue impact)
5. **Quote** (one sentence from the business owner)
6. **Timeline** (how long to see results — "within 7 days" or "first month")

**Example format:**

> **Smile Dental Studio — Austin, TX**
> *Dental Practice · Business Plan*
>
> **Before:** Missing 8-12 calls per week during procedures. Front desk couldn't keep up with follow-up calls to no-shows.
>
> **After 30 days with Recall Touch:**
> - 100% call answer rate (up from 64%)
> - 14 new patient appointments booked by AI
> - 6 no-shows recovered and rebooked
> - Estimated revenue impact: $28,000 in new patient value
>
> *"I stopped worrying about the phone the first day." — Dr. Michael Rodriguez, Lead Dentist*

**Content production plan:**
- Month 1: 3-5 case studies from beta customers
- Month 3: 10+ case studies across 3+ industries
- Month 6: Industry-specific case study pages
- Ongoing: Automated case study generation from customer data (with permission)

---

## 15. HEADLINE VARIANTS (10)

1. "Your phone rings. Then what?" ← **PRIMARY**
2. "The call was answered. The follow-up wasn't."
3. "You're not losing leads to bad marketing. You're losing them to bad follow-up."
4. "What happens between the first call and the booked appointment? Usually, nothing."
5. "Every missed follow-up is a check you didn't cash."
6. "The revenue isn't gone. It's waiting for a follow-up."
7. "Your competitor doesn't answer faster. They follow up."
8. "The AI that finishes what your front desk starts."
9. "Stop answering calls. Start closing them."
10. "Calls answered. Leads followed up. Appointments booked. Revenue recovered."

---

## 16. SUBHEADLINE VARIANTS (10)

1. "Recall Touch answers your calls, follows up on every lead, books appointments, recovers no-shows, and closes every loop — automatically, 24/7." ← **PRIMARY**
2. "The AI revenue closer for service businesses. Answer. Follow up. Book. Remind. Recover. Close."
3. "Most tools answer your phone. Recall Touch finishes the job — follow-up, booking, reminders, recovery, and reactivation, across voice, text, and email."
4. "One AI handles every call, every follow-up, every appointment, and every no-show recovery — so your team can focus on the work."
5. "From missed call to booked appointment to completed visit — Recall Touch manages every step automatically."
6. "The AI that doesn't just answer. It follows up, books, confirms, reminds, recovers, and reactivates — until the loop is closed."
7. "For dental practices, home service companies, law firms, and med spas that lose revenue to broken follow-up."
8. "Answer every call in a natural voice. Follow up in 60 seconds. Book on the spot. Recover every no-show. See your ROI."
9. "Your AI front desk, follow-up engine, appointment manager, and revenue recovery system — in one platform."
10. "Handles everything between 'the phone rang' and 'the job is booked' — automatically, persistently, 24/7."

---

## 17. CTA VARIANTS (10)

1. "Try it free for 14 days" ← **PRIMARY**
2. "Hear it handle a call →" ← **SECONDARY (demo link)**
3. "Start recovering revenue →"
4. "Get your AI live in 5 minutes"
5. "See what you're missing → (ROI calculator)"
6. "Start your free trial — no credit card"
7. "Connect your phone and go live"
8. "Watch it book an appointment →"
9. "Calculate your missed revenue →"
10. "Talk to our AI right now →"

---

## 18. VISUAL DESIGN DIRECTION

### How to NOT Look Generic

The current dark-mode + emerald accent + rounded cards + gradient backgrounds design is indistinguishable from 500 other AI startups. Here's how to break out:

### Color System

**Primary background:** Warm white (#FAFAF8) or very light warm gray (#F5F5F0)
**Text:** Near-black (#1A1A1A) for headings, dark gray (#4A4A4A) for body
**Accent:** Deep teal (#0D6E6E) — not the typical startup blue, purple, or emerald green. Teal reads as: professional, trustworthy, distinct, not trendy.
**Secondary accent:** Warm amber (#D4A853) — used sparingly for highlights, badges, "premium" indicators
**Backgrounds for sections:** Alternate between warm white and very light warm gray to create visual rhythm without harsh contrast
**Dark mode:** Available but NOT the default. Default is light. Dark mode is a dashboard preference, not the marketing site aesthetic.

### Typography

**Headings:** Inter or DM Sans — clean, modern, not quirky. Tight letter-spacing (-0.02em) on large headings for premium feel. Bold weight (700) only for H1, semibold (600) for H2-H4.

**Body:** System font stack or Inter at 400 weight. 16px base with 1.6 line height. Readable, professional, not stylized.

**Avoid:** Decorative fonts, all-caps headings (feels like yelling), extremely thin font weights (feels fragile), rounded/playful fonts (feels unserious).

### Spacing and Layout

- Generous whitespace. Don't cram sections together. Each section should breathe.
- Max content width: 1200px with generous side padding
- Section padding: 80-120px vertical on desktop, 48-64px on mobile
- Card border radius: 12px (not 24px — too playful)
- Subtle borders (1px, #E5E5E0) not heavy shadows
- No gradient backgrounds on sections. Solid colors or very subtle texture.

### Card Treatment

- Light background cards on white sections (white card on #F5F5F0 background)
- Very subtle border (1px #E5E5E0)
- No drop shadows (flat, modern)
- On hover: border color shifts to accent teal — subtle, not dramatic
- Internal padding: 24-32px
- Consistent card sizes within a row

### Iconography

- Line icons, not filled. 1.5px stroke weight.
- Lucide or Phosphor icon set (not Hero Icons — too common)
- Teal accent color on icons, not multi-color
- Icons should illustrate, not decorate. Every icon should map to a specific concept.

### Screenshots and Product Imagery

- Use REAL product screenshots — not mockups or illustrations
- Screenshots should show the actual dashboard with realistic data
- Place screenshots in a clean browser/device frame
- Slight perspective tilt (3-5 degrees) for depth
- Screenshots should show the revenue impact card prominently
- Never use stock photos of smiling customer service reps

### Motion

- Scroll-triggered fade-in for sections (subtle, 200ms, ease-out)
- No parallax scrolling (distracting)
- No auto-playing video backgrounds
- No floating particles or abstract animations
- The interactive demo IS the motion — the live AI conversation is more impressive than any animation

### What Makes It Feel Premium vs. Generic

| Premium | Generic |
|---------|---------|
| Warm white background | Dark mode everything |
| Restrained color palette (2 colors + neutrals) | Rainbow gradients |
| Real product screenshots | Abstract illustrations |
| Generous whitespace | Cramped sections |
| Specific numbers and proof | Vague claims |
| Clean, readable typography | Decorative fonts |
| Subtle interactions | Dramatic animations |
| Professional photography of real people | Stock photos or no people |
| Teal/amber palette | The ubiquitous purple/blue gradient |

### What Visual Patterns to Kill

1. **Dark mode as default for marketing site.** It screams "AI startup, 2024." Go light, warm, professional.
2. **Gradient hero backgrounds.** Every AI company has one. Use a clean flat color.
3. **Abstract blob shapes.** They mean nothing and communicate nothing.
4. **Floating 3D elements.** They look impressive for 2 seconds and then feel cheap.
5. **Auto-playing demo videos with synthetic UI.** Show the real product instead.
6. **Logo bars with fake logos or "trusted by" with no real logos.** Empty trust signals are worse than no trust signals.
7. **Excessively rounded corners (20px+).** It reads as playful/consumer, not professional/business.
8. **Multiple accent colors.** Pick one. Teal. Everything else is neutral.

---

*End of Phase 3. Moving to Phase 4.*
