# ABSOLUTE FINAL CURSOR MASTER PROMPT — RECALL TOUCH LAUNCH PERFECTION

You are an elite implementation engineer. This prompt is the SINGLE SOURCE OF TRUTH for making recall-touch.com fully production-grade, fully polished, fully internationalized, and fully launch-ready. You must implement EVERY item below. Do NOT stop until every item is resolved. Do NOT skip any section. Verify each fix compiles with `npx tsc --noEmit` before moving on.

---

## ARCHITECTURE REFERENCE

- **Stack**: Next.js 14 App Router · React 19 · TypeScript · next-intl ^4.8.3 · Tailwind CSS v4 · Framer Motion ^12 · Supabase · Vapi · ElevenLabs · Deepgram · Stripe · Twilio
- **Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
- **Namespace rule**: `useTranslations("calls")` + `t("pageTitle")` → resolves `calls.pageTitle`. Never double-namespace.
- **Root rule**: `useTranslations()` (no arg) + `t("calls.pageTitle")` → resolves `calls.pageTitle`.
- **CSS vars**: `var(--text-primary)`, `var(--bg-card)`, `var(--border-default)`, `var(--accent-primary)`, etc.
- **Framer Motion**: String easing only (`"easeOut"`). Never array easing `[0.4, 0, 0.2, 1]`.
- **DB values vs display**: TypeScript types like `type LeadStatus = "New" | "Contacted"` are DB values. Keep them. The DISPLAY must go through `t()` mapping functions.
- **Font**: DM Sans body, Playfair Display headlines.
- **Theme**: Dark-first. All user-visible text through `t()`.

---

## SECTION 1: PUBLIC WEBSITE — INTERNATIONALIZATION

The public homepage currently mixes languages. When viewed in Spanish locale, the headline translates but the nav, call simulator, trust section, CTAs, and footer remain English. Fix ALL of these.

### 1.1 Navigation Bar (all public pages)

**File**: `src/components/sections/Navbar.tsx` or equivalent header component

All nav items are hardcoded English:
```
Product · Solutions · Pricing · Demo · Docs · Dashboard →
```

Replace every nav label with `t()` calls. Add to ALL 6 locale files under a `nav` or `site` namespace:
```json
"siteNav": {
  "product": "Product",
  "solutions": "Solutions",
  "pricing": "Pricing",
  "demo": "Demo",
  "docs": "Docs",
  "dashboard": "Dashboard",
  "signIn": "Sign in",
  "startFree": "Start free"
}
```

Spanish: `"product": "Producto"`, `"solutions": "Soluciones"`, `"pricing": "Precios"`, `"demo": "Demo"`, `"docs": "Documentación"`, `"dashboard": "Panel"`, `"signIn": "Iniciar sesión"`, `"startFree": "Comenzar gratis"`

Translate equivalently for fr, de, pt, ja.

### 1.2 Hero Call Simulator

**File**: `src/components/sections/HomepageCallSimulator.tsx` or `src/components/demo/CallSimulator.tsx`

The entire simulated call conversation is hardcoded English:
- "See how your AI handles a call"
- "Real-time appointment booking — fully automated"
- Caller/AI Agent dialog lines
- "Caller" / "AI Agent" labels

All 50+ dialog strings must use `t()`. Create `hero.simulator` namespace with every line. For Spanish: translate all dialog naturally.

### 1.3 Trust & Compliance Section

**File**: Homepage sections component

Hardcoded English:
- "TRUST & COMPLIANCE"
- "Enterprise-grade security and reliability. Start free — no credit card required."
- "SOC 2" / "GDPR" / "256-bit encryption" / "99.9% uptime"
- "Start free →"
- "Optional: get product updates. Notify me"
- "Get updates"

All must use `t()`. Add to `hero` or `site` namespace in all 6 locale files.

### 1.4 All Other Homepage Sections

Scroll through the ENTIRE homepage source. Every section heading, subheading, feature description, CTA button, badge, and tooltip must use `t()`. Check:
- Feature cards section
- Use-case sections
- Social proof / testimonials
- How-it-works section
- FAQ section (if present)
- Footer (links, copyright, legal links)

