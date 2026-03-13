You are an implementation engineer. This is the DEFINITIVE, ALL-ENCOMPASSING fix prompt for recall-touch.com. It covers EVERY remaining issue across the entire codebase. Do NOT stop until every single item is complete. Do NOT skip anything. Do NOT narrate — just implement.

---

# COMPLETE SYSTEM FIX — recall-touch.com

**Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, next-intl ^4.8.3, Supabase, Vercel
**Locales:** en, es, fr, de, pt, ja — files at `src/i18n/messages/{locale}.json`
**Title template:** `"%s — Recall Touch"` in `src/app/layout.tsx`

**IMPORTANT RULES:**
- When adding i18n keys to `en.json`, you MUST also add the translated equivalents to ALL 5 other locale files (es, fr, de, pt, ja). Use high-quality translations — not Google Translate quality.
- Pages using `useTranslations()` (no namespace) access keys via `t("namespace.keyName")`.
- Pages using `useTranslations("namespace")` access keys via `t("keyName")`.
- Never use `o.label` — always use `t()` for user-visible text.
- After ALL fixes, run `npm run build` and `npx tsc --noEmit`. Both must pass with zero errors.

---

## SECTION 1: KNOWLEDGE PAGE (4 remaining strings)

**File:** `src/app/app/knowledge/page.tsx`
**Namespace:** `useTranslations("knowledge")` → variable `t`

### 1A. Add keys to `knowledge` object in ALL 6 locale files:

**en.json:**
```json
"closeModal": "Close",
"importUrlPlaceholder": "https://yourbusiness.com/faq",
"updatedAt": "Updated {date}"
```

**Translate these into es, fr, de, pt, ja and add to their respective `knowledge` objects.**

### 1B. Replace in knowledge/page.tsx:

| Line | Before | After |
|------|--------|-------|
| ~154 | `aria-label="Close"` | `aria-label={t("closeModal")}` |
| ~663 | `placeholder="https://yourbusiness.com/faq"` | `placeholder={t("importUrlPlaceholder")}` |
| ~812 | `"Updated " + formatDate(...)` or similar | `t("updatedAt", { date: formatDate(...) })` |

Also verify that the import error messages from the previous fix are using `t("importErrorNotPublic")` and `t("importErrorGeneric")` — if they're still hardcoded, fix them per the keys that should already exist.

---

## SECTION 2: ACTIVITY PAGE (~45 strings)

**File:** `src/app/app/activity/page.tsx`
**Namespace:** `useTranslations()` (root) → variable `t`
**Access pattern:** `t("dashboard.keyName")`

### 2A. Add ALL these keys to the `dashboard` object in en.json:

