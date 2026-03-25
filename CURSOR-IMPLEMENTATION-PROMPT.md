# RECALL TOUCH — FULL SYSTEM ENHANCEMENT

Implement every phase below in sequence. Each phase should be a deployable increment. Reference the project doctrine in `.cursor/rules/` for design tokens, tech rules, and component standards.

The existing codebase is at `src/`. Pages are in `src/app/app/`. Components are in `src/components/` and `src/components/ui/`. Lib code is in `src/lib/`. Marketing sections are in `src/components/sections/`.

---

## PHASE 1: DESIGN TOKENS + CORE COMPONENTS

### 1A — Design Tokens
Create `src/lib/design-tokens.ts` exporting color, spacing, radius, shadow, and transition tokens matching the CSS variables already in `globals.css`. Update `src/app/globals.css` to ensure all token values are consistent with:
- Backgrounds: `--bg-primary` #0A0A0B, `--bg-surface` #111113, `--bg-elevated` #1A1A1D, `--bg-hover` #1f1f24
- Accent: `--accent-primary` #4F8CFF, `--accent-secondary` #00D4AA
- Text: `--text-primary` #EDEDEF, `--text-secondary` #8B8B8D, `--text-tertiary` #5A5A5C
- Borders: `--border-default` rgba(255,255,255,0.06), `--border-hover` rgba(255,255,255,0.1), `--border-strong` rgba(255,255,255,0.16)

### 1B — Animation Utilities
Create `src/lib/animations.ts` with reusable Framer Motion presets: `pageTransition`, `fadeInUp`, `scaleIn`, `slideInRight`, `staggerChildren`. Always use `ease: 'easeOut'` (string form, never cubic-bezier array).

### 1C — Component Library
Upgrade existing and create new components in `src/components/ui/`:

**Upgrade existing:**
- `Card.tsx` — add hover border transition (0.2s), shadow on hover, `variant` prop (default | elevated | accent), Framer Motion `whileHover` scale(1.01)
- `Skeleton.tsx` — smooth shimmer animation, variant shapes: `text`, `circle`, `card`, `stat`, `row`
- `EmptyState.tsx` — consolidate `src/components/EmptyState.tsx` and `src/components/ui/EmptyState.tsx` into one. Add: illustration/icon slot (Lucide icon, 48px, text-tertiary), title, description, primary action button, secondary action link
- `PageHeader.tsx` — consistent layout: title (text-2xl font-semibold), description (text-secondary text-sm), right-side action slot (for buttons)
- `ConfirmDialog.tsx` — wrap in new Modal component, add smooth scaleIn animation