### 1.5 Public Pages: Product, Pricing, Demo, Docs, Contact, Industries, Blog, Terms, Privacy, Activate

Each public page has its own components. Search for ALL hardcoded English strings in:
- `src/app/(surfaces)/` or equivalent public route directories
- `src/app/demo/`
- `src/app/docs/`
- `src/app/pricing/`
- `src/app/industries/`
- `src/app/contact/`
- `src/app/activate/`
- `src/app/blog/`
- `src/app/terms/`
- `src/app/privacy/`

Every user-visible string in these files must use `t()` with proper locale keys.

---

## SECTION 2: PRODUCT PAGES — HARDCODED STRINGS

Every string visible to users in the authenticated product must use `t()`. Below is an exhaustive list by file.

### 2.1 Activity/Dashboard — `src/app/app/activity/page.tsx`

| Line | Hardcoded String | Fix |
|------|-----------------|-----|
| ~357 | `["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]` | `[t("dashboard.days.sun"), t("dashboard.days.mon"), ...]` |
| ~1007-1013 | `"Lead"`, `"Appointment"`, `"Urgent"`, `"Follow-up"` in badge ternary | `t(\`dashboard.activityType.${card.type}\`)` |
| ~1024 | `"Needs attention"` | `t("dashboard.needsAttention")` |
| ~1031 | `"All caught up."` | `t("dashboard.allCaughtUp")` |
| ~1059 | `"Recent system events"` | `t("dashboard.recentSystemEvents")` |
| ~1063 | `"Your setup events will appear here."` | `t("dashboard.setupEventsPlaceholder")` |
| ~1082 | `"View →"` | `t("dashboard.viewLink")` |

Add ALL keys under `dashboard` in all 6 locale files with translations.

### 2.2 Leads — `src/app/app/leads/page.tsx`

Create display mapping functions (keep TypeScript types as DB values):

```tsx
function getStatusDisplay(status: LeadStatus, t: (key: string) => string): string {
  const map: Record<LeadStatus, string> = {
    "New": t("leads.status.new"), "Contacted": t("leads.status.contacted"),
    "Qualified": t("leads.status.qualified"), "Appointment Set": t("leads.status.appointmentSet"),
    "Won": t("leads.status.won"), "Lost": t("leads.status.lost"),
  };
  return map[status] ?? status;
}
function getSourceDisplay(source: LeadSource, t: (key: string) => string): string {
  const map: Record<LeadSource, string> = {
    "Inbound Call": t("leads.source.inboundCall"), "Outbound Outreach": t("leads.source.outbound"),
    "Website": t("leads.source.website"), "Referral": t("leads.source.referral"),
  };
  return map[source] ?? source;
}
```

Use these functions EVERYWHERE status/source is DISPLAYED. Also fix:
- Line ~89: fallback `"Lead"` → `t("leads.defaultName")`
- Line ~101: fallback `"Service request"` → `t("leads.defaultService")`
- Line ~106: description fallback → `t("leads.defaultDescription")`
- Lines ~108-109: timeline labels → `t("leads.timeline.created")`, `t("leads.timeline.addedToPipeline")`

Locale keys for `leads`:
```json
"status": { "new": "New", "contacted": "Contacted", "qualified": "Qualified", "appointmentSet": "Appointment Set", "won": "Won", "lost": "Lost" },
"source": { "inboundCall": "Inbound Call", "outbound": "Outbound Outreach", "website": "Website", "referral": "Referral" },
"defaultName": "Lead", "defaultService": "Service request",
"defaultDescription": "Lead captured from a recent conversation and kept in your pipeline.",
"timeline": { "created": "Created from recent activity", "addedToPipeline": "Lead added to active pipeline" }
```

Spanish: `"status": { "new": "Nuevo", "contacted": "Contactado", "qualified": "Calificado", "appointmentSet": "Cita programada", "won": "Ganado", "lost": "Perdido" }` etc.