```json
"dashboard": {
  "pageTitle": "Dashboard",
  "filters": {
    "all": "All",
    "needsAction": "Needs action",
    "leads": "Leads",
    "appointments": "Appointments",
    "urgent": "Urgent"
  },
  "progress": {
    "setupBusinessProfile": "Set up your business profile",
    "configureAgent": "Configure your first AI agent",
    "connectPhone": "Connect a phone number",
    "testCall": "Make a test call",
    "enableForwarding": "Enable call forwarding",
    "addKnowledge": "Add knowledge-base entries"
  },
  "dayLabels": {
    "mon": "Mon", "tue": "Tue", "wed": "Wed", "thu": "Thu",
    "fri": "Fri", "sat": "Sat", "sun": "Sun"
  },
  "noData": "No data",
  "greetingMorning": "Good morning",
  "greetingAfternoon": "Good afternoon",
  "greetingEvening": "Good evening",
  "welcomeMessage": "Welcome to {name}!",
  "heroHeading": "Welcome to your Recall Touch dashboard",
  "heroDescription": "Your AI phone system is almost ready. Connect a number and make your first test call to see calls start appearing here automatically.",
  "todaySummary": "Here's what happened today.",
  "summaryBooked": "Appointment locked in from this call.",
  "summaryLead": "Lead captured and waiting for follow-up.",
  "summaryHandled": "Call handled by your system.",
  "needsFollowUp": "{name} — needs follow-up after transfer",
  "newLeadReview": "{name} — new lead to review",
  "readyForVolume": "Ready for more volume?",
  "readyForVolumeDesc": "Upgrade your plan to increase included minutes and unlock higher outbound capacity as calls ramp up.",
  "viewPlans": "View plans",
  "noCallsWarning": "No calls in the last 3+ days. Is your number forwarded?",
  "checkSetup": "Check setup",
  "setupChecklist": "Setup checklist",
  "setupProgress": "You're {pct}% of the way to a fully running AI phone line.",
  "skipSetup": "I know what I'm doing",
  "openStep": "Open",
  "continueSetup": "Continue setup",
  "testCallCta": "Want to see your AI in action?",
  "testCallDesc": "Use the Test tab on Agents to place a real voice call with your configured agent.",
  "tryTestCall": "Try a test call",
  "activityTimeline": "Activity Timeline",
  "live": "Live",
  "badgeLead": "Lead",
  "badgeAppointment": "Appointment",
  "badgeUrgent": "Urgent",
  "badgeFollowUp": "Follow-up",
  "needsAttention": "Needs attention",
  "allCaughtUp": "All caught up.",
  "recentEvents": "Recent system events",
  "eventsPlaceholder": "Your setup events will appear here.",
  "callVolume7d": "Call Volume (7 days)",
  "callOutcomes": "Call Outcomes",
  "outcomesLeads": "Leads",
  "outcomesAppointments": "Appointments",
  "outcomesTransfers": "Transfers",
  "outcomesOther": "Other"
}
```

**Translate ALL of these into es, fr, de, pt, ja and add to their respective `dashboard` objects.**

### 2B. Replace every hardcoded string in activity/page.tsx

Replace the FILTERS array (lines ~67-71):
```typescript
// BEFORE:
{ label: "All", ... }, { label: "Needs action", ... }, ...
// AFTER:
{ label: t("dashboard.filters.all"), ... }, { label: t("dashboard.filters.needsAction"), ... }, ...
```

Replace the PROGRESS_LABELS object (lines ~120-137) — use `t("dashboard.progress.setupBusinessProfile")` etc.

Replace day labels (line ~181): use `t("dashboard.dayLabels.mon")` etc.

Replace ALL greeting strings (lines ~643-645): use `t("dashboard.greetingMorning")` etc.

Replace ALL summary strings, headings, descriptions, buttons, badges, chart labels — every single hardcoded string listed in 2A above with its corresponding `t()` call.

---

## SECTION 3: ANALYTICS PAGE (~35 JSX strings + helper functions)

**File:** `src/app/app/analytics/page.tsx`
**Namespace:** `useTranslations()` (root) → variable `t`
**Access pattern:** `t("analytics.keyName")`

### 3A. Add ALL these keys to the `analytics` object in en.json:

