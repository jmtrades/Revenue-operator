# PHASE 4: FULL APP UI/UX DESIGN

**Date:** March 17, 2026

---

## 1. INFORMATION ARCHITECTURE

### Global Structure

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (persistent, collapsible)                   │
│  ┌─────────────────────────────────────────────────┐│
│  │  [Logo]           [Collapse toggle]             ││
│  │                                                 ││
│  │  📊 Dashboard          (home)                   ││
│  │  💬 Inbox              (conversations)          ││
│  │  👥 Contacts           (leads/customers)        ││
│  │  📅 Calendar           (appointments)           ││
│  │  🔄 Follow-ups         (active sequences)       ││
│  │  📈 Analytics          (reporting)              ││
│  │                                                 ││
│  │  ─────────────                                  ││
│  │  ⚙️ Settings                                    ││
│  │  🤖 AI Agent                                    ││
│  │  📱 Phone                                       ││
│  │  💳 Billing                                     ││
│  │  👤 Team                                        ││
│  │                                                 ││
│  │  ─────────────                                  ││
│  │  [Business name]                                ││
│  │  [Plan: Business]                               ││
│  │  [Usage: 312/500 min]                           ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Main Content Area                                   │
│  ┌─────────────────────────────────────────────────┐│
│  │                                                 ││
│  │  [Page content]                                 ││
│  │                                                 ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Hierarchy Rules

1. **Sidebar items ordered by usage frequency:** Dashboard > Inbox > Contacts > Calendar > Follow-ups > Analytics
2. **Settings cluster is secondary** — below a divider, visually recessed
3. **Usage meter always visible** at the bottom of the sidebar — creates awareness without being alarming
4. **The sidebar collapses to icons only** on narrow viewports or user preference
5. **No more than 6 primary nav items** — cognitive load limit

---

## 2. MODE SELECTION

### When It Happens

During onboarding Step 1, after selecting industry, the user sees:

**"How will you use Recall Touch?"**

- **"I run a business"** → Business Mode (default dashboard, industry templates, revenue metrics)
- **"I manage sales"** → Sales Mode (pipeline view, speed-to-lead, setter/closer workflows) — *Coming soon, join waitlist*
- **"Personal use"** → Solo Mode (simplified dashboard, personal follow-up, reminders)

### How Modes Differ in Practice

| Element | Solo Mode | Business Mode | Sales Mode (future) |
|---------|-----------|---------------|-------------------|
| Dashboard hero card | "Follow-ups completed" | "Revenue recovered" | "Pipeline value" |
| Primary metric | Tasks done | Appointments booked | Meetings booked |
| Contact terminology | "Contacts" | "Leads" | "Prospects" |
| Sidebar items | Dashboard, Inbox, Contacts, Follow-ups, Calendar | Full set | + Pipeline, + Team Performance |
| Analytics | Activity summary | Revenue attribution | Speed-to-lead, conversion rates |
| Follow-up templates | Personal (invoice, outreach, callback) | Industry (missed call, no-show, quote, reactivation) | Sales (speed-to-lead, ghost recovery, proposal follow-up) |
| Onboarding | "What do you follow up on?" | "Tell us about your business" | "Connect your lead sources" |

### Mode Can Be Changed Later

In Settings → Workspace → Mode. Changing mode reconfigures the dashboard and templates but does NOT delete data.

---

## 3. ONBOARDING WIZARD (Business Mode)

### Step 1: Your Business (90 seconds)

**What user sees:**
Clean full-screen page. No sidebar. No distractions. Progress bar at top: Step 1 of 3.

**Fields:**
- Business name (text input)
- Industry (large clickable cards: Dental, HVAC/Plumbing, Legal, Med Spa, Roofing, Other)
- Website URL (optional, with helper text: "We'll pull your business info automatically")
- "Continue →" button

**What happens behind the scenes:**
- If website URL provided, scrape business hours, services, address, phone
- Load industry pack (greeting, knowledge base, appointment types, follow-up templates)
- Create workspace and AI agent with industry defaults