Translate for all 6 locales.

### 2.3 Appointments — `src/app/app/appointments/page.tsx`

- Lines ~30-31: `"Today"` / `"Tomorrow"` → `t("appointments.today")` / `t("appointments.tomorrow")`. The `formatDate` function is outside the component — refactor to accept `t` as parameter.
- Lines ~50-54: `mapApiStatus` returns display strings. Create `getAppointmentStatusDisplay(status, t)` mapping.
- Line ~32: `toLocaleDateString("en-US", ...)` → use `undefined` for locale-aware formatting.
- Line ~90: fallback `"Inbound call"` → `t("appointments.defaultSource")`

Add `appointments.today`, `appointments.tomorrow`, `appointments.statusLabels.*`, `appointments.defaultSource` to all 6 locale files.

### 2.4 Calls — `src/app/app/calls/page.tsx`

- Lines ~51-53: `TYPE_LABELS` hardcoded → convert to `getTypeLabels(t)` function like existing `getOutcomeLabels`.
- Line ~589: `"Assigned"` → `t("calls.assigned")`
- Line ~639: fallback `"Caller"` → `t("calls.defaultCaller")`
- Line ~718: `"AI Summary"` → `t("calls.aiSummary")`
- Line ~720: `"No summary available."` → `t("calls.noSummary")`
- Line ~726: `"Call intelligence"` → `t("calls.callIntelligenceLabel")`
- Lines ~728-729: descriptive text → `t("calls.callIntelligenceDesc")`
- Line ~776: placeholder `"Add notes…"` → `t("calls.addNotesPlaceholder")`

Add all keys under `calls` in all 6 locale files.

### 2.5 Analytics — `src/app/app/analytics/page.tsx`

- Line ~387: `["Mon", "Tue", ...]` → use `t("analytics.days.mon")` etc.
- Line ~645: long empty state text → `t("analytics.emptyStateSummary")`
- Line ~807: `"AM"` / `"PM"` → `t("analytics.am")` / `t("analytics.pm")`

### 2.6 Calendar — `src/app/app/calendar/page.tsx`

- Line ~38: fallback `"Contact"` → `t("calendar.defaultContact")`

### 2.7 Knowledge — `src/app/app/knowledge/page.tsx`

- Line ~106: fallback `"Untitled"` → `t("defaultTitle")`
- Verify TYPE_OPTIONS/STATUS_OPTIONS dropdown rendering uses `t()` from previous fixes.

### 2.8 Campaigns — `src/app/app/campaigns/page.tsx`

Uses `useTranslations("campaigns")`. Fix:
- Lines ~47-54: `LEAD_STATUS_OPTIONS` displayed to users — create display mapping function
- Lines ~106-107: default audience/template → `t("defaults.audience")`, `t("defaults.template")`
- Line ~273: error messages → `t("errors.updateFailed")`, `t("errors.createFailed")`
- Line ~357: `"Outcome-based audience"` → `t("outcomeAudience")`
- Lines ~515-518: campaign type labels/descriptions — convert to t() using `labelKey` pattern
- Line ~555: placeholder → `t("namePlaceholder")`
- Lines ~640, 654: `"Any"` → `t("filterAny")`
- Line ~684: schedule labels → `t("scheduleLabel.once")`, `t("scheduleLabel.recurring")`
- Lines ~774-778: button states → `t("saving")`, `t("creating")`, `t("saveChanges")`, `t("createCampaign")`

### 2.9 Call Intelligence — `src/app/app/call-intelligence/page.tsx`

