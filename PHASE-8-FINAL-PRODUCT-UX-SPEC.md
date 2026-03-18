# RECALL TOUCH — FINAL PRODUCT & UX SPECIFICATION

**Date:** March 17, 2026

---

## PRODUCT DEFINITION

**Recall Touch** is an AI platform that answers business calls, executes follow-up sequences, books appointments, recovers no-shows, and reactivates cold leads — across voice, text, and email — automatically.

**Core engine:** Contact timeline + Follow-up workflow engine + Voice layer + Booking engine + Revenue analytics.

**Three modes:** Business (launch focus), Solo (soft-launch), Sales (future).

---

## INFORMATION ARCHITECTURE

### App Navigation (Sidebar)

```
Dashboard        — Revenue impact, attention items, recent activity
Inbox            — Unified conversations (calls + SMS + email per contact)
Contacts         — Lead list with status, value, activity
Calendar         — Appointment calendar view
Follow-ups       — Active workflows, templates, performance
Analytics        — Detailed reporting, charts, usage
─────────
AI Agent         — Greeting, knowledge, capabilities
Phone            — Numbers, routing, hours
Voice            — Voice selection and preview
Team             — Members, roles
Billing          — Plan, usage, invoices
Settings         — Notifications, integrations, preferences
```

### Usage meter always visible at sidebar bottom:
"312 / 500 min used · Business plan"

---

## ONBOARDING (3 Steps)

### Step 1: Your Business
Full-screen, no sidebar. Large clickable industry cards (Dental, HVAC, Legal, Med Spa, Roofing, Other). Business name field. Optional website URL for auto-scrape.

**Behind the scenes:** Industry pack loads defaults for greeting, knowledge base, appointment types, and follow-up workflows.

### Step 2: Connect Your Phone
Three card options: Forward existing number | Get new number | Skip for now.

### Step 3: You're Live
Celebration screen. Primary CTA: "Call [number] now to test your AI." Secondary: "Listen to a sample." Tertiary: "Go to dashboard."

**The call-your-number moment is the aha experience. Everything optimizes for this.**

---

## DASHBOARD

### Layout (Top to Bottom)

**1. Revenue Impact Card (full width, top)**
Four large metrics: Calls Answered | Leads Captured | Appointments Booked | Estimated Revenue Value
Trend indicator vs. previous period. Time selector (today/week/month).

**2. Two-column row**
Left: Needs Your Attention (action items with urgency colors)
Right: Today's Activity (calls, follow-ups, appointments, next upcoming)

**3. Recent Calls (full width)**
Table: time, contact name, outcome tag, duration. Click → contact timeline.

### Design Rules
- Revenue impact card uses teal accent as left border
- Large, bold numbers — not cramped small cards
- No charts on dashboard. Numbers only. Charts in Analytics.
- Empty state: "Call [number] to make your first test call"

---

## INBOX

### Split Layout
Left panel (35%): Conversation list sorted by recency. Name, last message preview, channel icon, time, urgency dot.

Right panel (65%): Contact timeline. Chronological stream of all interactions — call transcripts, SMS threads, emails. Each call shows: play recording button, full transcript (collapsible), AI summary, outcome tag.

### Actions
Reply via SMS (inline), Call back, Add note, Start follow-up, Mark resolved, Assign to team member.

---

## CONTACT TIMELINE

### Individual contact view
Header: Name, phone, email, status badge, estimated value, source.
Left column: Summary card (total calls, texts, appointments, active sequence, AI notes).
Right column: Full chronological timeline of all interactions.
Actions: Send SMS, Call, Add note, Start sequence, Archive.

---

## FOLLOW-UP WORKFLOWS

### List View
Cards for each workflow template. Shows: name, trigger, step summary, active enrollments count, success rate.

### Workflow Editor
Linear step list (not a flowchart):
- Trigger selector (dropdown: missed call, appointment booked, no-show, quote sent, manual, days inactive)
- Steps: each is a card with channel (SMS/call/email), delay, condition (after trigger/if no reply), message template
- Variables inserted via dropdown ({name}, {business}, {booking_link})
- Stop conditions: replied, booked, opted out, completed
- "Preview from contact's perspective" button

### Industry Pack Templates Pre-Loaded
Dental gets: Missed call recovery, Appointment reminder, No-show recovery.
HVAC gets: Missed call recovery, Quote follow-up, Seasonal reactivation.
Etc.

---

## ANALYTICS

### Layout
Top: Same four metrics as dashboard (calls, leads, appointments, revenue) with trends.
Middle: Calls by hour (bar chart), Follow-up performance (sent/replied/booked per workflow), Top sources (pie chart).
Bottom: Usage meter (minutes used/included, SMS count, overage estimate).

---

## SETTINGS

### AI Agent
- Greeting text editor with "Hear how it sounds" preview button
- Knowledge base: structured fields (services, hours, FAQ, policies) + free-text
- Capability toggles (book, capture, transfer, text, after-hours)

### Voice Selection
Six voice cards with: name, personality word, play sample button. "Preview with your greeting" button. Speed and warmth sliders. Premium voices upsell link.

### Billing/Usage
Current plan display, usage meters (minutes, agents, seats), billing history with itemized overages, change plan / switch to annual / cancel links.

---

## VISUAL DESIGN SYSTEM

### Colors
Background: #FAFAF8 (warm white). Surface: #FFFFFF. Text: #1A1A1A / #4A4A4A / #8A8A8A. Accent: #0D6E6E (teal). Highlight: #D4A853 (amber). Border: #E5E5E0.

**Light mode default for marketing site.** Dark mode available as dashboard preference.

### Typography
Inter. Headings: -0.02em letter-spacing, 700/600 weight. Body: 16px, 1.6 line-height, 400 weight.

### Components
12px border-radius on cards. 1px borders, no drop shadows. Teal accent on hover. Generous whitespace (80-120px section padding). Max 1200px content width.

### Anti-Patterns
No dark hero backgrounds. No gradient blobs. No abstract 3D shapes. No stock photos. No auto-playing videos. No 24px+ border-radius. No multiple accent colors.

---

## MOBILE

Bottom tab bar: Dashboard | Inbox | Contacts | Calendar | More.
Simplified dashboard (2 key metrics + attention items).
Full inbox with stacked list → detail navigation.
Push notifications for: new leads, action needed, daily summary.
Configuration and workflow editing are desktop-only.

---

## HOMEPAGE

### Headline
"Your phone rings. Then what?"

### Subheadline
"Recall Touch answers your calls, follows up on every lead, books appointments, recovers no-shows, and closes every loop — automatically, 24/7, across voice, text, and email."

### CTAs
Primary: "Try it free for 14 days"
Secondary: "Hear it handle a call →"

### Section Flow
1. Hero (60/40 split: text + animated call UI)
2. Trust bar ("Set up in 5 minutes · Works with your existing number · 14-day free trial")
3. Problem statement (3 cards: calls to voicemail, follow-up broken, appointments lost)
4. Solution statement + product screenshot
5. How it works (3 steps: connect → configure → done)
6. Interactive voice demo
7. Feature overview (6 cards — what Recall Touch does that answering services don't)
8. Industry segments (dental, HVAC, legal, med spa, roofing cards)
9. Social proof (real metrics and testimonials when available)
10. Pricing preview + ROI calculator
11. Competitor comparison table
12. FAQ (6 questions)
13. Final CTA ("Every day without Recall Touch is revenue you're not recovering")