**Premium feel:** Large industry cards with relevant icons, not a dropdown. Feels like you're choosing a tailored experience, not filling out a form.

**Generic feel to avoid:** Long form with 10 fields. Dropdown menus. Gray backgrounds.

### Step 2: Connect Your Phone (60 seconds)

**What user sees:**
Full-screen with three options as large cards:

**Option A: "Forward your existing number"**
Shows instructions: "On your phone, dial [carrier-specific code] and enter [number]." Detects carrier if possible.

**Option B: "Get a new number"**
Instant number provisioning. User picks area code, sees available numbers, selects one.

**Option C: "I'll do this later — show me the dashboard"**
Skip to dashboard with demo data. Phone setup becomes a persistent nudge.

**What happens behind the scenes:**
- Phone number provisioned and linked to workspace
- Twilio/carrier forwarding tested
- AI agent activated on the number

### Step 3: You're Live (immediate)

**What user sees:**
Celebration screen: "Your AI is live on [phone number]."

Three options:
1. **"Call your number now"** — big button, primary action. Opens phone dialer with number pre-filled. User calls, talks to their AI, experiences the product for the first time. THIS IS THE AHA MOMENT.
2. **"Listen to a sample call"** — play a recorded example of the AI handling a call for their industry
3. **"Go to your dashboard →"** — proceed to the main app

**Trust cue:** "Your AI is configured for [industry] with [X] pre-built follow-up workflows. You can customize everything in Settings."

**What to avoid:** Don't dump the user into a blank dashboard after 3 steps. The celebration screen + "call your number" prompt creates the emotional peak.

---

## 4. FIRST-VALUE EXPERIENCE

The first 5 minutes after onboarding determine retention. The user must experience the product's value, not just see the interface.

**Ideal first-value flow:**
1. User completes onboarding → lands on "You're Live" screen
2. User calls their Recall Touch number from their phone
3. AI answers: "Thank you for calling [Business Name], how can I help you?"
4. User has a conversation with their AI — books a test appointment, asks about services
5. User goes to dashboard → sees the call in their inbox with transcript, summary, and any captured details
6. User receives a follow-up text (if they gave their number during the call): "Thanks for calling [Business Name]! Your appointment is confirmed for [time]."

**This 5-minute experience demonstrates:** voice quality, call handling, transcript generation, inbox population, and follow-up automation. All in one flow. If this works smoothly, the user is hooked.

**Fallback if user doesn't call:** After 1 hour, send SMS: "Your Recall Touch AI is ready. Call [number] to hear it in action, or we can call you — reply YES."

---

## 5. DASHBOARD

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  DASHBOARD                                [This month ▾] │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  REVENUE IMPACT                                    │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┐    │  │
│  │  │ 127      │ 34       │ 18       │ $9,200   │    │  │
│  │  │ Calls    │ Leads    │ Appts    │ Est.     │    │  │
│  │  │ answered │ captured │ booked   │ value    │    │  │
│  │  └──────────┴──────────┴──────────┴──────────┘    │  │
│  │  ↑ 12% vs last month                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────┐  ┌─────────────────────┐ │
│  │  NEEDS YOUR ATTENTION (3)  │  │  TODAY'S ACTIVITY   │ │
│  │                            │  │                     │ │
│  │  🔴 Sarah Chen - callback  │  │  Calls: 8           │ │
│  │     requested, waiting 2h  │  │  Follow-ups: 12     │ │
│  │  🟡 Quote for Martinez -   │  │  Appts booked: 2    │ │
│  │     no response, day 3     │  │  SMS sent: 7        │ │
│  │  🟡 Dr. appointment -      │  │                     │ │
│  │     reschedule needed      │  │  Next appointment:  │ │
│  │                            │  │  Sarah Chen, 2:00pm │ │
│  │  [View all →]              │  │                     │ │
│  └────────────────────────────┘  └─────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  RECENT CALLS                                      │  │
│  │                                                    │  │
│  │  14:23  Sarah Chen       Appt booked    3:12      │  │
│  │  13:45  Unknown caller   Lead captured  1:47      │  │
│  │  12:10  Mike Johnson     Question       2:33      │  │
│  │  11:30  Callback - Amy   Rescheduled    1:55      │  │
│  │                                                    │  │
│  │  [View all calls →]                                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### What User Sees First