- Lines ~44-50: `CALL_TYPE_LABELS` → convert to `getCallTypeLabels(t)` function
- Lines ~75-78: score labels in `calculateQualityScore` → extract `getScoreLabel(bucket, t)` mapping
- Lines ~303-305: issue labels → `t("callIntelligence.issues.*")`
- Line ~320: `"Unassigned"` → `t("callIntelligence.unassigned")`
- Line ~567: `"Untitled call"` → `t("callIntelligence.untitledCall")`
- Line ~634: placeholder → `t("callIntelligence.notePlaceholder")`
- Line ~864: placeholder → `t("callIntelligence.titlePlaceholder")`
- Line ~882: placeholder → `t("callIntelligence.transcriptPlaceholder")`
- Line ~897: button states → `t("callIntelligence.analyzing")` / `t("callIntelligence.analyzeTranscript")`
- Replace ALL hardcoded hex colors (`#00D4AA`, `#4F8CFF`, `#FFB224`, `#FF4D4D`) with Tailwind classes or CSS variables.

### 2.10 Team — `src/app/app/team/page.tsx`

- Lines ~27-32: `ROLE_LABELS` → `getRoleLabels(t)` function
- Lines ~34-35: `ROLE_LABEL_OVERRIDE` → same pattern
- Lines ~38-45: `PERMISSIONS_MATRIX` labels → `getPermissionsMatrix(t)` function
- Lines ~55-59: `formatRelative` → accept `t` parameter, use `t("team.time.justNow")`, `t("team.time.minAgo", { count })`, etc.
- Line ~70: avatar fallback `"Y"` → `t("team.avatarFallback")`
- Lines ~199, 202: error messages → `t("team.errors.inviteFailed")`
- Lines ~391, 399: button states → `t("team.sending")` / `t("team.resend")` / `t("team.revoking")` / `t("team.revoke")`
- Line ~485: `"Send Invite"` → `t("team.sendInvite")`

### 2.11 Inbox — `src/app/app/inbox/page.tsx`

- Line ~12: `InboxStatus` type used for display → create `getInboxStatusDisplay(status, t)` mapping
- Add `inbox.status.open`, `inbox.status.resolved`, `inbox.status.pending` to all locales.

### 2.12 Contacts — `src/app/app/contacts/page.tsx`

- Lines ~69, 73-74: `"Last contact: unknown"` / `"today"` / `"yesterday"` → `t("contacts.lastContact.*")`
- Lines ~101-102: `"Lead"` / `"Customer"` type display → `t("contacts.type.*")`
- Line ~223: `"Added manually from dashboard."` → `t("contacts.addedManually")`
- Line ~284: aria-label `"Contact filters"` → `t("accessibility.contactFilters")`
- Line ~639: `"Inbound"` / `"Outbound"` → `t("contacts.callType.*")`

---

## SECTION 3: SETTINGS PAGES

### 3.1 Settings Agent — `src/app/app/settings/agent/page.tsx`

Fix ALL: `"Receptionist"` (×3), `"My Workspace"`, `"Your business"`, `"Thanks for calling. How can I help you today?"`, `"Question"`, `"Answer"`, `"Saving…"`, `"Save and update agent"`, description text, `"Start live test"`, `"End live test"` — every one uses `t()`.

### 3.2 Settings Call Rules — `src/app/app/settings/call-rules/page.tsx`

- Day labels (Mon-Sun) → `t("callRules.days.*")`
- Rule options: `"Take messages"`, `"Emergency only"`, `"Forward to cell"` + descriptions → `t("callRules.options.*")`

### 3.3 Settings Integrations Mapping — `src/app/app/settings/integrations/mapping/page.tsx`

- CRM brand names (Salesforce, HubSpot, etc.) → keep as brand names (no translation needed)
- Mapping options: `"None"`, `"Format phone (E.164)"`, `"Map status"`, `"Concatenate fields"` → `t()` calls
- `"Saving…"` / `"Save mapping"` → `t()` calls

### 3.4 Settings Integrations Sync Log — `src/app/app/settings/integrations/sync-log/page.tsx`

- `"Sync log"` breadcrumb → `t()`

### 3.5 Settings Notifications — `src/app/app/settings/notifications/page.tsx`

- `"Lead captured"`, `"Appointment booked"` + descriptions → `t()`

### 3.6 Settings Activity — `src/app/app/settings/activity/page.tsx`

- `"Settings updated"`, `"Business settings updated"` → `t()`

