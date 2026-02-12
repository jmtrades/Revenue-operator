# Product Philosophy Audit

Audit of the Revenue Continuity repository against `.cursor/rules/product-philosophy.md`.

**Rule:** The product must feel like "A team is already working for me in the background" — NOT "A dashboard I need to operate."

---

## 1. Critical violations (breaks trust immediately)

### C1. Dashboard shown before belief — no first-experience simulation

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/onboarding/page.tsx` (line 35); `src/app/activate/page.tsx` (lines 29–34) |
| **Behavior** | After connect/skip, user is redirected straight to `/dashboard`. No full-screen live state. No "We're now maintaining conversations for you" moment. |
| **Why it violates** | Spec: "Immediately after connection → never show dashboard." "NO dashboard shown until activity simulation completes." User sees a control surface before experiencing the product as operational. |
| **Psychological interpretation** | User interprets: "I'm in a tool I need to manage" before "this is already working for me." |
| **Exact rewrite** | After activation, redirect to `/dashboard/first-experience?workspace_id=…` (new page). Full-screen: title "We're now maintaining conversations for you", live feed (e.g. "Prepared response for Daniel", "Follow-up scheduled for Sarah") animating over ~4 seconds, then single CTA "Go to overview" → `/dashboard`. Never render the main dashboard until user completes this flow. |

### C2. "View dashboard" exposes tool framing

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/activation/page.tsx` (line 88) |
| **Behavior** | "Protection is live. View dashboard →" |
| **Why it violates** | Reinforces "dashboard" = something to operate. Product law: user does not manage; they only take calls. |
| **Psychological interpretation** | User thinks: "Now I go manage my dashboard." |
| **Exact rewrite** | "Protection is live. Go to overview →" (and link to `/dashboard` if URL stays same, but label must never say "dashboard"). |

### C3. Proof Drawer exposes internal AI reasoning to users

| Field | Detail |
|-------|--------|
| **File** | `src/components/ProofDrawer.tsx` (lines 43–52, 119–138, 194–207, 218–227) |
| **Behavior** | Tabs: "Events", "Actions", "Messages & Reasoning", "Policy Reasoning", "Stability", "Counterfactual", "Learning sources (internal)". Shows `reasoning`, `policy_reasoning`, `JSON payload`, "Sequence step", "Held back: cooldown.reason". |
| **Why it violates** | Spec: "Never expose internal AI or technical reasoning to the user." |
| **Psychological interpretation** | User interprets: "This is a system I need to understand and debug." |
| **Exact rewrite** | Rebrand as "What we're maintaining" or "Proof of continuity." Show only outcome summaries: e.g. "Conversation kept active", "Follow-up scheduled", "Attendance confirmed." Remove: Policy Reasoning, Counterfactual, Learning sources, raw events/actions payloads. Stability tab: show "Next planned touch" and "Held until" only — no cooldown reasons, no sequence step numbers. |

### C4. First Visit Overlay appears on dashboard, not instead of it

| Field | Detail |
|-------|--------|
| **File** | `src/components/FirstVisitOverlay.tsx`; `src/app/dashboard/layout.tsx` |
| **Behavior** | Overlay shows on top of the dashboard. User already sees nav, sidebar, empty/loading overview before overlay. |
| **Why it violates** | Spec: "Show live state before dashboard." Belief must come first; the overlay is a band-aid on a wrong flow. |
| **Psychological interpretation** | User interprets: "I'm in a dashboard; this popup is explaining it." |
| **Exact rewrite** | Remove FirstVisitOverlay from layout. Replace with the dedicated first-experience page (see C1). First-experience page becomes the gate; overlay is unnecessary. |