The REVENUE IMPACT card. Always at the top. Always visible. This is the single most important UI element in the entire product. It answers the question: "Is this worth paying for?" The answer must be immediately, visually, unambiguously YES.

### Key Actions from Dashboard

1. Click "Needs Attention" item → goes to contact timeline with context
2. Click a recent call → goes to call detail with transcript and actions
3. Time period selector → switch between today, this week, this month
4. Revenue impact card → click through to full analytics

### What's Hidden

- Settings (sidebar, not dashboard)
- Billing details (sidebar → billing)
- Team management (sidebar → team)
- AI configuration (sidebar → AI Agent)
- Advanced analytics (sidebar → analytics — dashboard shows the summary)

### Premium Feel

- The revenue impact card uses the teal accent color as a subtle left border or top accent
- Numbers are large, bold, and clear — not cramped in small cards
- Trend indicator ("↑ 12% vs last month") uses green for positive, red for negative
- "Needs attention" items have urgency colors (red = overdue, yellow = pending)
- Generous whitespace between sections
- No data visualizations on the dashboard — just numbers. Charts live in Analytics.

### Generic Feel to Avoid

- Complex charts and graphs on the main dashboard (overwhelming)
- Tiny cards with too many metrics (cognitive overload)
- Engineering labels ("capsule data," "handoff status")
- Empty states that say "No data" without guidance
- A dashboard that looks like a monitoring tool instead of a business command center

---

## 6. INBOX

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  INBOX                          [Filter ▾] [Search 🔍]  │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  CONVERSATIONS   │  │  CONVERSATION DETAIL          │  │
│  │                  │  │                                │  │
│  │  🔴 Sarah Chen   │  │  Sarah Chen                   │  │
│  │  "I'd like to    │  │  📞 Inbound call · 3:12       │  │
│  │  schedule..."    │  │  Lead · Dental · New patient   │  │
│  │  📞 2 min ago    │  │                                │  │
│  │                  │  │  ─────────────────────────────  │  │
│  │  Mike Johnson    │  │                                │  │
│  │  "Thanks for the │  │  📞 Call - 14:23 today         │  │
│  │  info"           │  │  [Play recording ▶]            │  │
│  │  💬 1 hour ago   │  │                                │  │
│  │                  │  │  AI: "Thank you for calling    │  │
│  │  Amy Torres      │  │  Smile Dental, how can I help  │  │
│  │  "Need to        │  │  you today?"                   │  │
│  │  reschedule"     │  │                                │  │
│  │  💬 3 hours ago  │  │  Sarah: "Hi, I'd like to      │  │
│  │                  │  │  schedule a cleaning."          │  │
│  │  ···             │  │                                │  │
│  │                  │  │  AI: "I'd be happy to help!    │  │
│  │                  │  │  I have openings Thursday at   │  │
│  │                  │  │  10 AM and 2 PM..."            │  │
│  │                  │  │                                │  │
│  │                  │  │  ─────────────────────────────  │  │
│  │                  │  │                                │  │
│  │                  │  │  💬 SMS - 14:25 today           │  │
│  │                  │  │  "Hi Sarah! Your cleaning at   │  │
│  │                  │  │  Smile Dental is confirmed for  │  │
│  │                  │  │  Thursday 2 PM. Reply C to..."  │  │
│  │                  │  │                                │  │
│  │                  │  │  ─────────────────────────────  │  │
│  │                  │  │                                │  │
│  │                  │  │  [Reply via SMS] [Call back]   │  │
│  │                  │  │  [Add note] [Mark resolved]    │  │
│  └──────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Left Panel: Conversation List