### 3.7 Settings Errors — `src/app/app/settings/errors/page.tsx`

- Add `useTranslations` import. Replace: `"Settings"`, `"Error reports"` breadcrumbs, heading, description, `"Loading…"`, `"No error reports yet."`, `"← Settings"` → all `t()`.

### 3.8 Phone Marketplace — `src/app/app/settings/phone/marketplace/page.tsx`

- `"Get a number"` breadcrumb → `t()`
- Country names: `"United States"`, `"Canada"`, etc. → `t("phone.countries.*")`

---

## SECTION 4: COMPONENTS

### 4.1 AppShellClient — `src/app/app/AppShellClient.tsx`

**Keyboard shortcuts (lines ~688-696):**
```tsx
{ keys: ["⌘", "K"], label: t("nav.shortcutCommandPalette") },
{ keys: ["⌘", "1"], label: t("nav.shortcutDashboard") },
{ keys: ["⌘", "2"], label: t("nav.shortcutAgents") },
{ keys: ["⌘", "3"], label: t("nav.shortcutCalls") },
{ keys: ["⌘", "4"], label: t("nav.shortcutLeads") },
{ keys: ["⌘", "5"], label: t("nav.shortcutCampaigns") },
{ keys: ["⌘", "6"], label: t("nav.shortcutInbox") },
{ keys: ["?"], label: t("nav.shortcutHelp") },
```

**All aria-labels** (lines ~342, 373, 399, 468, 485, 527, 559, 576, 589, 594, 629, 704):
Replace each with `t("accessibility.*")` — `workspaceStatus`, `appNav`, `expandSidebar`, `collapseSidebar`, `openMenu`, `mobileNav`, `moreMenu`, `closeMoreMenu`, `morePages`, `closeShortcutsHelp`, `onboardingSteps`.

**Line ~349:** `"Set up →"` fallback → `t("nav.setupCta")`

**Dead constants (lines ~48-99):** `_SIDEBAR_GROUPS`, `_MOBILE_TABS`, `_MOBILE_MORE_LINKS` are never rendered. Delete them or convert to TypeScript type-only definitions.

### 4.2 NotificationCenter — `src/components/ui/NotificationCenter.tsx`

Replace: `"New lead"`, `"Call completed"`, `"Appointment booked"`, `"Campaign"`, `"Quality alert"`, `"Billing"`, `"System"`, `"Just now"`, `"Yesterday"` — all `t("notifications.*")`.

### 4.3 CommandPalette — `src/components/ui/CommandPalette.tsx`

Replace: `"Pages"`, `"Actions"`, `"Create lead"`, `"Create agent"`, `"Create campaign"` — all `t("commandPalette.*")`.

### 4.4 ConfirmDialog — `src/components/ui/ConfirmDialog.tsx`

- Default `"Confirm"` → `t("common.confirm")`

### 4.5 ProofDrawer — `src/components/ProofDrawer.tsx`

Replace: `"Follow-through continued"`, `"They're planning to attend"`, `"Customer returned"`, `"They're set"`, `"Decision progressed"` — all `t()`.

### 4.6 ContinuityExpectation — `src/components/ContinuityExpectation.tsx`

- `"Decisions remain on track."` → `t()`

### 4.7 DemoVoiceButton — `src/components/demo/DemoVoiceButton.tsx`

Replace: `"Enter a phone number to receive a demo call."`, `"Calling you now..."`, `"Could not start demo call..."`, `"Calling…"`, `"Call me"` — all `t("demo.*")`.

### 4.8 CallSimulator — `src/components/demo/CallSimulator.tsx`

All 50+ dialog lines, speaker labels, scenario types, score labels → create `demo.simulator` namespace. Translate ALL to every locale.

### 4.9 AgentList — `src/app/app/agents/components/AgentList.tsx`

- Lines ~51, 55: `"Appointment"`, `"Follow-up"` outcome badges → `t()`.

---

## SECTION 5: LAYOUT & META

### 5.1 App Layout — `src/app/app/layout.tsx`