### C5. Settings "high_urgency" communication style

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/settings/page.tsx` (lines 115–118) |
| **Behavior** | Option: "high_urgency — Action-oriented — time-sensitive" |
| **Why it violates** | Product law: "No urgency tactics." Behavioral rules forbid pressure and urgency. |
| **Psychological interpretation** | User interprets: "I can make the system push harder." |
| **Exact rewrite** | Remove `high_urgency`. Keep only: "Direct — short and clear" and "Consultative — warm, asks questions." Rename labels to plain language: "How we sound: Clear and direct" vs "Warm and clarifying." |

---

## 2. Experience friction (forces user to think)

### E1. "Select an account" — configuration moment before observation

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/page.tsx` (lines 231–236); `src/app/dashboard/layout.tsx` (WorkspaceSelect); `conversations/page.tsx` (204); `calls/page.tsx` (78); `revenue/page.tsx` (46); `reports/page.tsx` (48); `continue-protection/page.tsx` (40); `activation/page.tsx` (40) |
| **Behavior** | When no workspace selected: "Select an account" or "Select an account to view status." Multi-workspace users must choose before seeing anything. |
| **Why it violates** | Flow must be Connect → Observe → Trust. Making them "select" before observing adds a configuration step. |
| **Psychological interpretation** | User interprets: "I need to configure before I can use this." |
| **Exact rewrite** | Single-workspace: auto-select, no prompt. Multi-workspace: show "We're maintaining conversations for: [workspace name]" with a subtle switcher — never "Select an account to view status." Copy: "Which conversation set?" or "Switch context" instead of "Select account." |

### E2. Empty states in conversation columns

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/conversations/page.tsx` (lines 234–239, 262–267, 286–291) |
| **Behavior** | When a column has no leads: "Preparing / Warming conversations. Call readiness building." "Recovering / Keeping engagement. No interventions needed right now." "Watching / Scanning cooling conversations. All protected." |
| **Why it violates** | Product law: "Never show idle states." These are empty-column states that force the user to interpret system state. |
| **Psychological interpretation** | User interprets: "Is something wrong? What should I do?" |
| **Exact rewrite** | Replace empty slots with rotating routine text (like Overview): "Watching reply windows", "Maintaining engagement intervals", "Confirming attendance" — same style as ContinuityMonitoringPanel. Never show an empty card; show continuous activity language. |

### E3. Calendar empty state

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/calls/page.tsx` (lines 96–108) |
| **Behavior** | "No calls in the next 48 hours. We prepare each one when booked." Plus link "Connect calendar →" |
| **Why it violates** | Empty state + action prompt = user must act. |
| **Psychological interpretation** | User interprets: "I need to connect something." |
| **Exact rewrite** | Never say "No calls." Say: "Protecting booked calls. We prepare each one when it lands on your calendar." Show rotating lines: "Confirming attendance", "Monitoring upcoming calls", "Preparing for next conversations." If calendar not connected: single line "Connect your calendar so we can protect your calls" — minimal, not an empty-state block. |

### E4. "Strategy today" / "Strategy" wording

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/page.tsx` (lines 361–368) |
| **Behavior** | Section "Strategy today" with text like "Balanced", "Increasing recovery", "Reducing pressure". |
| **Why it violates** | "Strategy" implies user should care about system logic. |
| **Psychological interpretation** | User interprets: "I need to understand what the system is doing." |
| **Exact rewrite** | Rename to "What we're doing now" or "Current focus." Replace "Increasing recovery" with "Recovering cooling conversations" (outcome, not strategy). |

### E5. "Risk surface" section

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/page.tsx` (lines 324–347) |
| **Behavior** | "Risk surface" heading, "risk_reason", "recommended_protection", "Rescue in progress", "Confirmation needed". |
| **Why it violates** | Technical/internal framing. User shouldn't manage risk; they should feel "we're watching over this." |
| **Psychological interpretation** | User interprets: "I need to understand risk and take action." |
| **Exact rewrite** | Rename to "Conversations we're watching" or "Needs attention." Use outcome language: "Confirming attendance for Alex" instead of "confirmation needed." "Recovering conversation with Mike" instead of "rescue in progress." Remove "recommended_protection" and "risk_reason" from user-facing copy. |

### E6. CoverageLimitedBanner: "Enable protection" CTA

| Field | Detail |
|-------|--------|
| **File** | `src/components/CoverageLimitedBanner.tsx` (lines 34–40) |
| **Behavior** | "Coverage limited. Calendar and post-call continuity active. Enable phone protection to maintain conversations on your existing number." Button: "Enable protection". |
| **Why it violates** | Configuration CTA before observation. User is asked to act before trusting. |
| **Psychological interpretation** | User interprets: "I need to enable more stuff." |
| **Exact rewrite** | Soften: "Calendar and post-call continuity are active. Add your phone number in Settings when you're ready — we'll maintain conversations on your existing number." Button: "Add phone" or "Connect phone" — not "Enable protection." |

---

## 3. CRM leakage (feels like a tool the user operates)