```json
"analytics": {
  "pageTitle": "Analytics",
  "heading": "Analytics",
  "description": "See how conversations turn into kept appointments and real revenue.",
  "ranges": {
    "today": "Today",
    "sevenDay": "7D",
    "thirtyDay": "30D",
    "ninetyDay": "90D",
    "custom": "Custom"
  },
  "rangeLabels": {
    "today": "Today",
    "last7": "Last 7 days",
    "last30": "Last 30 days",
    "last90": "Last 90 days",
    "customRange": "Custom range"
  },
  "exportCsv": "Export CSV",
  "periodSummary": "Period Summary",
  "emptyHeading": "Analytics populate as calls come in",
  "emptyDescription": "Your first chart will appear after your first call.",
  "emptyAction": "Make a test call",
  "kpi": {
    "totalCalls": "Total calls",
    "avgHandleTime": "Avg handle time",
    "leadConversion": "Lead conversion",
    "appointmentsBooked": "Appointments booked",
    "estRevenue": "Est. revenue"
  },
  "leadFunnel": "Lead funnel",
  "funnelStages": {
    "calls": "Calls",
    "leads": "Leads",
    "qualified": "Qualified",
    "appointments": "Appointments",
    "won": "Won"
  },
  "atAGlance": "{label} at a glance",
  "glanceSummary": "Handled {totalCalls} calls, created {leads} leads, booked {appointments} appointments, and protected an estimated ${revenue} in revenue.",
  "glanceEmpty": "Once calls start coming in, you'll see a summary of how many became leads, appointments, and revenue.",
  "leadConversionPct": "Lead conversion {pct}%",
  "positiveSentimentPct": "Positive sentiment {pct}%",
  "peakHours": "Peak hours",
  "aiInsights": "AI insights",
  "dismiss": "Dismiss",
  "insightBusyHour": "Busiest hour this week stays stable around mid-morning.",
  "insightAvailability": "Questions about availability often appear outside standard hours.",
  "addToKnowledge": "Add to knowledge base",
  "insightLiveAnswer": "Calls that reach a live answer are much more likely to become appointments.",
  "insightPricing": "Make sure pricing and availability are easy to confirm in the first 30 seconds.",
  "sentimentOverview": "Sentiment overview",
  "sentimentPositive": "Positive {pct}%",
  "sentimentNeutral": "Neutral {pct}%",
  "sentimentNegative": "Negative {pct}%",
  "outcomes": {
    "booked": "Booked",
    "lead": "Lead",
    "info": "Info",
    "transferred": "Transferred",
    "missed": "Missed",
    "voicemail": "Voicemail"
  },
  "days": {
    "mon": "Mon", "tue": "Tue", "wed": "Wed", "thu": "Thu",
    "fri": "Fri", "sat": "Sat", "sun": "Sun"
  },
  "errors": {
    "timeout": "Analytics request timed out. Try again.",
    "loadFailed": "Could not load analytics for this workspace."
  },
  "periodNoData": "No calls recorded in the selected {period} period. Make a test call to start seeing insights here.",
  "periodSummaryText": "{count} calls with a {rate}% answer rate",
  "periodAppointments": "{count} appointments, converting {pct}% of qualified leads.",
  "periodRevenue": "Estimated revenue impact: ${amount}.",
  "periodDuration": "Average call duration: {duration}."
}
```

**Translate ALL of these into es, fr, de, pt, ja.**

### 3B. Replace every hardcoded string in analytics/page.tsx

Replace ALL stat card labels, range labels, chart headings, empty state text, AI insight text, sentiment labels, outcome labels, day labels, and the `generatePeriodSummary()` helper function strings with their corresponding `t("analytics.keyName")` calls.

Also replace the `outcomeSlices` labels (lines ~360-365), `funnelData` labels (lines ~414-418), `summaryLabel` labels (lines ~423-427), and `heatmap` day labels (line ~387).

---

## SECTION 4: CALLS PAGE (~67 strings)

**File:** `src/app/app/calls/page.tsx`
**Namespace:** `useTranslations()` (root) → variable `t`
**Access pattern:** `t("calls.keyName")`

### 4A. Add ALL these keys to the `calls` object in en.json:

```json
"calls": {
  "pageTitle": "Calls",
  "heading": "Call log",
  "description": "Every answered call, decision, and follow-up in one place.",
  "live": "Live",
  "exportCsv": "Export CSV",
  "searchPlaceholder": "Search by caller or phone…",
  "filterOutcome": "Filter by outcome",
  "filterSentiment": "Filter by sentiment",
  "all": "All",
  "outcomes": {
    "booked": "Booked",
    "lead": "Lead",
    "info": "Info",
    "transferred": "Transferred",
    "missed": "Missed",
    "voicemail": "Voicemail"
  },
  "sentiments": {
    "positive": "Positive",
    "neutral": "Neutral",
    "negative": "Negative"
  },
  "sort": {
    "newest": "Newest first",
    "longest": "Longest calls",
    "bestSentiment": "Best sentiment"
  },
  "empty": {
    "title": "No calls yet",
    "description": "Connect your phone number to get started. Calls will appear here with transcripts and summaries.",
    "connectNumber": "Connect number",
    "testAgent": "Test your agent"
  },
  "table": {
    "dateTime": "Date / time",
    "caller": "Caller",
    "phone": "Phone",
    "duration": "Duration",
    "outcome": "Outcome",
    "sentiment": "Sentiment",
    "agent": "Agent",
    "actions": "Actions"
  },
  "defaultCaller": "Caller",
  "playRecording": "Play recording",
  "viewTranscript": "View transcript",
  "noMatchFilters": "No calls match these filters yet.",
  "showing": "Showing",
  "of": "of",
  "callsLabel": "calls",
  "page": "Page",
  "agentLabel": "Agent:",
  "assigned": "Assigned",
  "details": "Call details",
  "sentimentBadge": {
    "positive": "Positive",
    "negative": "Negative",
    "neutral": "Neutral"
  },
  "viewLeadDetails": "View lead details",
  "recording": "Recording",
  "transcript": "Transcript",
  "loading": "Loading…",
  "transcriptDescription": "Transcript (AI-processed, caller and agent turns)",
  "noTranscript": "No transcript for this call.",
  "aiSummary": "AI Summary",
  "noSummary": "No summary available.",
  "callIntelligence": "Call intelligence",
  "callIntelligenceDesc": "Send this call to Call Intelligence to compare patterns, coaching insights, and recurring objections over time.",
  "addToIntelligence": "Add to Call Intelligence",
  "actionsTaken": "Actions taken",
  "actionBooked": "Appointment booked",
  "actionLead": "Lead captured",
  "actionTransferred": "Call transferred",
  "actionVoicemail": "Voicemail left",
  "actionHandled": "Call handled",
  "notes": "Notes",
  "addNotesPlaceholder": "Add notes…",
  "callBack": "Call back",
  "sendSms": "Send SMS",
  "addToLeads": "Add to leads",
  "flag": "Flag"
}
```

**Translate ALL of these into es, fr, de, pt, ja.**

### 4B. Replace every hardcoded string in calls/page.tsx with corresponding `t("calls.keyName")` calls.

---

## SECTION 5: APPOINTMENTS PAGE (~20 strings + hex color fix)

**File:** `src/app/app/appointments/page.tsx`
**Namespace:** `useTranslations()` (root) → variable `t`
**Access pattern:** `t("appointments.keyName")`

### 5A. Add keys to `appointments` object in en.json:

```json
"appointments": {
  "pageTitle": "Appointments",
  "heading": "Appointments",
  "description": "All booked appointments from calls, campaigns, and inbox.",
  "viewList": "List",
  "viewCalendar": "Calendar",
  "table": {
    "dateTime": "Date / Time",
    "contact": "Contact",
    "type": "Type",
    "status": "Status",
    "source": "Source"
  },
  "viewDetails": "View details",
  "noAppointments": "No appointments",
  "settings": "Settings",
  "calendarView": "Calendar view",
  "dateTimeLabel": "Date & time",
  "typeLabel": "Type",
  "statusLabel": "Status",
  "sourceLabel": "Source",
  "close": "Close",
  "days": {
    "mon": "Mon", "tue": "Tue", "wed": "Wed", "thu": "Thu",
    "fri": "Fri", "sat": "Sat", "sun": "Sun"
  }
}
```

**Translate into es, fr, de, pt, ja.**

### 5B. Replace hardcoded strings AND fix hex colors:

Replace all hardcoded strings with `t("appointments.keyName")` calls.

**Also fix hardcoded hex colors** — replace ALL inline `style={{` with Tailwind classes or CSS variables:

```typescript
// BEFORE (lines ~169, 174, 188, 371, 399, 404):
style={{ borderColor: "#1f2937", background: "#111827" }}
style={{ borderColor: "#1f2937" }}
style={{ borderColor: "#374151" }}

// AFTER:
className="border-[var(--border-default)] bg-[var(--bg-card)]"
// or use existing Tailwind dark mode classes
```