- Line ~14: `title: "Dashboard"` → translate
- Line ~15: `description` → translate
- Lines ~113, 119: `"My Workspace"` fallback → `t("nav.defaultWorkspace")`

---

## SECTION 6: LOCALE FILE COMPLETENESS

### 6.1 Missing nested structures in non-English locales

These entire objects exist in en.json but are MISSING from es/fr/de/pt/ja — copy from en.json and translate:
```
agents.actions (deleteAria, saveAndSyncAria, savingAria)
agents.knowledgePanel (add, answerPlaceholder, questionPlaceholder, remove, subtitle, title)
agents.quickActions (edit, editAria, goLive, goLiveAria, label, test, testAria)
agents.setup (completed, current, currentlyOn, jumpAria, stepOf, title)
agents.setupProgress (forAgent, next, title)
analytics.insightAvailability, analytics.insightBusyHour, analytics.insightLiveAnswer, analytics.insightPricing
analytics.periodAppointments, analytics.periodDuration, analytics.periodNoData, analytics.periodRevenue, analytics.periodSummaryText
analytics.sentimentNegative, analytics.sentimentNeutral, analytics.sentimentOverview, analytics.sentimentPositive
```

### 6.2 Orphaned t() calls — keys used in code but MISSING from en.json

~193 keys are referenced via `t()` but don't exist in en.json. Run:
```bash
grep -roh 't("[^"]*")' src/app/app/ src/components/ | sed 's/t("//;s/")//' | sort -u > /tmp/used_keys.txt
```
Compare against en.json. For each missing key, add proper English text, then translate to all 5 non-English locales. Critical missing keys:
- `empty.title`, `empty.body`, `empty.action`, `empty.description`, `empty.subtitle`
- `errors.nameRequired`, `errors.firstNameRequired`, `errors.lastNameRequired`
- `drawer.title`, `drawer.subtitle`
- `cta.back`, `cta.next`, `cta.finish`, `cta.skip`
- `breadcrumbs.newAgent`
- `addLead`, `addEntry`, `addFirst`, `bulkUpload`
- `closeModal`, `comingSoon`, `create`, `edit`, `back`, `close`, `cancel`, `deletePermanently`
- `allStatuses`, `allTypes`

### 6.3 English text in non-English files

Spot-check and fix:
- `common.status.active`: "Active" in es.json → "Activo"
- `dashboard.filters.leads`: "Leads" in es.json → "Prospectos"
- `billing.toast.planUpdated`: English in es.json → translate

### 6.4 All new keys from Sections 1-5

Every section above adds new keys. Ensure ALL are present in ALL 6 locale files with proper translations. Do NOT leave any locale file incomplete.

---

## SECTION 7: HARDCODED HEX COLORS → CSS VARIABLES

Replace hardcoded hex colors with Tailwind classes or CSS variables in these files (highest impact first):

### `src/app/app/call-intelligence/page.tsx` — 55 instances
- `#00D4AA` → `text-emerald-400` / `bg-emerald-400`
- `#4F8CFF` → `text-blue-400` / `bg-blue-400` or `var(--accent-primary)`
- `#FFB224` → `text-amber-400` / `bg-amber-400`
- `#FF4D4D` → `text-red-400` / `bg-red-400`

### `src/app/app/AppShellClient.tsx`
- `#4F8CFF` → `var(--accent-primary)`
- `#00D4AA` → Tailwind emerald
- `#111113` → `var(--bg-overlay)`
- `#8B8B8D` → `var(--text-tertiary)`

### All other `src/app/app/**/*.tsx` files
Search for `#[0-9a-fA-F]{3,6}` in .tsx files. Replace with closest Tailwind class or CSS variable. Do NOT replace colors inside SVG or brand assets.

---

## SECTION 8: API SECURITY & ERROR HANDLING

### 8.1 Global Error Handler Utility

Create `src/lib/apiHandler.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";

type Handler = (req: NextRequest, ctx?: { params: Record<string, string> }) => Promise<Response>;

export function withErrorHandling(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`[API Error] ${req.method} ${req.url}:`, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
```