### L1. "Revenue supervision" sidebar label

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/layout.tsx` (lines 27–29) |
| **Behavior** | "Revenue supervision" / "Your conversations are being watched over" |
| **Why it violates** | "Supervision" suggests user supervises; law says system operates, user takes calls. |
| **Psychological interpretation** | User interprets: "I'm supervising a system." |
| **Exact rewrite** | "Revenue Continuity" or "Conversation continuity." Sub: "We maintain. You take the calls." |

### L2. Nav labels: Overview, Conversations, Calendar, Performance, Reports, Settings

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/layout.tsx` (lines 13–19) |
| **Behavior** | Standard nav labels. |
| **Why it violates** | "Reports", "Settings", "Performance" are tool/category labels. |
| **Psychological interpretation** | User interprets: "This is a reporting and settings tool." |
| **Exact rewrite** | Keep "Overview", "Conversations", "Calendar". Rename "Performance" → "Outcomes". Rename "Reports" → "Proof" (matches spec). Rename "Settings" → "How we work" or "Protection scope". |

### L3. "View details" on lead cards

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/conversations/page.tsx` (line 193); `src/app/dashboard/calls/page.tsx` (line 156); `src/app/dashboard/reports/page.tsx` (line 130) |
| **Behavior** | "View details" link. |
| **Why it violates** | CRM-style drill-down language. |
| **Psychological interpretation** | User interprets: "I'm inspecting a record." |
| **Exact rewrite** | "Prepare for call" or "See context" — outcome-focused. |

### L4. "Relationship built: X%" and progress bar

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/conversations/page.tsx` (lines 174–186) |
| **Behavior** | Lead cards show "Relationship built: X%" with a bar. |
| **Why it violates** | Metrics/CRM feel. Spec: card shows "relationship percent", "current responsibility", "next planned touch" — but "Relationship built" sounds like a score to optimize. |
| **Psychological interpretation** | User interprets: "I'm managing relationship health." |
| **Exact rewrite** | "Readiness for call: X%" or "Call readiness: X%". Or drop the number and show only "Ready" / "Being warmed" / "Cooling" as status. Minimize metric feel. |