- Sorted by most recent activity
- Each item shows: contact name (or "Unknown caller"), last message preview, channel icon (📞 call, 💬 SMS, ✉️ email), relative time
- Unread/action-needed items have a colored dot (red for action needed, blue for unread)
- Filter options: All, Unread, Action needed, Calls only, Texts only

### Right Panel: Contact Timeline

This is the key differentiator. Every interaction with a contact — calls, SMS, emails — appears in one chronological thread. The user sees the full story of their relationship with this person.

**Each call entry shows:**
- Date/time, duration, direction (inbound/outbound)
- Play recording button
- Full transcript (expandable/collapsible)
- AI summary: "Sarah called to book a cleaning. Appointment booked for Thursday 2 PM. Confirmation text sent."
- Outcome tag: "Appointment booked" / "Lead captured" / "Message taken" / "Transfer requested"

**Each SMS entry shows:**
- Date/time, direction, full message text
- Delivery status (sent, delivered, read if available)

**Each email entry shows:**
- Date/time, subject, preview, full body (expandable)

### Actions from Inbox

- **Reply via SMS:** Type and send a text directly from the thread
- **Call back:** Initiate an outbound call (AI or manual pass-through)
- **Add note:** Internal note visible to team but not contact
- **Mark resolved:** Archives the conversation
- **Assign to team member:** (Business/Scale only)
- **Start follow-up sequence:** Manually trigger a follow-up workflow for this contact

---

## 7. CONTACT/LEAD TIMELINE

### Individual Contact View

Accessed by clicking a contact name anywhere in the app.

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Contacts                                      │
│                                                          │
│  Sarah Chen                                              │
│  📞 (555) 012-3456 · ✉️ sarah@email.com                  │
│  Lead · New patient · Dental                             │
│  Created: March 15, 2026 · Last activity: 2 hours ago   │
│                                                          │
│  Status: [Appointment booked ▾]                          │
│  Estimated value: [$3,200]                               │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────────────┐  │
│  │  SUMMARY            │  │  TIMELINE                  │  │
│  │                     │  │                            │  │
│  │  Total calls: 2     │  │  Mar 15, 2:23 PM          │  │
│  │  Total texts: 4     │  │  📞 Inbound call (3:12)    │  │
│  │  Appointments: 1    │  │  Booked cleaning Thu 2 PM  │  │
│  │  Follow-ups sent: 2 │  │                            │  │
│  │  Current sequence:  │  │  Mar 15, 2:25 PM          │  │
│  │    Appt reminder    │  │  💬 Confirmation SMS sent   │  │
│  │    (Step 1 of 3)    │  │                            │  │
│  │                     │  │  Mar 16, 10:00 AM          │  │
│  │  AI Notes:          │  │  💬 24hr reminder sent      │  │
│  │  "Prefers afternoon │  │                            │  │
│  │  appointments.      │  │  Mar 17, 12:00 PM         │  │
│  │  First visit."      │  │  💬 2hr reminder sent       │  │
│  │                     │  │                            │  │
│  └────────────────────┘  └────────────────────────────┘  │
│                                                          │
│  [Send SMS] [Call] [Add note] [Start sequence] [Archive] │
└──────────────────────────────────────────────────────────┘
```

### Key Features

- **AI-generated summary:** Auto-created from all interactions. "Sarah is a new patient interested in dental cleaning. Prefers afternoon appointments. First visit scheduled for Thursday."
- **Estimated value:** Configurable during setup (average patient value for dental = $3,200). This is how revenue attribution works.
- **Active sequence indicator:** Shows what follow-up sequence is running, what step it's on, and when the next action fires.
- **Manual override:** User can pause any sequence, add a note, or take over manually at any point.

---

## 8. FOLLOW-UP / WORKFLOW BUILDER

### Default View: Active Follow-Ups

```
┌──────────────────────────────────────────────────────────┐
│  FOLLOW-UPS                    [+ New follow-up]         │
│                                                          │
│  Active: 14 · Paused: 2 · Completed this week: 23       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  MISSED CALL RECOVERY (Template)        Active: 6  │  │
│  │  Trigger: Missed/short call                        │  │
│  │  Steps: SMS (60s) → Call (2h) → SMS (24h)         │  │
│  │  Success rate: 34%  │  Avg time to close: 4.2h    │  │
│  │  [View contacts] [Edit template] [Pause]           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  APPOINTMENT REMINDER (Template)       Active: 5   │  │
│  │  Trigger: Appointment booked                       │  │
│  │  Steps: Confirm SMS → 24h reminder → 2h reminder  │  │
│  │  Show rate: 91%  │  No-shows recovered: 3/mo      │  │
│  │  [View contacts] [Edit template] [Pause]           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  NO-SHOW RECOVERY (Template)           Active: 3   │  │
│  │  Trigger: Missed appointment                       │  │
│  │  Steps: SMS (30m) → Call (next day) → SMS (48h)   │  │
│  │  Recovery rate: 42%                                │  │
│  │  [View contacts] [Edit template] [Pause]           │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Workflow Editor