### 8.2 Wrap all unprotected API routes

Apply `withErrorHandling` to every route handler in `src/app/api/` that doesn't already have try/catch. Priority:
- All `src/app/api/cron/*` routes
- All `src/app/api/operational/*` routes
- `src/app/api/conversations/route.ts`
- `src/app/api/agents/public/[id]/route.ts`

### 8.3 Fix workspace access check timing

In `src/app/api/agents/[id]/route.ts` (and similar routes), the agent is fetched BEFORE checking workspace access. Fix: check auth FIRST, then fetch.

```typescript
// WRONG:
const agent = await db.from("agents").select("*").eq("id", id).maybeSingle();
const err = await requireWorkspaceAccess(req, agent.workspace_id);

// RIGHT:
const session = await getSession(req);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const agent = await db.from("agents").select("*").eq("id", id).eq("workspace_id", session.workspaceId).maybeSingle();
```

### 8.4 Sanitize Supabase error messages

Never expose raw Supabase errors to clients. Replace:
```typescript
// BEFORE:
if (error) return NextResponse.json({ error: error.message }, { status: 500 });
// AFTER:
if (error) {
  console.error("[DB Error]", error.message);
  return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
}
```

---

## SECTION 9: PRODUCT UX — EMPTY STATES & TRUST

### 9.1 Agents Page Empty State

Current: Shows "Receptionist" agent card with "0 calls · No calls yet" and "45% Ready" — this looks demo/fake.

Fix: If user has no real agents, show a clean empty state with:
- Clear heading: "Create your first AI agent"
- Helpful description explaining what agents do
- Primary CTA: "+ Create Agent" (already exists)
- Optional: template previews (receptionist, sales, support)

If user has created an agent but hasn't completed setup, show the setup panel prominently with progress.

### 9.2 Calls Page Empty State

Current: "No calls yet — Connect your phone number to get started." — this is good but can link directly to phone setup.

Ensure the "Connect your phone number" text links to `/app/settings/phone`.

### 9.3 Leads Page Empty State

Current: "Leads appear when your AI captures them — or add your own" with CTAs "+ Add lead", "Try our agent →", "Connect CRM →" — good structure.

Verify all CTA links work and text uses `t()`.

### 9.4 All Empty States Must Use t()

Search for every empty state component/message across the product. Verify every string uses `t()`.

---

## SECTION 10: PRODUCT UX — AGENT SETUP QUALITY

### 10.1 Agent Setup Steps

The agent detail view shows: Mission, Voice, Knowledge, Behavior, Test with a readiness progress bar. This is well-structured. Verify:

- Each step saves properly and persists on refresh
- The progress percentage updates correctly as steps complete
- The "Test" step actually triggers a test call or preview
- The "Live" / "Analytics" / "Flow builder" links work

### 10.2 Agent Setup Labels

The setup step labels "Mission — What does this agent d...", "Voice — How does it sound?", "Knowledge — What does it know?", "Behavior — How does it act?", "Test" — all must use `t()`.

Check `src/app/app/agents/[id]/` and related components for hardcoded English.

### 10.3 Agent Page Labels

"AI Agents", "Different agents for daytime, after-hours, emergencies, and follow-up.", "+ Create Agent", "Pause", edit/delete icons, "Active" badge, "Default" tag, "No calls yet" — all must use `t()`.

---

## SECTION 11: SIDEBAR LABELS

The sidebar currently shows English labels that appear to be translated via `useMemo` hooks (lines ~122-180 in AppShellClient.tsx). Verify that:

1. The `sidebarGroups`, `mobileTabs`, `mobileMoreLinks` useMemo hooks are what actually render (not the dead `_SIDEBAR_GROUPS` constants)
2. Section headers ("MAIN", "COMMUNICATION", "INTELLIGENCE") use `t("nav.sectionMain")`, etc.
3. The workspace name "My Workspace" at top of sidebar uses dynamic workspace data, not hardcoded fallback