---

## SECTION 6: CALENDAR PAGE (~30 strings)

**File:** `src/app/app/calendar/page.tsx`
**Namespace:** `useTranslations()` (root) + `useTranslations("common")` + `useTranslations("forms.state")`
**Access pattern:** `t("calendar.keyName")`

### 6A. Add keys to `calendar` object in en.json:

```json
"calendar": {
  "pageTitle": "Calendar",
  "heading": "Calendar",
  "today": "Today",
  "viewWeek": "Week",
  "viewMonth": "Month",
  "newAppointment": "+ New Appointment",
  "timeRangeWeek": "8 AM – 8 PM · This week",
  "timeRangeMonth": "8 AM – 8 PM · This month",
  "loadingCalendar": "Loading calendar…",
  "appointmentCount": "{count} appointments",
  "monthViewHint": "Month view is simplified here. Week view shows detailed blocks.",
  "googleCalendar": "Google Calendar",
  "googleSynced": "Synced. Availability and bookings sync two-way.",
  "googleNotSynced": "Sync availability and keep your AI and personal calendar aligned.",
  "connected": "Connected",
  "connect": "Connect",
  "outlookCalendar": "Microsoft Outlook",
  "backToActivity": "Activity",
  "syncedToCalendar": "Synced to calendar",
  "removeAppointment": "Remove appointment?",
  "removeConfirm": "Remove \"{contact} — {service}\"? This cannot be undone.",
  "newAppointmentHeading": "New appointment",
  "contactLabel": "Contact",
  "contactPlaceholder": "Sarah Chen",
  "phoneLabel": "Phone",
  "phonePlaceholder": "+1 555 000 0000",
  "serviceLabel": "Service",
  "servicePlaceholder": "Cleaning, estimate, consultation…",
  "dateLabel": "Date",
  "timeLabel": "Time",
  "durationLabel": "Duration (min)",
  "availableTimes": "Available times (Google)"
}
```

**Translate into es, fr, de, pt, ja.**

### 6B. Replace every hardcoded string in calendar/page.tsx with `t("calendar.keyName")` calls.

---

## SECTION 7: LEADS PAGE (~35 strings)

**File:** `src/app/app/leads/page.tsx`
**Namespace:** `useTranslations()` (root) + `useTranslations("toast")`
**Access pattern:** `t("leads.keyName")`

### 7A. Add keys to `leads` object in en.json:

```json
"leads": {
  "pageTitle": "Leads",
  "heading": "Leads",
  "description": "Every captured opportunity, from first call through decision.",
  "addLead": "Add lead",
  "total": "Total:",
  "exportCsv": "Export CSV",
  "viewTable": "Table",
  "viewBoard": "Board",
  "searchPlaceholder": "Search by name, phone, or email…",
  "filters": "Filters",
  "inlineNamePlaceholder": "Name",
  "inlinePhonePlaceholder": "Phone",
  "inlineEmailPlaceholder": "Email (optional)",
  "inlineAdd": "+ Add",
  "scoreFilter": {
    "all": "All scores",
    "high": "High (70+)",
    "medium": "Medium (40–69)",
    "low": "Low (0–39)"
  },
  "sortOptions": {
    "newest": "Newest",
    "highestScore": "Highest score",
    "recentContact": "Most recent contact"
  },
  "selectedCount": "{count} selected",
  "clear": "Clear",
  "changeStatus": "Change status:",
  "assign": "Assign:",
  "modal": {
    "title": "Add lead",
    "nameLabel": "Name *",
    "namePlaceholder": "Full name",
    "phoneLabel": "Phone *",
    "phonePlaceholder": "+1 (555) 000-0000",
    "emailLabel": "Email",
    "emailPlaceholder": "email@example.com",
    "companyLabel": "Company",
    "companyPlaceholder": "Company name",
    "needLabel": "What do they need?",
    "needPlaceholder": "e.g. monthly cleaning, consultation",
    "sourceLabel": "Source",
    "statusLabel": "Status",
    "notesLabel": "Notes",
    "notesPlaceholder": "Optional notes",
    "cancel": "Cancel",
    "saving": "Adding…",
    "save": "Save lead"
  },
  "sources": {
    "inboundCall": "Inbound Call",
    "website": "Website",
    "referral": "Referral",
    "other": "Other"
  },
  "csvPreview": "We found {count} leads",
  "csvPreviewLabel": "Preview (first 5):",
  "csvCancel": "Cancel",
  "csvImporting": "Importing…",
  "csvImportAll": "Import all {count} leads",
  "csvOr": "— or —",
  "importFromCsv": "Import from CSV",
  "csvUploadHint": "Upload CSV with name, phone, email columns",
  "drawerTitle": "{name} · Lead",
  "drawerTitleFallback": "Lead"
}
```