**Create new:**
- `Button.tsx` — variants: `primary` (accent bg), `secondary` (border only), `ghost` (no border, subtle hover bg), `danger` (red). Sizes: `sm`, `md`, `lg`. Props: `loading` (shows spinner, disables click), `icon` (Lucide icon left of text). All have `transition-all duration-150`, `focus-visible:ring-2 ring-accent/50 outline-none`.
- `Badge.tsx` — variants: `success` (green bg/text), `warning` (yellow), `error` (red), `info` (blue), `neutral` (gray). Small rounded pill. Props: `dot` (shows colored dot before text).
- `Input.tsx` — dark bg input with border. Props: `label`, `error`, `helperText`, `icon` (left icon). Focus state: accent border. Error state: red border + red helper text.
- `Modal.tsx` — fixed overlay with `bg-black/70 backdrop-blur-sm`. Centered card with `scaleIn` animation. Close on Escape, close on backdrop click. Focus trap. Props: `open`, `onClose`, `title`, `children`, `size` (sm|md|lg).
- `Sheet.tsx` — fixed right panel (width 480px, full height) with `slideInRight` animation. Backdrop overlay. Close on Escape. Props: `open`, `onClose`, `title`, `children`.
- `Tabs.tsx` — horizontal tab bar with animated underline indicator (Framer Motion `layoutId`). Each tab: text-secondary when inactive, text-primary + accent underline when active.
- `StatCard.tsx` — card showing: metric label (text-xs text-tertiary uppercase), value (text-2xl font-semibold, animated count-up on mount), trend (green ↑ or red ↓ arrow with percentage), optional sparkline (tiny 60px wide SVG line chart). Use Framer Motion `useMotionValue` + `animate` for the count-up.
- `KPIRow.tsx` — responsive grid of StatCards. 2 columns on mobile, 4-5 on desktop.
- `Timeline.tsx` — vertical line with event items. Each item: colored dot (left), timestamp (text-xs text-tertiary), title (text-sm), description/outcome badge. Framer Motion stagger animation on mount.
- `AudioPlayer.tsx` — horizontal bar: play/pause button, waveform visualization (use canvas or SVG bars), current time / duration, playback speed toggle (1x/1.5x/2x). Dark surface bg, rounded-lg, subtle border.
- `Tooltip.tsx` — appears on hover after 200ms delay. Dark bg (#1a1a1d), light text, 8px rounded, small arrow. Use Framer Motion for fade-in.
- `CommandPalette.tsx` — triggered by ⌘K / Ctrl+K. Modal overlay with search input at top. Results grouped by type: Leads, Calls, Agents, Pages, Actions. Keyboard navigation (arrow keys + Enter). Recent searches. Framer Motion scaleIn animation.

---

## PHASE 2: SIDEBAR & SHELL (`src/components/Shell.tsx`)

Upgrade the sidebar navigation:

1. **Section grouping:**
```
MAIN
  Dashboard     (/app/activity)
  Agents        (/app/agents)
  Calls         (/app/calls)
  Leads         (/app/leads)
  Campaigns     (/app/campaigns)
COMMUNICATION
  Inbox         (/app/inbox)
  Appointments  (/app/appointments)
INTELLIGENCE
  Call Intelligence  (/app/call-intelligence)
  Analytics          (/app/analytics)
```

2. **Active state:** Left 2px accent-colored border + `bg-white/5` background on active item. Smooth 150ms transition.

3. **Collapse toggle:** Button at bottom of sidebar. Collapsed = icons only (24px), width 64px. Expanded = icons + labels, width 220px. Animate width with Framer Motion.

4. **Bottom section:** Settings gear icon (links to /app/settings), user avatar with name, workspace name at top.

5. **Mobile:** Hide sidebar. Show bottom tab bar with 5 items: Dashboard, Calls, Inbox, Leads, More (opens sheet with remaining nav items).

6. **Header bar** (top of main content area): Include notification bell icon (top right) and ⌘K search trigger button.

---

## PHASE 3: DASHBOARD (`src/app/app/activity/page.tsx`)

Complete redesign of the main dashboard:

### 3A — Greeting Header
- "Good morning, {name}." / "Good afternoon" / "Good evening" based on time
- Subtitle: "Here's what happened today." (or "this week" depending on context)

### 3B — KPI Row
Use `KPIRow` with 4 `StatCard` components:
- **Calls**: total count, 7-day sparkline, trend % vs previous period
- **Answer Rate**: percentage, trend arrow
- **Leads Captured**: count, trend
- **Est. Revenue**: dollar amount, trend
Query from Supabase: `calls` table grouped by date, `leads` table count, calculate revenue estimate.

### 3C — Needs Attention Section
Card with prioritized action items. Query:
- Hot leads (score > 70) not contacted in 24h
- Missed calls from returning callers
- Appointments in next 24h needing confirmation
- Failed webhook deliveries

Each item: urgency icon (red/yellow/green dot), description, timestamp, action button → navigates to relevant detail. If empty: "All caught up" with green checkmark.

### 3D — Activity Feed
Use `Timeline` component. Query recent events from `calls`, `leads`, `appointments` ordered by `created_at DESC` limit 20.

Each item shows: timestamp, event type icon, caller/lead name, outcome badge (e.g., "Booked 2 PM", "Lead captured", "SMS sent"), agent name. Click → navigates to call/lead detail.

Framer Motion stagger animation on mount. If real-time available via Supabase Realtime, subscribe to new events.

### 3E — Setup Checklist (conditional)
Only render if user hasn't completed setup. Show progress: "3 of 5 steps complete" with progress bar.
Steps:
1. Connect phone number → /app/settings/phone
2. Configure AI agent → /app/agents
3. Make a test call → /app/agents (test panel)
4. Review first real calls → /app/calls
5. Go live → dismiss checklist

Each step: checkbox (green when done), title, short description, action button. "Dismiss forever" link at bottom.

### 3F — Empty State (pre-setup, no calls)
Use enhanced `EmptyState`: phone icon, "Your AI agent is ready. Connect your phone to start.", primary button "Connect phone number" → /app/settings/phone, secondary "Make a test call" → /app/agents. Below: "Businesses like yours recover $2,400+/month in missed calls."

---

## PHASE 4: AGENTS (`src/app/app/agents/page.tsx`, `AgentsPageClient.tsx`)

### 4A — Agent List
Show agents as cards in a responsive grid (1 col mobile, 2 col tablet, 3 col desktop).
Each card: agent name, type badge (Receptionist/Sales/Support — use `Badge` component), status indicator (green dot = Active, gray = Inactive, yellow = Draft), stats row (calls handled, last active), quick actions (toggle active, edit, delete).

"Create Agent" button → opens Modal with type selector: Receptionist, Sales, Support, After-Hours, Custom. Each option: icon, name, one-line description. Selecting one starts the wizard with that template pre-loaded.

### 4B — Agent Builder Wizard Enhancement
**Step 1 — Mission:** Add industry template dropdown (Dental, Legal, Plumbing, Real Estate, Auto Repair, Salon, Restaurant, Medical, Insurance, Consulting, Contractor, General). Each template pre-fills greeting text, common Q&A pairs, and behavior rules. Add tone selector: Professional, Friendly, Casual, Formal.

**Step 2 — Voice:** Show voice options as cards with inline play button. Each card plays the user's greeting in that voice. Group by: Male/Female. Show speed slider (0.8x–1.2x).

**Step 3 — Knowledge:** Keep existing Q&A editor. Add: "Import from website" button — takes a URL, calls `/api/agent/extract-business` (already exists), auto-populates Q&A pairs. Add: "Suggest Q&As" button — calls `/api/agent/seed-knowledge` (already exists) to generate industry-specific questions. Organize Q&As with category tabs: General, Hours, Services, Pricing, Policies.

**Step 4 — Behavior:** Visual summary of call flow: Greeting → Qualify → Handle Request → Book/Message/Transfer → Follow-up. Each step is a card showing current config. Editable rules: when to book (always/ask first), when to transfer (keyword triggers, after X failed attempts), after-call actions (send SMS confirmation, create lead, add to calendar). No visual node editor — just clean form inputs for each rule.

**Step 5 — Test (`AgentTestPanel.tsx`):** Enhance with: scenario dropdown (New caller, Pricing inquiry, Appointment booking, Complaint, After-hours). After test call: show transcript with speaker labels, AI-generated summary, and simple score (1-5 stars) for greeting, knowledge, booking, and tone.

**Step 6 — Go Live:** Show forwarding instructions by carrier with collapsible accordions (AT&T, Verizon, T-Mobile, Other). One-click number provisioning if using Vapi number. On success: trigger `Confetti.tsx` animation. Show "What's next" checklist.

---

## PHASE 5: CALL LOG (`src/app/app/calls/page.tsx`, `src/app/app/calls/[id]/page.tsx`)

### 5A — Call List
- Search bar (by caller name or phone number)
- Filter row: Outcome dropdown (All, Booked, Lead Captured, Info Provided, Transferred, Missed), Sentiment dropdown (All, Positive, Neutral, Negative), Date range picker, Agent dropdown
- Sort: Newest first (default), Oldest first, Longest duration, Shortest
- Rich rows: caller name or "Unknown" + phone, duration badge (e.g., "3:42"), outcome badge (color-coded using `Badge`), sentiment emoji, timestamp, agent name
- Hover actions: play icon (inline audio), view transcript icon, add to leads icon
- Pagination: "Showing 1-20 of 156 calls" with prev/next
- Export CSV button (keep existing)

### 5B — Call Detail
When clicking a call, open a `Sheet` from the right showing:
- **Header:** Caller name, phone (link on mobile), date + time, duration, agent name, outcome badge, sentiment badge
- **Audio Player:** `AudioPlayer` component with the call recording
- **Transcript:** Scrollable section with timestamped, speaker-labeled lines (🤖 AI, 👤 Caller). Each line: timestamp, speaker icon, text.
- **AI Summary:** 2-3 sentence summary: who called, what they wanted, what happened, what was decided
- **Actions Taken:** Checklist: ✅ Lead created / ✅ Appointment booked / ✅ SMS confirmation sent / ✅ Added to Google Calendar (only show actions that actually occurred)
- **Notes:** Textarea for human notes (save to Supabase on blur)
- **Actions bar:** Buttons: "Call back", "Send SMS", "Add to leads" (if not already), "Flag for review"

---

## PHASE 6: LEADS (`src/app/app/leads/page.tsx`)

### 6A — View Toggle
Two view modes: Table and Board. Toggle buttons in the header.

**Table view:**
Columns: Name, Phone, Source (badge: Inbound/Outbound/Website/Referral), Score (0-100, color-coded circle), Stage (badge), Last Contact (relative time), Agent. Sortable by clicking column headers. Click row → opens Sheet.

**Board (Kanban) view:**
Columns: New → Contacted → Qualified → Appointment Set → Won → Lost. Each column: header with count, droppable area. Cards: name, phone, score badge (🔴 hot 70+ / 🟡 warm 40-69 / 🔵 cold 0-39), source icon, relative timestamp.

Implement drag-and-drop using a lightweight approach: `onDragStart`/`onDragOver`/`onDrop` HTML5 drag events, or install `@dnd-kit/core` if a library is preferred. On drop: update lead `stage` in Supabase, show optimistic UI.

### 6B — Lead Detail Sheet
Slide-in `Sheet` showing:
- **Contact:** Name, phone, email, company (all editable inline)
- **Score:** Circular badge (0-100) with color. Hover shows breakdown: "+20 booked appt", "+15 asked pricing", "-10 said 'just browsing'"
- **Stage:** Dropdown to change stage
- **Timeline:** All interactions chronologically — calls (with play button from `AudioPlayer`), SMS, appointments, notes, stage changes. Use `Timeline` component.
- **AI Summary:** "Called twice about pricing. Comparing competitors. Recommend calling with discount."
- **Quick actions:** Call, Text, Email, Schedule, Add note
- **Tags:** Pill badges, add/remove custom tags
- **Notes:** Text area, timestamped entries

### 6C — Lead Scoring
Create `src/lib/lead-scoring.ts`: calculate score based on signals from the lead's interactions. Factors: call count (+10 each), call duration > 2min (+15), positive sentiment (+20), asked about pricing (+15), booked appointment (+25), returned caller (+20), negative sentiment (-15), said "just browsing" (-10). Clamp 0-100. Recalculate on each new call/event. Store in `leads.score` column.

### 6D — Add Lead
"Add lead" button → Modal with form: Name, Phone, Email (optional), Company (optional), Source (dropdown), Notes. Creates lead in Supabase with stage "New" and score 0.

---

## PHASE 7: INBOX (`src/app/app/inbox/page.tsx`)

### 7A — Three-Panel Layout
- **Left panel** (280px): Conversation list. Each item: contact name/phone, last message preview (truncated), timestamp, unread dot indicator. Sorted by most recent. Search bar at top. Filter tabs: All, Unread, Phone, SMS, Email, WhatsApp.
- **Center panel** (flex): Message thread. Chronological list of all interactions with selected contact.
- **Right panel** (300px, collapsible): Contact details — name, phone, email, lead score, stage, upcoming appointments, tags, notes. Quick actions: Call, Text, Schedule.

### 7B — Message Thread
- **Call entries:** Card with: phone icon, "Call — 3:42", outcome badge, play button to hear recording, expandable transcript
- **SMS messages:** Chat bubbles. AI/system (left, gray bg) vs outbound/user (right, accent bg). Timestamp below each.
- **System events:** Small centered text: "Lead created", "Appointment booked", "Stage changed to Qualified"
- **Quick reply bar:** Text input at bottom with send button. Template picker dropdown with common responses.

### 7C — Real-time
If Supabase Realtime is set up: subscribe to new messages/calls for the selected contact. New items animate in at the bottom.

---

## PHASE 8: ANALYTICS (`src/app/app/analytics/page.tsx`)

### 8A — Time Range Selector
Keep existing Today/7D/30D/90D toggle. Add custom date range picker (two date inputs with calendar dropdown).

### 8B — KPI Summary Row
Top of page: `KPIRow` with 5 stats: Total Calls, Avg Handle Time, Lead Conversion %, Appointments Booked, Est. Revenue Impact. Each with trend vs previous period.

### 8C — Charts
Install `recharts` if not already present (`npm install recharts`).

**Call Volume (AreaChart):** Gradient-filled area chart. X-axis: time (hours if Today, days if 7D/30D, weeks if 90D). Y-axis: call count. Tooltip on hover. Responsive.

**Outcome Breakdown (PieChart/DonutChart):** Segments: Booked, Lead Captured, Info Provided, Transferred, Missed. Center label: total. Custom colors per segment. Legend below.

**Peak Hours Heatmap:** 7 rows × 24 columns grid. Each cell colored by intensity (use accent color with varying opacity). Tooltip: "Tuesday 10 AM: 12 calls". Build with plain divs + CSS grid, not a chart library.

**Lead Funnel:** Vertical sections: Calls → Leads → Qualified → Appointments → Won. Each section: count and conversion rate to next stage. Build with styled divs (decreasing widths).

### 8D — AI Insights Panel
Below charts: 3-5 insight cards. Generate from data queries:
- "Your answer rate is X% — [up/down] Y% from last period"
- "Peak call time: [Day] at [Hour] — your AI handled X calls"
- "X callers asked about [topic]. [Add to knowledge base →]"
- "Your AI booked X appointments this period, worth est. $Y"

Each insight: icon, text, optional action button/link.

---

## PHASE 9: CAMPAIGNS (`src/app/app/campaigns/page.tsx`)

### 9A — Campaign List
Cards in a grid. Each card: campaign name, type badge (Call / SMS / Multi-touch), status badge (Draft / Active / Completed / Paused), progress bar (X of Y contacted), date created.
Actions: Edit, Pause/Resume, Duplicate, Delete.
"Create Campaign" button → opens campaign builder.

### 9B — Campaign Builder (multi-step form)
**Step 1 — Basics:** Name, type (Call campaign / SMS campaign / Multi-touch sequence), description.

**Step 2 — Audience:** Select leads by: stage (checkboxes), score range (slider), tags, source. Or upload CSV. Or enter phone numbers manually. Show count: "47 leads selected".

**Step 3 — Content:** For SMS: text editor with merge fields `{name}`, `{company}`. Character count. For Call: select which AI agent handles the calls. For Multi-touch: sequence builder — ordered list of steps. Each step: type (Call/SMS), delay (days after previous), content/agent. Add/remove/reorder steps.

**Step 4 — Schedule:** Start date, call window (start time, end time, timezone), pace (calls per hour), days of week. Compliance warning: "Calls will only be placed during the selected window."

**Step 5 — Review:** Summary of everything. "Launch Campaign" button. Confirmation modal.

### 9C — Campaign Detail
After launch: live dashboard showing:
- Progress bar: X of Y contacted
- Outcome counts: Connected, Booked, No Answer, Opted Out
- Activity log: each attempt with timestamp, contact, result

---

## PHASE 10: CALL INTELLIGENCE (`src/app/app/call-intelligence/page.tsx`)

### 10A — Overview Dashboard
Instead of just a paste box, show:
- Recent analyzed calls (pull from `calls` table with transcripts)
- Key metrics: avg call duration, booking rate, sentiment distribution
- Top mentioned topics (word frequency from transcripts)

### 10B — Call Analysis View
Click any call to see:
- Full transcript with speaker labels
- AI summary
- Coaching scores: Greeting (1-5), Discovery (1-5), Objection Handling (1-5), Closing (1-5) — call the existing analytics API or use Claude to score
- Key moments highlighted in transcript (questions, objections, commitments, pricing mentions)
- Action items extracted: "Customer wants quote by Friday", "Follow up on insurance question"

### 10C — Keep the Paste Box
Keep the existing transcript paste/analysis feature as a secondary tab: "Analyze transcript" — for manually pasting external transcripts.

---

## PHASE 11: SETTINGS

### 11A — Settings Hub (`src/app/app/settings/page.tsx`)
Left sidebar within settings page:
- General (/settings/business) — existing
- Team (/settings/team) — existing
- Phone (/settings/phone) — existing
- Integrations (/settings/integrations) — existing
- Billing (/settings/billing) — existing
- Notifications (/settings/notifications) — existing
- Compliance (/settings/compliance) — existing
- Developer (/app/developer) — existing

Each settings page: consistent layout with `PageHeader` + form sections with cards.

### 11B — Billing Enhancement (`src/app/app/settings/billing/page.tsx`)
- Visual usage meter: progress bar showing minutes used vs included (e.g., "127 / 400 min")
- Usage breakdown: inbound minutes, outbound calls, SMS count — small stat row
- Current plan card with features listed
- "Change plan" → modal showing plan comparison
- Invoice history link to Stripe portal
- Payment method display with update button

### 11C — Integration Enhancement (`src/app/app/settings/integrations/page.tsx`)
- Each integration as a card: icon, name, status badge (Connected/Not connected), description, action button (Connect/Manage/Disconnect)
- **Google Calendar:** "Connect" button triggers OAuth flow if available, or shows setup instructions
- **CRM Webhook:** URL input, event checkboxes (Lead captured, Appointment booked, Deal at risk, Reactivated lead), "Test webhook" button, "Save" button. Show last delivery status.
- **Slack:** Webhook URL input, event selector, test button.
- Show connection health: last sync timestamp, error count if any.

---

## PHASE 12: GLOBAL UX

### 12A — Command Palette
Wire `CommandPalette.tsx` into the root layout. Listen for ⌘K/Ctrl+K globally. Search sources: leads (name, phone), calls (caller name), agents (name), pages (Dashboard, Agents, Calls, etc.), actions (Make a call, Create lead, etc.).

### 12B — Notifications
Add bell icon to Shell header. Click → dropdown with recent events: new calls, new leads, appointments, system alerts. Unread count badge. "Mark all read" button. Each notification clickable → navigates to relevant item.

### 12C — Keyboard Shortcuts
- ⌘K — Command palette
- ⌘1-5 — Navigate main sections
- Esc — Close modal/sheet
- Add `?` shortcut → shows overlay listing all shortcuts

### 12D — Loading States
Replace every `loading.tsx` in `src/app/app/*/` with skeleton screens using `Skeleton` component that match the actual page layout. No more generic spinners.

### 12E — Mobile Responsive
- Sidebar → hamburger menu + bottom tab bar (Dashboard, Calls, Inbox, Leads, More)
- Tables → card list on mobile
- Sheets → full-screen on mobile
- Click-to-call on phone numbers (`<a href="tel:...">`)
- Touch-friendly tap targets (min 44px)

---

## PHASE 13: LANDING PAGE

### 13A — Hero (`src/components/sections/Hero.tsx`)
- Animated gradient mesh background: 2-3 large gradient blobs with slow CSS `@keyframes` movement
- Voice orb (existing `VoiceOrb.tsx`): add pulsing glow ring animation when idle
- "500+ businesses · 10,000+ calls" — animate numbers counting up on scroll into view (Intersection Observer + Framer Motion)

### 13B — Demo Section
- "Hear the difference" tabs: each scenario tab should have an actual audio play button
- Use `AudioPlayer` or simplified `Waveform.tsx` for inline playback
- Animated call card (existing `ActivityFeedMockup.tsx`) — add subtle slide-in animation

### 13C — Pricing
- Growth plan: larger card, accent border-glow (`box-shadow: 0 0 20px rgba(0,212,170,0.15)`), "Most Popular" badge
- Monthly/Annual toggle with "Save 20%" label on annual
- Each plan: ROI tagline below price

### 13D — Social Proof (`src/components/sections/SocialProof.tsx`)
- Testimonial cards: quote text, attribution (name, title, company), 5-star rating, subtle card hover effect
- Optional: horizontal auto-scroll carousel

### 13E — Trust & Footer
- Trust badges (SOC 2, GDPR, encryption, uptime) — larger, more prominent
- "Built on" row: Vapi, ElevenLabs, Claude, Twilio logos
- Proper footer: columns for Product, Company, Resources, Legal

---

## PHASE 14: PERFORMANCE

- Server Components for all data-fetching pages (no `'use client'` unless interactivity needed)
- `Suspense` boundaries wrapping every data-fetching section with matching `Skeleton` fallback
- Lazy load: modals, sheets, charts, command palette (dynamic import)
- Next.js `<Image>` for all images
- Prefetch sidebar links on hover
- Ensure Supabase queries use indexes on: `workspace_id`, `created_at`, `caller_phone`, `outcome`, `stage`, `score`
- Target: LCP < 1.5s, FID < 100ms, CLS < 0.1