---

## SECTION 12: ONBOARDING FLOW

### 12.1 Pre-Auth Onboarding (`/onboard/*`)

8-step flow: identity → domain → governance → record → send → source → waiting → complete.

Verify:
- Every step's heading, description, button, and input label uses `t()`
- Navigation between steps works (forward/back)
- Data persists across steps
- Completion redirects to `/app/activity`
- Step validation prevents skipping

### 12.2 In-App Onboarding (`/app/onboarding`)

Verify:
- Progress banner in sidebar shows correct step count
- Each setup task (business info, agent, phone, team, calendar, knowledge, compliance) links to correct page
- Completion state properly tracked via `workspaceMeta.onboardingCompletedAt`

---

## SECTION 13: BILLING & SUBSCRIPTION

### 13.1 Stripe Checkout Flow

Verify:
- `/app/settings/billing` or `/app/billing` loads properly
- Plan selection works
- Checkout redirects to Stripe properly
- Return URL handles success/cancel states
- Subscription status displays correctly after payment

### 13.2 Billing Page Labels

All text on billing/subscription pages must use `t()`. Check for hardcoded plan names, prices, feature lists, button labels.

---

## SECTION 14: PHONE SETUP & NUMBER PROVISIONING

### 14.1 Phone Settings (`/app/settings/phone`)

Verify:
- Phone number display works
- "Get a number" / marketplace flow works
- Number purchase/provisioning flow completes
- Adding a personal number flow works
- Status indicators (active, provisioning, inactive) display correctly
- All text uses `t()`

### 14.2 Phone Marketplace (`/app/settings/phone/marketplace`)

Country selection, number search, purchase flow — all text must use `t()`.

---

## SECTION 15: VISUAL QUALITY — FINAL POLISH

### 15.1 Typography Consistency

Verify DM Sans is used for all body text and Playfair Display for headlines. No system fonts leaking through. Check `src/app/layout.tsx` font imports.

### 15.2 Dark Theme Consistency

Every page must use CSS variables for colors. No bright white backgrounds on dark theme. No low-contrast text. Verify:
- `var(--bg-card)` for card backgrounds
- `var(--bg-surface)` for page backgrounds
- `var(--text-primary)` for main text
- `var(--text-secondary)` for secondary text
- `var(--border-default)` for borders

### 15.3 Responsive Design

Verify sidebar collapses on mobile. Mobile tabs show at bottom. All pages scroll properly on narrow viewports. No horizontal overflow.

---

## SECTION 16: FINAL VERIFICATION

After ALL sections above, run:

```bash
# 1. TypeScript compiles clean
npx tsc --noEmit

# 2. Build succeeds
npm run build

# 3. Verify no remaining hardcoded English in core pages
grep -rn '"Inbound"' src/app/app/calls/page.tsx
grep -rn '"Outbound"' src/app/app/calls/page.tsx
grep -rn '"Today"' src/app/app/appointments/page.tsx
grep -rn '"Needs attention"' src/app/app/activity/page.tsx
grep -rn '"Owner"' src/app/app/team/page.tsx
grep -rn '"Sales"' src/app/app/call-intelligence/page.tsx
grep -rn '"Open command palette"' src/app/app/AppShellClient.tsx
grep -rn '"Lead"' src/app/app/leads/page.tsx | grep -v LeadStatus
grep -rn '"Assigned"' src/app/app/calls/page.tsx
grep -rn '"All caught up"' src/app/app/activity/page.tsx
# ALL must return empty

# 4. Verify locale files have matching key counts
node -e "const en=Object.keys(JSON.stringify(require('./src/i18n/messages/en.json'))).length; const es=Object.keys(JSON.stringify(require('./src/i18n/messages/es.json'))).length; console.log('en:', en, 'es:', es)"

# 5. Commit and push
git add -A && git commit -m "feat: complete launch-ready polish — full i18n, UX, security, visual quality" && git push origin main
git log --oneline -3
```

Paste ONLY the `git log` output when done.