When editing a template, the user sees a simple linear flow:

```
TRIGGER: [Missed call ▾]
  ↓
STEP 1: [SMS ▾] after [60 seconds ▾]
  Message: "Hi {name}, we missed your call to {business}.
            How can we help? Reply here or we'll call you back."
  ↓
STEP 2: [Call ▾] after [2 hours ▾] if [no reply ▾]
  Script: "Hi, this is {business} calling back about your
           earlier call. How can we help?"
  ↓
STEP 3: [SMS ▾] after [24 hours ▾] if [no reply ▾]
  Message: "Hi {name}, just following up from {business}.
            Book a time here: {booking_link}"
  ↓
STOP WHEN: [Contact replies] or [Appointment booked] or [Opt-out]
```

**Key design decisions:**
- Linear steps, not a branching flowchart (for v1). Branching is a Scale-tier feature.
- Each step is a card that's editable inline
- Variables ({name}, {business}, {booking_link}) are inserted via dropdown, not typed
- "Stop when" conditions are mandatory — every sequence must have an exit
- Preview: "See this from the contact's perspective" button shows the sequence as the contact would experience it

**What to avoid:** Drag-and-drop node-based workflow builders. They look impressive in demos but are confusing for non-technical users. A simple linear step list with conditions is faster to build, easier to understand, and handles 90% of use cases.

---

## 9. ANALYTICS

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  ANALYTICS                     [This month ▾] [Export]   │
│                                                          │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ 342      │ 89       │ 47       │ $24,400  │          │
│  │ Calls    │ Leads    │ Appts    │ Est.     │          │
│  │ answered │ captured │ booked   │ revenue  │          │
│  │ ↑ 18%   │ ↑ 23%   │ ↑ 12%   │ ↑ 15%   │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  CALLS BY HOUR                                     │  │
│  │  [Simple bar chart: 8AM-6PM distribution]          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────────────┐  │
│  │  FOLLOW-UP PERF    │  │  TOP SOURCES               │  │
│  │                    │  │                            │  │
│  │  Missed call recov │  │  Direct call: 67%         │  │
│  │    Sent: 42        │  │  Google: 18%              │  │
│  │    Replied: 14     │  │  Referral: 9%             │  │
│  │    Booked: 8       │  │  Other: 6%                │  │
│  │    Rate: 19%       │  │                            │  │
│  │                    │  │                            │  │
│  │  No-show recovery  │  │                            │  │
│  │    Triggered: 11   │  │                            │  │
│  │    Recovered: 5    │  │                            │  │
│  │    Rate: 45%       │  │                            │  │
│  └────────────────────┘  └────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  USAGE                                             │  │
│  │  Minutes used: 312 / 500           [████████░░]    │  │
│  │  SMS sent: 234                                     │  │
│  │  Emails sent: 67                                   │  │
│  │  Estimated cost this period: $297 + $0 overage     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Design Rules