**Translate into es, fr, de, pt, ja.**

### 7B. Replace every hardcoded string in leads/page.tsx with `t("leads.keyName")` calls.

---

## SECTION 8: MISSING LOCALE KEYS (90 keys missing from non-English files)

These keys exist in `en.json` but are MISSING from one or more of es, fr, de, pt, ja. Add translations for ALL of them.

### 8A. Accessibility keys (add to es, fr, de, pt, ja):
```
accessibility.closeNavigation = "Close navigation"
accessibility.liveRegionUpdates = "Updates will be announced here for screen readers."
accessibility.mainContent = "Main content"
accessibility.openCommandPalette = "Open command palette"
accessibility.openNavigation = "Open navigation"
```

### 8B. Agents keys (add to es, fr, de, pt, ja):
```
agents.actions.deleteAria = "Delete this agent"
agents.actions.saveAndSyncAria = "Save agent and sync to voice"
agents.actions.savingAria = "Saving agent..."
agents.behavior.handoff.title = "When to transfer"
agents.behavior.handoff.subtitle = (check en.json for value)
agents.behavior.objections = (check en.json)
agents.behavior.objections.placeholder = (check en.json)
agents.knowledgePanel.title = "Knowledge base"
agents.knowledgePanel.subtitle = (check en.json)
agents.knowledgePanel.add = (check en.json)
agents.knowledgePanel.remove = (check en.json)
agents.knowledgePanel.questionPlaceholder = (check en.json)
agents.knowledgePanel.answerPlaceholder = (check en.json)
agents.quickActions.label = "Quick actions"
agents.quickActions.edit = (check en.json)
agents.quickActions.editAria = (check en.json)
agents.quickActions.goLive = (check en.json)
agents.quickActions.goLiveAria = (check en.json)
agents.quickActions.test = (check en.json)
agents.quickActions.testAria = (check en.json)
agents.setup.title = "Setup"
agents.setup.completed = (check en.json)
agents.setup.current = (check en.json)
agents.setup.currentlyOn = (check en.json)
agents.setup.jumpAria = (check en.json)
agents.setup.stepOf = (check en.json)
agents.setupProgress.title = (check en.json)
agents.setupProgress.forAgent = (check en.json)
agents.setupProgress.next = (check en.json)
agents.toast.agentLive = (check en.json)
agents.toast.createFailed = "Could not create agent"
agents.toast.created = (check en.json)
agents.toast.deleteFailed = (check en.json)
agents.toast.deleted = (check en.json)
agents.toast.previewFailed = (check en.json)
agents.toast.saveFailed = (check en.json)
agents.toast.saveRetry = (check en.json)
agents.toast.selectVoiceFirst = (check en.json)
agents.toast.testLinkCopied = (check en.json)
```

Plus ALL `agents.testPanel.*` and `agents.voiceTest.*` keys.

### 8C. Contacts keys (add to es, fr, de, pt, ja):
```
contacts.toast.deleteError = "Could not delete contact. Try again."
contacts.toast.saveError = "Could not save contact. Try again."
contacts.toast.updateError = "Could not update contact. Try again."
```