### L5. Settings: TEAM_ROLES and "hired roles"

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/settings/page.tsx` (lines 7–14) — TEAM_ROLES referenced in UI or API; coverage section presets |
| **Behavior** | "Qualifier", "Setter", "Show Manager", "Follow-up Manager", "Revival Manager", "Full department". Presets: "Solo closer", "Agency", "SaaS". |
| **Why it violates** | User configures "roles" and "coverage scope" — management burden. |
| **Psychological interpretation** | User interprets: "I'm staffing a system." |
| **Exact rewrite** | If these must stay, hide under "Advanced" or "Protection scope". Use plain language: "What we handle: replies and follow-ups", "booking and attendance", "after-call follow-ups" — no role names. Presets: "Just follow-ups", "Full continuity", "Attendance only" — no "Solo closer/Agency/SaaS." |

### L6. "Request follow-up" button on lead detail

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/leads/[id]/page.tsx` (lines 230–235) |
| **Behavior** | Under "Take control": "Request follow-up" button. |
| **Why it violates** | User triggers an action — feels like managing. |
| **Psychological interpretation** | User interprets: "I'm queuing tasks." |
| **Exact rewrite** | Reframe as intervention, not request: "Queue a follow-up" or "Add a touch" — or better: "Ask us to follow up" (system does it; user doesn't "request" like a ticket). Spec says "Take control" for rare intervention; keep that, but button copy: "Add follow-up touch" — outcome, not request. |

### L7. Lead detail: "View details" opens Proof Drawer

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/leads/[id]/page.tsx` (line 241) |
| **Behavior** | Under "Take control", "View details" opens ProofDrawer with Events, Actions, Policy, etc. |
| **Why it violates** | Exposes internal reasoning (see C3). |
| **Psychological interpretation** | User interprets: "I'm debugging." |
| **Exact rewrite** | Rename to "Proof of continuity" and surface only outcome summaries (per C3). |

### L8. "Proof" button on conversation cards

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/conversations/page.tsx` (lines 167–173) |
| **Behavior** | Small "Proof" button on each card. |
| **Why it violates** | Invites inspection of internals. |
| **Psychological interpretation** | User interprets: "I need to verify what happened." |
| **Exact rewrite** | Either remove, or relabel "See what we've done" and show only outcome bullets — no Events/Actions/Policy tabs. |

---

## 4. Copy violations (language breaks illusion)

### P1. Landing CTA: "See it work"

| Field | Detail |
|-------|--------|
| **File** | `src/app/page.tsx` (lines 70–74, 161) |
| **Behavior** | Primary CTA: "See it work" |
| **Why it violates** | Spec: "Start 14-day protection". |
| **Psychological interpretation** | "See it work" = demo; "Start protection" = commitment. |
| **Exact rewrite** | "Start 14-day protection" |

### P2. Activate page: "More calls on your calendar"

| Field | Detail |
|-------|--------|
| **File** | `src/app/activate/page.tsx` (line 44) |
| **Behavior** | "More calls on your calendar" |
| **Why it violates** | Spec hero: "More real conversations happen on your calendar." |
| **Psychological interpretation** | Minor; "calls" vs "conversations" — prefer "conversations." |
| **Exact rewrite** | "More real conversations on your calendar" |

### P3. "Will not send outside configured hours"

| Field | Detail |
|-------|--------|
| **File** | `src/app/page.tsx` (line 193); `src/app/api/assurance/protection-standards/route.ts` |
| **Behavior** | Operational guarantee: "Will not send outside configured hours" |
| **Why it violates** | "Configured" = user configuration. |
| **Psychological interpretation** | User interprets: "I configured something." |
| **Exact rewrite** | "Only during business hours" or "Respects your business hours" — avoid "configured." |

### P4. FirstVisitOverlay: "Got it"

| Field | Detail |
|-------|--------|
| **File** | `src/components/FirstVisitOverlay.tsx` (line 75) |
| **Behavior** | Button: "Got it" |
| **Why it violates** | Spec first-experience CTA: "Go to overview." |
| **Psychological interpretation** | "Got it" = acknowledgment; "Go to overview" = next step. |
| **Exact rewrite** | "Go to overview" (and gate behind first-experience page per C1/C4). |

### P5. "Back to conversations"

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/leads/[id]/page.tsx` (line 125) |
| **Behavior** | "← Back to conversations" |
| **Why it violates** | "Back" = navigation; can imply user is managing. |
| **Psychological interpretation** | Minor; acceptable if rest is aligned. |
| **Exact rewrite** | "← Conversations" or "← Overview" — drop "Back to." |

### P6. TrialBanner: "Check Overview for your projection"

| Field | Detail |
|-------|--------|
| **File** | `src/components/TrialBanner.tsx` (line 124) |
| **Behavior** | "Check Overview for your projection." |
| **Why it violates** | "Check" = user action; "projection" = metric. |
| **Psychological interpretation** | User interprets: "I need to check something." |
| **Exact rewrite** | "Activity appears in Overview as we work." or remove that line. |

### P7. "Loading…", "Redirecting…"

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/onboarding/page.tsx` (Suspense fallback); `src/app/dashboard/leads/page.tsx` (line 13); `src/app/dashboard/pipeline/page.tsx` |
| **Behavior** | "Loading…", "Redirecting…" |
| **Why it violates** | Technical status, not outcome. |
| **Psychological interpretation** | User interprets: "Something is loading." |
| **Exact rewrite** | "Watching over" or "Preparing…" — reuse continuity language. |

### P8. Activation: "View dashboard →"

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/activation/page.tsx` (line 88) |
| **Behavior** | "View dashboard →" |
| **Why it violates** | See C2. |
| **Exact rewrite** | "Go to overview →" |

---

## 5. Missing beliefs (moments that should exist but don't)

### M1. No dedicated first-experience page before dashboard

| Field | Detail |
|-------|--------|
| **File** | N/A — missing |
| **Behavior** | After connect, user goes straight to dashboard. No full-screen "We're now maintaining conversations for you" with live feed. |
| **Why it matters** | Spec: retention comes from belief before tool. |
| **Exact addition** | New route: `/dashboard/first-experience`. Full-screen, title "We're now maintaining conversations for you". Animated feed items over ~4s ("Prepared response for Daniel", "Follow-up scheduled for Sarah"). Single CTA "Go to overview". Onboarding and activation redirect here first; redirect to `/dashboard` only after completion or if user has seen it before. |

### M2. No global "next attention" in header when no workspace

| Field | Detail |
|-------|--------|
| **File** | `src/components/HeartbeatBar.tsx` |
| **Behavior** | HeartbeatBar returns null when `!workspaceId`. |
| **Why it matters** | Header should always show a heartbeat when user is logged in — even before workspace selected. |
| **Psychological interpretation** | User in limbo sees nothing. |
| **Exact addition** | When no workspace: show "We're ready. Connect or select where we maintain conversations." With subtle pulse. Never completely blank. |

### M3. Overview doesn't start with "We are maintaining X conversations"

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/page.tsx` |
| **Behavior** | Top section: "Conversations currently maintained: X" and "All conversations maintained" / "Some need attention" / "At risk." |
| **Why it matters** | Spec: "We are maintaining 18 conversations" — large assurance. |
| **Psychological interpretation** | Close; "currently maintained" is slightly passive. |
| **Exact addition** | Lead with large type: "We are maintaining {N} conversations." Then status line. Match spec tone. |

### M4. No rotating routine feed when overview has no activity

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/page.tsx` |
| **Behavior** | ContinuityMonitoringPanel uses responsibilityItems or ROTATING_ROUTINES. When demo/empty, we show routines — good. |
| **Why it matters** | Always show ongoing activity; never static "nothing happening." |
| **Psychological interpretation** | Already partially done; ensure every empty path uses routines. |
| **Exact addition** | Audit all empty/loading states: each must show rotating routines. No "Watching over" alone — always pair with at least one routine line. |

### M5. Calendar page doesn't show "Attendance confidence: High/Medium/Low" prominently

| Field | Detail |
|-------|--------|
| **File** | `src/app/dashboard/calls/page.tsx` |
| **Behavior** | Uses "Call stability: Low/Medium/High" and "Prepared/Confirming/Monitoring/Recovering." |
| **Why it matters** | Spec: "Attendance confidence: High/Medium/Low" and "Preparation: Prepared/Confirming/Monitoring." |
| **Psychological interpretation** | "Stability" vs "Attendance confidence" — latter is spec. |
| **Exact addition** | Add explicit "Attendance confidence" label (or replace "Call stability" with it). Ensure "Preparation" state is clear. |

### M6. Landing: no auto-playing Live Story Panel per spec

| Field | Detail |
|-------|--------|
| **File** | `src/app/page.tsx` |
| **Behavior** | LiveFeed shows 4 items with delays; caption "Your calendar" and "Running X:XX". Spec: "Every 3 seconds animate" a sequence; caption "This runs automatically once connected." |
| **Why it matters** | Spec: "Live Story Panel (auto playing — critical)". |
| **Psychological interpretation** | Current feed is good but caption and cadence differ from spec. |
| **Exact addition** | Caption under feed: "This runs automatically once connected." Consider 3s cadence for items. Ensure sequence matches spec: "Someone asked a question" → "Response prepared" → "Follow-up scheduled" → "Call booked" → "Reminder sent" → "They showed up." |

### M7. Billing: no Day 11 "X conversations will lose continuity" before continue

| Field | Detail |
|-------|--------|
| **File** | `src/components/TrialBanner.tsx` |
| **Behavior** | Day 11: "Protection will pause automatically unless continued" and count of conversations at risk. |
| **Why it matters** | Spec: Day 11 shows "7 conversations will lose continuity within the next hour" with "Keep coverage active." |
| **Psychological interpretation** | Already present; verify copy and prominence. |
| **Exact addition** | Ensure Day 11 banner uses exact framing: "{N} conversations will lose continuity within the next hour" when N > 0. Sub: "Momentum fades if continuity stops. We maintain — you take the calls." |

---

## Summary by severity

| Severity | Count | Priority |
|----------|-------|----------|
| Critical | 5 | Fix first |
| Experience friction | 6 | Fix with flow changes |
| CRM leakage | 8 | Fix with copy/UI reframe |
| Copy violations | 8 | Fix with copy changes |
| Missing beliefs | 7 | Add net-new experiences |

---

## Implementation order (recommended)

1. **C1, C4, M1** — First-experience page, remove overlay, gate dashboard
2. **C2, C5, P8** — Remove "dashboard" and "high_urgency"
3. **C3** — Proof Drawer outcome-only
4. **E1, E2, E3** — Replace "Select account" and empty states with activity language
5. **L1, L2, P1, P3** — Nav/sidebar and landing CTA
6. **E4, E5, E6** — Strategy, Risk surface, Coverage banner
7. **L3–L8** — Cards, roles, buttons
8. **M2–M7** — Heartbeat, overview copy, calendar, landing panel, billing