- Simple bar charts and line charts only. No pie charts, no donut charts, no radar charts.
- Trend indicators on every metric (↑/↓ vs. previous period)
- Follow-up performance is prominent — this is the differentiator metric
- Usage meter is clear and non-threatening. Show it as information, not as a warning until they're at 80%+.

---

## 10. BILLING / USAGE

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  BILLING                                                 │
│                                                          │
│  Current plan: Business ($297/mo)       [Change plan]    │
│  Next billing: April 1, 2026                             │
│  Payment: Visa ····4242                [Update payment]  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  THIS PERIOD USAGE                                 │  │
│  │                                                    │  │
│  │  Voice minutes:  312 / 500     [████████░░] 62%   │  │
│  │  AI agents:      2 / 3                             │  │
│  │  Team members:   2 / 3                             │  │
│  │                                                    │  │
│  │  Estimated overage: $0.00                          │  │
│  │  Overage rate: $0.20/min after 500 min             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  BILLING HISTORY                                   │  │
│  │                                                    │  │
│  │  Mar 1  Business plan     $297.00    ✓ Paid       │  │
│  │  Feb 1  Business plan     $297.00    ✓ Paid       │  │
│  │  Jan 1  Business plan     $341.40    ✓ Paid       │  │
│  │          ($297 + $44.40 overage)                   │  │
│  │                                                    │  │
│  │  [Download invoice] [View all]                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [Cancel plan]  [Switch to annual (save 17%)]            │
└──────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- Usage is visible and clear — no surprises
- Overage is calculated in real-time, not after the fact
- "Switch to annual" is always visible as a gentle upsell
- Cancel is accessible but not prominent — bottom of page, text link
- Billing history shows itemized breakdown including overages

---

## 11. SETTINGS / ADMIN / TEAM

### Settings Hierarchy

```
Settings
├── Business profile (name, address, hours, services)
├── AI Agent
│   ├── Greeting and personality
│   ├── Knowledge base (services, FAQ, policies)
│   ├── Capabilities (book, capture, transfer, text)
│   └── Voice selection
├── Phone
│   ├── Phone numbers
│   ├── Call routing rules
│   ├── Business hours
│   └── After-hours behavior
├── Integrations
│   ├── Calendar (Google, Outlook)
│   ├── CRM webhook
│   └── Zapier
├── Team
│   ├── Members and roles
│   └── Notification preferences
├── Notifications
│   ├── SMS alerts (new leads, missed calls, urgent)
│   ├── Email digest (daily/weekly summary)
│   └── Push notifications
└── Billing (see above)
```

### AI Agent Settings

This is where customization happens — but NOT during onboarding. The defaults should work. Customization is a day-2+ activity.

**Greeting editor:** Text input with preview. "Hear how it sounds" button plays the greeting in the selected voice.

**Knowledge base:** Structured fields (services list, business hours, address, policies) + free-text "Additional information" field. The AI uses all of this to answer caller questions.

**Capabilities toggles:**
- Answer questions about the business ✓
- Book appointments ✓
- Capture lead information ✓
- Send follow-up text after call ✓
- Transfer to human (urgent calls) ✓
- Handle after-hours calls ✓

### Voice Settings

```
┌──────────────────────────────────────────────────────────┐
│  VOICE                                                    │
│                                                          │
│  Current voice: "Rachel" (Natural, Professional)          │
│                                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │Rachel│ │ James│ │ Sofia│ │Marcus│ │  Amy │ │ David││
│  │  ▶   │ │  ▶   │ │  ▶   │ │  ▶   │ │  ▶   │ │  ▶   ││
│  │ Pro  │ │ Warm │ │ Brght│ │ Calm │ │ Frdly│ │ Auth ││
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘│
│                                                          │
│  [Preview with your greeting ▶]                          │
│                                                          │
│  Advanced: Speed [━━━━━●━━━] · Warmth [━━━━━━●━━]       │
│                                                          │
│  Premium voices: [Unlock for $29/mo →]                   │
└──────────────────────────────────────────────────────────┘
```