### 8D. Developer keys (add to es, fr, de, pt, ja):
```
developer.webhooks.title = "Webhooks"
developer.webhooks.subtitle = (check en.json for full value)
developer.webhooks.empty.title = "No webhook endpoints yet"
developer.webhooks.empty.body = (check en.json)
developer.webhooks.empty.action = "Open developer home"
```

### 8E. Settings keys (add to es, fr, de, pt, ja):

All `settings.agent.*`, `settings.business.*`, `settings.compliance.*`, `settings.integrations.*`, `settings.leadScoring.*`, `settings.notifications.*`, `settings.phone.*`, `settings.profile.*` keys.

**IMPLEMENTATION:** For each key listed above:
1. Read the English value from `en.json`
2. Translate it into es, fr, de, pt, ja
3. Add the translated value to the correct nested path in each locale file

---

## SECTION 9: API ROUTES — ADD ERROR HANDLING (7 routes)

Wrap EVERY exported handler in each of these files with a try/catch block. Pattern:

```typescript
export async function GET(req: NextRequest) {
  try {
    // ... existing code ...
  } catch (error) {
    console.error("[API] route-name error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Files to fix:**
1. `src/app/api/calls/route.ts` — GET handler
2. `src/app/api/calls/active/route.ts` — GET handler
3. `src/app/api/calls/export/route.ts` — GET handler
4. `src/app/api/calls/[id]/route.ts` — GET handler
5. `src/app/api/calls/[id]/coaching/route.ts` — GET handler
6. `src/app/api/continuity/risk/route.ts` — GET handler
7. `src/app/api/command-center/pipeline-health/route.ts` — GET handler

Do NOT change any business logic inside the handlers. ONLY add the try/catch wrapper.

---

## SECTION 10: ACCESSIBILITY FIXES (2 images)

Add `aria-label` to these elements:

1. `src/components/sections/HomepageActivityPreview.tsx` line ~42:
   - Add `aria-label="Preview of the Recall Touch activity dashboard"`

2. `src/components/sections/MockDashboard.tsx` line ~36:
   - Add `aria-label="Preview of the Recall Touch dashboard interface"`

---

## VERIFICATION CHECKLIST

Run ALL of these. Every single one must pass.

### Build and types:
```bash
npm run build && npx tsc --noEmit
```

### No hardcoded strings remaining (spot check):
```bash
grep -rn '"Call log"' src/app/app/calls/page.tsx
grep -rn '"Analytics"' src/app/app/analytics/page.tsx
grep -rn '"Appointments"' src/app/app/appointments/page.tsx
grep -rn '"Good morning"' src/app/app/activity/page.tsx
grep -rn '"Leads"' src/app/app/leads/page.tsx | grep -v import | grep -v "\/\/"
grep -rn '"Calendar"' src/app/app/calendar/page.tsx | head -5
```
Expected: ALL return empty (no matches) or only non-JSX references.

### Missing locale keys (spot check):
```bash
grep -c '"closeNavigation"' src/i18n/messages/es.json
grep -c '"deleteAria"' src/i18n/messages/fr.json
grep -c '"webhooks"' src/i18n/messages/de.json
```
Expected: All return at least `1`.

### API error handling:
```bash
grep -c "try {" src/app/api/calls/route.ts
grep -c "try {" src/app/api/calls/active/route.ts
grep -c "try {" src/app/api/continuity/risk/route.ts
```
Expected: All return at least `1`.

### Final commit:
```bash
git add -A && git commit -m "fix: complete i18n coverage for all app pages, add API error handling, fix accessibility labels

- Replace 200+ hardcoded English strings across activity, analytics, calls, appointments, calendar, leads pages
- Add all i18n keys to all 6 locale files (en, es, fr, de, pt, ja)
- Add 90 missing translation keys to non-English locales (agents, contacts, developer, accessibility, settings)
- Wrap 7 API routes in try/catch error handling
- Fix hardcoded hex colors in appointments page
- Add aria-labels to 2 marketing images
- Remove remaining knowledge page hardcoded strings" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output. Do NOT stop until ALL sections are complete.