Each voice card has: name, a one-word personality descriptor, and a play button for a sample. The "Preview with your greeting" button generates the selected voice speaking the user's actual configured greeting. This is a high-impact, low-cost feature that creates emotional connection to the product.

---

## 12. MOBILE UX

### Principles

1. **The mobile app is for monitoring and responding, not for configuration.** Setup, workflow building, and AI training happen on desktop.
2. **The two most important mobile actions:** Read call summaries + reply to leads via SMS.
3. **Push notifications are the mobile entry point.** "New lead: Sarah Chen called about a cleaning. View summary."

### Mobile Layout

**Bottom tab bar:** Dashboard | Inbox | Contacts | Calendar | More

**Dashboard (mobile):** Revenue impact card (simplified to 2 metrics: Calls + Estimated value) → Needs attention items → Recent calls list.

**Inbox (mobile):** Full-width conversation list → tap to open thread → reply via SMS at the bottom.

**Notifications:**
- New lead captured: "🔔 New lead: Sarah Chen (555-0123). Interested in cleaning. Appointment offered."
- Action needed: "⚠️ Mike Johnson requested callback. View details."
- Daily summary: "📊 Today: 8 calls, 3 leads, 2 appointments. Est. value: $1,200."

### Desktop vs. Mobile Feature Parity

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Dashboard | Full layout | Simplified (key metrics) |
| Inbox | Split view (list + detail) | List → detail (stacked) |
| Contacts | Full timeline | Simplified timeline |
| Follow-up builder | Full editor | View-only (edit on desktop) |
| Analytics | Full charts | Summary metrics only |
| Settings | Full access | Basic (voice, notifications) |
| AI training | Full access | Not available |

---

## 13. DESKTOP UX

### Screen Sizes

- **Minimum supported:** 1024px wide
- **Optimal:** 1280-1440px
- **Large screens (1920+):** Content maxes out at 1440px, centered with side padding

### Sidebar Behavior

- Default: expanded (240px wide) showing icons + labels
- Collapsible to 64px (icons only) via toggle
- Auto-collapses on screens below 1280px
- Hover on collapsed sidebar shows tooltip labels

### Keyboard Shortcuts

- `G D` → Go to Dashboard
- `G I` → Go to Inbox
- `G C` → Go to Contacts
- `G A` → Go to Analytics
- `/` → Focus search
- `N` → New follow-up (from Follow-ups page)
- `R` → Reply (in inbox, with conversation selected)
- `?` → Show keyboard shortcuts

### Empty States

Every page must have a useful empty state — not "No data" but guidance:

- **Dashboard (empty):** "Your AI is ready. Call [number] to make your first test call, or forward your business number to start capturing real leads."
- **Inbox (empty):** "No conversations yet. Once calls come in, every conversation appears here with full transcripts."
- **Follow-ups (empty):** "No active follow-ups. Your industry templates are ready — missed call recovery, appointment reminders, and no-show recovery. [Activate templates →]"

---

## SUMMARY OF KEY UX DECISIONS

1. **Revenue impact card is the first and most important UI element.** It appears at the top of the dashboard, in the analytics summary, and in the monthly email digest.

2. **The inbox is the daily driver.** It must be fast, clean, and show the full story of every contact in one timeline.

3. **Onboarding is 3 steps, not 5.** Defaults are smart. Customization is day 2.

4. **The "call your number" moment is the aha experience.** The entire onboarding flow optimizes for this moment.

5. **Follow-up workflows are linear steps, not flowcharts.** Simple enough for a non-technical user.

6. **Mobile is for monitoring and responding. Desktop is for building and configuring.**

7. **Every empty state teaches.** No blank screens.

8. **Engineering vocabulary is gone.** No capsules, no reversion states, no retention intercepts. Just: calls, leads, appointments, revenue.

---

*End of Phase 4. Moving to Phase 5.*
