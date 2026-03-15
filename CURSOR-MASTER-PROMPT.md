# FINAL LAUNCH PERFECTION PROMPT — COMPLETE i18n + VISUAL SYSTEM CLEANUP

This is the definitive, final prompt. 433+ hardcoded English strings remain across 30+ files. Every single one must be replaced with `t()` calls. All hardcoded hex colors must be replaced with CSS variables or Tailwind classes. This prompt covers the entire codebase — public website AND product app.

---

## GLOBAL RULES

**Stack**: Next.js 14 App Router · React 19 · TypeScript · next-intl ^4.8.3 · Tailwind CSS v4
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
**Pattern**: `useTranslations("namespace")` → `t("key")` = `namespace.key` in JSON. Root scope: `useTranslations()` → `t("namespace.key")`.
**DB values vs display**: TypeScript type values (`"New" | "Contacted"`) are DB values — keep as-is. Display text MUST use t() mapping functions.
**Const arrays**: If a const array is defined OUTSIDE a component (like TEMPLATES, SCENARIOS, CONFIG_KEYS), refactor to a FUNCTION that takes `t` as parameter and returns translated strings. Call inside component.
**Brand names**: Keep Salesforce, HubSpot, Google Calendar, Stripe, AT&T, Verizon, T-Mobile, ElevenLabs, etc. as-is — proper nouns are not translatable.
**Hex colors**: Replace ALL hardcoded hex colors (#XXXXXX) in className strings with CSS variables or Tailwind classes:
  - `#4F8CFF` → `var(--accent-primary)` or `text-blue-400`
  - `#EDEDEF` → `var(--text-primary)` or `text-zinc-100`
  - `#8B8B8D` → `var(--text-secondary)` or `text-zinc-400`
  - `#5A5A5C` → `var(--text-tertiary)` or `text-zinc-500`
  - `#111113` / `#0D1117` / `#0A0A0B` → `var(--bg-surface)` or `bg-zinc-950`
  - `#1A1A1D` → `var(--bg-card)` or `bg-zinc-900`
  - `#FF4D4D` → `var(--accent-red)` or `text-red-400`
  - `#00D4AA` → `var(--accent-green)` or `text-emerald-400`
  - Any other hex → find the closest CSS variable or Tailwind class
**For every file**: Add new keys under the appropriate namespace in ALL 6 locale files with proper translations.

---

## SECTION 1 — AGENT SETUP WIZARD (Critical user flow — ~130 strings)

### 1A. `src/app/app/agents/components/TestStepContent.tsx`
**CRITICAL**: Does NOT import useTranslations. Add it.

```tsx
import { useTranslations } from "next-intl";
// Inside component:
const t = useTranslations("agents");
```

Refactor TEST_SCENARIOS to function:
```tsx
function getTestScenarios(t: (k: string) => string) {
  return [
    { id: "general", label: t("test.scenarios.general"), prompt: t("test.scenarios.generalPrompt") },
    { id: "booking", label: t("test.scenarios.booking"), prompt: t("test.scenarios.bookingPrompt") },
    { id: "pricing", label: t("test.scenarios.pricing"), prompt: t("test.scenarios.pricingPrompt") },
    { id: "complaint", label: t("test.scenarios.complaint"), prompt: t("test.scenarios.complaintPrompt") },
  ];
}
```

Replace ALL hardcoded strings:
- Scorecard items: "Greeting" → `t("test.scorecard.greeting")`, "Knowledge" → `t("test.scorecard.knowledge")`, "Booking" → `t("test.scorecard.booking")`, "Tone" → `t("test.scorecard.tone")`
- "Talk to your AI" → `t("test.title")`
- Description text → `t("test.description")`
- "Scenario" label → `t("test.scenarioLabel")`
- "Copy test link" → `t("test.copyLink")`
- "Scorecard" → `t("test.scorecardTitle")`
- "Ready to go live?" → `t("test.readyTitle")`
- "Continue" → `t("test.continue")`
- "Back" → `t("test.back")`

### 1B. `src/app/app/agents/components/GoLiveStepContent.tsx`
**Check**: If useTranslations was already added, verify ALL strings are wired. If not, add it.

Replace ALL (~30 strings):
- "Go live" heading → `t("goLive.title")`
- "Phone number" label → `t("goLive.phoneNumber")`
- Description text → `t("goLive.phoneDescription")`
- "No numbers available" / "None" → `t("goLive.noNumbers")` / `t("goLive.none")`
- "(this agent)" → `t("goLive.thisAgent")`
- "Assigned: " / "Readiness: " → `t("goLive.assigned")` / `t("goLive.readiness")`
- "Readiness checklist" → `t("goLive.checklist")`
- "Syncing…" / "Retry sync" → `t("goLive.syncing")` / `t("goLive.retrySync")`
- "Forward your number to your AI" → `t("goLive.forwardTitle")`
- All carrier accordion labels (keep brand names, translate instructions)
- "Preview — how your AI will respond" → `t("goLive.previewTitle")`
- All 4 scenario headings + response descriptions → `t("goLive.scenarios.booking.title")` etc.
- "Connect your phone number or activate for test calls and outbound only." → `t("goLive.connectCta")`
- "Forward your existing number" / "Get a new number" → `t("goLive.optionForward")` / `t("goLive.optionNew")`

### 1C. `src/app/app/agents/components/IdentityStepContent.tsx`
Has `useTranslations("agents")` but ~50 strings hardcoded.

TONE_OPTIONS array → refactor to function using t():
- "Professional" → `t("identity.tone.professional")`
- "Friendly" → `t("identity.tone.friendly")`
- "Casual" → `t("identity.tone.casual")`
- "Formal" → `t("identity.tone.formal")`

INDUSTRY options → refactor to function:
- "General" → `t("identity.industry.general")`
- "Dental" → `t("identity.industry.dental")` (translatable — it's a category label, not a brand)
- Same for Legal, Plumbing, Real Estate, Auto, Salon, Restaurant, Medical, Consulting, Contractor
- All industry greeting templates → `t("identity.industry.dentalGreeting")` etc.

TEMPLATES array → refactor to function:
- Each template label + description → `t("identity.templates.receptionist.label")`, `t("identity.templates.receptionist.description")` etc.

Section headers:
- "Describe what you do and who you serve..." → `t("identity.describeHint")`
- "What does this agent do?" → `t("identity.purposeLabel")`
- "Industry template" → `t("identity.industryLabel")`
- "Select an industry" → `t("identity.selectIndustry")`
- "Tone" → `t("identity.toneLabel")`
- "Agent name" → `t("identity.agentNameLabel")`
- "Call direction" → `t("identity.callDirectionLabel")`
- "Opening line" → `t("identity.openingLineLabel")`
- "Who should this agent serve?" → `t("identity.audienceLabel")`
- "Website (optional)" → `t("identity.websiteLabel")`
- "Playbooks" → `t("identity.playbooksLabel")`
- "Start from a proven pattern, then fine-tune." → `t("identity.playbooksHint")`
- "Step 1 of 6 — Identity" → `t("identity.stepIndicator")`

Buttons + UI:
- "Reading…" / "Fill from site" → `t("identity.readingSite")` / `t("identity.fillFromSite")`
- "Apply details" / "Dismiss" → `t("identity.applyDetails")` / `t("identity.dismiss")`
- "Continue to voice →" → `t("identity.continueToVoice")`

Placeholders:
- "https://yourbusiness.com" → `t("identity.websitePlaceholder")`
- "New inbound leads, existing customers, VIP callers..." → `t("identity.audiencePlaceholder")`
- "Thanks for calling... I can help with..." → `t("identity.greetingPlaceholder")`

Error messages:
- "We couldn't read that website..." → `t("identity.websiteError")`
- "We couldn't find clear business details..." → `t("identity.websiteNoDetails")`

Website details banner:
- "Website details ready to apply" → `t("identity.websiteReady")`
- "We found business details on your site. Apply them to your agent?" → `t("identity.websiteReadyDesc")`
- Privacy note text → `t("identity.websitePrivacy")`

### 1D. `src/app/app/agents/components/BehaviorStepContent.tsx`
Has `useTranslations("agents")` but ~30 strings hardcoded.

NEVER_DO_PRESETS → refactor to function:
- "Never discuss pricing or give quotes" → `t("behavior.presets.noPricing")`
- "Never schedule outside business hours" → `t("behavior.presets.noAfterHours")`
- "Never make promises about delivery dates" → `t("behavior.presets.noPromises")`
- "Never discuss competitors" → `t("behavior.presets.noCompetitors")`
- "Never share internal information" → `t("behavior.presets.noInternal")`

Section headers + descriptions:
- "How should your agent behave?" → `t("behavior.title")`
- "What should your AI never do?" → `t("behavior.neverDoTitle")`
- "Set clear boundaries so calls stay on-brand and in-bounds." → `t("behavior.neverDoHint")`
- "Qualification questions" → `t("behavior.qualTitle")`
- "Questions your AI asks to qualify leads. Drag to reorder priority." → `t("behavior.qualHint")`
- "Preset:" → `t("behavior.presetLabel")`
- "Objection handling" → `t("behavior.objectionTitle")`
- "How your AI responds to common pushback." → `t("behavior.objectionHint")`
- "Escalation & transfer" → `t("behavior.escalationTitle")`
- "When should your AI hand off to a human?" → `t("behavior.escalationHint")`
- "Transfer when the caller..." → `t("behavior.transferWhen")`

BANT/MEDDIC presets → refactor to function:
- All preset question strings → `t("behavior.bant.q1")` etc.

Buttons:
- "BANT" / "MEDDIC" / "Custom" → keep as proper nouns BUT translate button context
- "+ Add question" → `t("behavior.addQuestion")`

Escalation triggers:
- "Caller explicitly asks for a human" → `t("behavior.escalation.asksForHuman")`
- "Caller is angry or frustrated" → `t("behavior.escalation.angry")`
- "Question is about billing or payments" → `t("behavior.escalation.billing")`
- "Agent cannot answer after 2 attempts" → `t("behavior.escalation.cannotAnswer")`

### 1E. `src/app/app/agents/components/KnowledgeStepContent.tsx`
5 remaining strings:
- "What does your agent know?" → `t("knowledge.title")`
- "Import from website" → `t("knowledge.importFromWebsite")`
- "Quick start: add common Q&As for your business." → `t("knowledge.quickStartHint")`
- "Suggest Q&As" → `t("knowledge.suggestQAs")`
- "Add at least one Q&A for better results..." → `t("knowledge.minQAHint")`

### 1F. `src/app/app/agents/AgentsPageClient.tsx`
~20 remaining strings:

DEFAULT_FAQS array → refactor to function:
- All 5 Q&A pairs → `t("defaultFaqs.q1")`, `t("defaultFaqs.a1")` etc.

templateGreeting() function → use t():
- All 6 greeting templates by type → `t("greetings.receptionist")` etc.

Escalation trigger defaults:
- Same 4 triggers as BehaviorStepContent (share keys or duplicate)

### 1G. `src/app/app/agents/new/NewAgentWizardClient.tsx`
~10 remaining strings:

STEPS array → refactor to function:
- "Purpose" → `t("steps.purpose")`
- "Personality" → `t("steps.personality")`
- "Knowledge" → `t("steps.knowledge")`
- "Rules" → `t("steps.rules")`
- "Phone & Schedule" → `t("steps.phoneSchedule")`
- "Test" → `t("steps.test")`
- "Launch" → `t("steps.launch")`

Other:
- "What will this agent do?" → `t("purposeTitle")`
- "Choose the primary use." → `t("purposeHint")`
- "Pick a template (optional)" → `t("templateLabel")`

---

## SECTION 2 — SETTINGS PAGES (~100 strings)

### 2A. `src/app/app/settings/page.tsx`
~25 strings. SETTINGS_LINKS array → refactor to function using t():
- All 13 entries with labels + descriptions → `t("links.phone.label")`, `t("links.phone.description")` etc.
- "Settings" page title → `t("pageTitle")`
- "Preferences and configuration" → `t("pageSubtitle")`
- "Profile" section → `t("profile")`
- "Email" label → `t("emailLabel")`
- "Need to revisit onboarding?" → `t("revisitOnboarding")`
- "Run the 5-step setup again..." → `t("revisitOnboardingDesc")`
- "Open setup" → `t("openSetup")`
- "Danger zone" → `t("dangerZone")`
- "Cancel subscription →" → `t("cancelSubscription")`
- "Delete all data" / "Delete account" → `t("deleteData")` / `t("deleteAccount")`
- "Signing out…" / "Sign out" → `t("signingOut")` / `t("signOut")`
- "← Dashboard" → `t("backToDashboard")`
- Delete confirmation dialog texts

### 2B. `src/app/app/settings/phone/page.tsx`
~25 strings:
- "Connect your phone number" heading → `t("connectTitle")`
- Description text → `t("connectDescription")`
- "Option A — Your AI number" → `t("optionA")`
- "Option B — Forward your existing number" → `t("optionB")`
- All forwarding instructions → `t("forwardInstructions")`
- "Forward to: " → `t("forwardTo")`
- "Or by device:" → `t("orByDevice")`
- Carrier-specific dial codes → `t("carriers.att")` etc. (keep carrier names, translate "dial" instructions)
- "Quick dial codes" → `t("quickDialCodes")`
- "Test forwarding" → `t("testForwarding")`
- "We'll call you so you can talk to your agent right now." → `t("testForwardingDesc")`
- "Create an agent first so we know who should answer." → `t("createAgentFirst")`
- Error messages

### 2C. `src/app/app/settings/integrations/page.tsx`
~30 strings:

CRM_INTEGRATIONS descriptions → refactor to function:
- Keep brand names (Salesforce, HubSpot, etc.) but translate descriptions → `t("crm.salesforce.description")`

Other strings:
- Breadcrumbs → `t("breadcrumb")` / title
- "Integrations" page title + description
- Section headers: "Channels" → `t("channels")`, "CRM & contacts" → `t("crmContacts")`, "Calendar" → `t("calendar")`, "Automation & webhooks" → `t("automationWebhooks")`
- Channel cards: "Phone" → `t("phone")`, "AI phone number for calls" → `t("phoneDesc")`, "Manage →" → `t("manage")`
- "WhatsApp" → keep as brand name
- CRM status: "Last sync:" → `t("lastSync")`, "Records synced:" → `t("recordsSynced")`, "sync error" → `t("syncError")`, "View sync log →" → `t("viewSyncLog")`
- Status badges: "Connected" → `t("connected")`, "Not connected" → `t("notConnected")`
- Buttons: "Configure" → `t("configure")`, "Connect" → `t("connect")`
- Google Calendar card strings
- Webhook section: "Slack / Zapier webhook destination" → `t("webhookTitle")`, description, "Signing secret (optional)" → `t("signingSecret")`, placeholder strings
- Webhook event labels: "Lead captured" → `t("events.leadCaptured")`, "Appointment booked" → `t("events.appointmentBooked")`, etc.
- "Testing…" / "Send test" → `t("testingWebhook")` / `t("sendTest")`
- "Saving…" / "Save webhook" → `t("savingWebhook")` / `t("saveWebhook")`
- Calendar toast messages: "Google Calendar connected." etc.
- "Send leads to any CRM" → `t("sendLeadsCrm")`
- Webhook help text: "Paste a Slack incoming webhook or Zapier catch hook URL..."
- "Today's first open slots" → `t("todaySlots")`

### 2D. `src/app/app/settings/billing/page.tsx`
~25 strings:
- Breadcrumbs
- "Unable to load billing details." → `t("loadError")`
- Error description → `t("loadErrorDesc")`
- Plan display: "Starter — $297/mo" → `t("planDisplay", { plan: "Starter", price: 297 })`
- "Change plan" → `t("changePlan")`
- "Payment method: •••• 4242" → `t("paymentMethod")`
- "Update" → `t("update")`
- "Invoice history" → `t("invoiceHistory")`
- "View and download invoices in Stripe." → `t("invoiceDesc")`
- "View invoices and payment history →" → `t("viewInvoices")`
- "Pause account" button + dialog title + description
- "Cancel" button
- "Before you go" dialog title + stats message
- "Pause instead?" + description
- "Downgrade to Starter?" + description
- "We're sorry to see you go" + description

### 2E. `src/app/app/settings/compliance/page.tsx`
**1 remaining string** on line 116: `"Consent announcement (played at call start)"` — replace with `tSettings("compliance.announcementLabel")`
Also line 195: `"← Settings"` — replace with `tSettings("backToSettings")`

---

## SECTION 3 — ONBOARDING (~30 strings)

### `src/app/app/onboarding/page.tsx`
Has `useTranslations("onboarding")` but ~30 strings still hardcoded.

ONBOARDING_TEMPLATES array → refactor to function:
- All 6 templates with names, descriptions, agent names, default greetings → `t("templates.receptionist.name")`, `t("templates.receptionist.description")`, `t("templates.receptionist.agentName")`, `t("templates.receptionist.greeting")` etc.

ONBOARDING_TEST_SCENARIOS → refactor to function:
- All 5 scenario labels → `t("scenarios.general")` etc.

Form labels:
- "Welcome to Recall Touch!" → `t("welcomeTitle")`
- "Let's get your AI phone system running in 2 minutes." → `t("welcomeSubtitle")`
- "Business name" → `t("businessNameLabel")`
- "Portland Plumbing Co" (placeholder) → `t("businessNamePlaceholder")`
- "What will your AI handle?" → `t("handleLabel")`
- "Select all that apply..." → `t("handleHint")`
- "Website" → `t("websiteLabel")`
- "https://yoursite.com" (placeholder) → `t("websitePlaceholder")`
- "If you have a site, we'll use it to pre-fill..." → `t("websiteHint")`
- "Address" → `t("addressLabel")`
- "123 Main St, City, State" (placeholder) → `t("addressPlaceholder")`
- "This helps your AI answer 'Where are you located?'..." → `t("addressHint")`
- "Phone number (we'll send a code to verify)" → `t("phoneLabel")`
- "+1 (555) 000-0000" (placeholder) → `t("phonePlaceholder")`
- "Choose how your AI sounds" → `t("voiceLabel")`
- "Preview" → `t("preview")`
- "Opening greeting" → `t("greetingLabel")`
- "This is how your AI answers the phone..." → `t("greetingHint")`
- "Hear it" → `t("hearIt")`

---

## SECTION 4 — OTHER PRODUCT PAGES (~60 strings)

### 4A. `src/app/app/knowledge/page.tsx`
~10 strings. TYPE_OPTIONS and STATUS_OPTIONS → refactor to use t():
- "FAQ" / "Document" / "Website" / "Custom" → display labels must use t()
- "Active" / "Draft" / "Processing" → display labels must use t()

### 4B. `src/app/app/developer/page.tsx`
~15 strings:
- Tab labels: "API Keys" / "Webhooks" / "Event Log" → `t("tabs.apiKeys")` etc.
- "Create API Key" → `t("createApiKey")`
- Table headers → t() calls
- "API Call" → `t("apiCall")`
- "Success" / "Failed" → `t("success")` / `t("failed")`
- Date relative formatting ("ago" text)
- Permission labels
- "Label" input label

### 4C. `src/app/app/inbox/page.tsx`
~10 strings:
- formatRelative() function hardcoded time labels → use t()
- Status display labels: "Open" / "Resolved" / "Pending" → display through t()

### 4D. `src/app/app/leads/page.tsx`
~10 strings:
- Any remaining SOURCE_TO_LABEL display text not using getSourceDisplay()
- "New lead: {name}" toast → use t() with interpolation

### 4E. `src/app/app/leads/components/LeadsKanban.tsx`
~8 strings — check for hardcoded column headers and status labels

---

## SECTION 5 — PUBLIC WEBSITE (~80 strings)

### 5A. `src/components/PricingContent.tsx` (CRITICAL — 31+ strings)
Does NOT use useTranslations. Add it.

ALL pricing UI text must be translated:
- Plan names: "Starter" / "Growth" / "Scale" / "Enterprise"
- "Start free" / "Talk to sales" CTA buttons
- "Monthly" / "Annual" / "Save 17%" toggle
- "Most popular" badge
- "Pricing" heading + subtitle
- "Less than one missed call a month." tagline
- "Plans for solo operators through to established businesses..." description
- All feature comparison table headers and labels
- "ROI calculator" section heading + all labels ("Missed calls per week", "Average value per call ($)", "Monthly revenue recovered", "Annual receptionist baseline", etc.)
- "All plans include: encrypted records · compliance framework · audit trail · 14-day free trial"
- "Feature comparison" heading
- "Frequently asked questions" heading
- "Start free →" CTA
- "Trusted by operators who can't afford to miss decisive calls."
- "Questions? Talk to us →"
- ANNUAL_NOTE text

### 5B. `src/components/LiveAgentChat.tsx` (~14 strings)
VOICE_OPTIONS array → refactor to use t():
- "Professional" / "Friendly" / "Concise" labels and pills
- Default greetings per voice type

SUGGESTIONS array:
- "I'd like to schedule an appointment" → `t("suggestions.appointment")`
- "Can someone call me back about pricing?" → `t("suggestions.pricing")`
- "What services do you offer?" → `t("suggestions.services")`

Other:
- "Sorry — could you say that again?" → `t("misheard")`
- "Test how your agent responds before you connect your number." → `t("testHint")`
- "Try asking about services, pricing, or availability." → `t("tryAsking")`
- "Session limit reached. Refresh to start a new conversation." → `t("sessionLimit")`

### 5C. `src/components/demo/DemoSimulatorSection.tsx` (4 strings)
- "Loading…" → `t("loading")`
- "Conversation preview" → `t("conversationPreview")`
- "See how your AI handles a real call" → `t("subtitle")`
- Privacy/disclaimer text → `t("disclaimer")`

### 5D. `src/app/pricing/page.tsx` (metadata strings)
- All SEO metadata strings → use getTranslations() for server-side

### 5E. `src/app/industries/[slug]/page.tsx` (~10 strings)
- "Solutions" section label
- "Dedicated guide in the works" fallback heading
- Fallback description text
- "Start free →" CTA
- Industry link labels: "Plumbing & HVAC", "Dental", "Legal", "Real Estate", "Healthcare"

### 5F. `src/app/activate/ActivateWizard.tsx` (~5 strings)
- Default greeting: "Hi, thanks for calling. How can I help you today?"
- "your business" placeholder
- "Activation" label
- "Let's get your phone agent ready." heading
- "This takes about 3 minutes..." description

### 5G. `src/components/sections/Navbar.tsx`
- "Dashboard →" button text (when logged in) — should this be translated? If nav is already using t(), check that this specific button uses it.
- "Start free →" button text (when logged out)

---

## SECTION 6 — HEX COLOR CLEANUP (30+ files, 200+ instances)

Replace ALL hardcoded hex colors in className strings across the entire `src/app/app/` directory. The most common offenders:

| Hex | Replace With | Files Affected |
|-----|-------------|---------------|
| `#4F8CFF` | `var(--accent-primary)` or `text-blue-400` / `bg-blue-500` | 40+ instances |
| `#EDEDEF` | `var(--text-primary)` or `text-zinc-100` | 30+ instances |
| `#8B8B8D` | `var(--text-secondary)` or `text-zinc-400` | 25+ instances |
| `#5A5A5C` | `var(--text-tertiary)` or `text-zinc-500` | 15+ instances |
| `#111113` | `var(--bg-surface)` or `bg-zinc-950` | multiple |
| `#0D1117` | `var(--bg-base)` or `bg-zinc-950` | multiple |
| `#0A0A0B` | `var(--bg-base)` or `bg-zinc-950` | multiple |
| `#1A1A1D` | `var(--bg-card)` or `bg-zinc-900` | multiple |
| `#FF4D4D` | `var(--accent-red)` or `text-red-400` | error pages |
| `#00D4AA` | `var(--accent-green)` or `text-emerald-400` | success states |

**Key files to clean**: `calls/[id]/page.tsx`, `activity/page.tsx`, `analytics/page.tsx`, `appointments/page.tsx`, `knowledge/page.tsx`, `team/page.tsx`, all `error.tsx` files, `agents/[id]/analytics/page.tsx`, `settings/integrations/page.tsx`.

Run this to find all instances:
```bash
grep -rn 'bg-\[#\|text-\[#\|border-\[#\|fill-\[#\|stroke-\[#' src/app/app/ --include="*.tsx" | grep -v node_modules
```

---

## SECTION 7 — REMAINING SMALL FIXES

### 7A. Compliance page — 2 remaining strings
- Line 116: `"Consent announcement (played at call start)"` → `{tSettings("compliance.announcementLabel")}`
- Line 195: `"← Settings"` → `{tSettings("backToSettings")}`

### 7B. Lead scoring page — DONE (verify no remaining)
Verify line 135 now uses `tSettings("leadScoring.saving")` / `tSettings("leadScoring.saveWeights")`.

### 7C. Calls live page — DONE (verify)

### 7D. Leads detail / list — DONE (verify)

### 7E. Agent list — DONE (verify)

### 7F. Errors page — DONE (verify)

---

## LOCALE FILE MANAGEMENT

After ALL changes, ensure:

1. Every new key exists in ALL 6 locale files: en.json, es.json, fr.json, de.json, pt.json, ja.json
2. English keys have the original English text
3. Spanish, French, German, Portuguese, Japanese have proper translations
4. No orphaned keys (keys in JSON but not referenced in code)
5. No missing keys (t() calls referencing keys not in JSON)

Quick check:
```bash
wc -l src/i18n/messages/*.json
# All files should be within ±50 lines of each other
```

---

## VERIFICATION

```bash
# Core product pages — no hardcoded English
grep -n '"Go live"' src/app/app/agents/components/GoLiveStepContent.tsx
grep -n '"Talk to your AI"' src/app/app/agents/components/TestStepContent.tsx
grep -n '"Professional"' src/app/app/agents/components/IdentityStepContent.tsx
grep -n '"How should your agent"' src/app/app/agents/components/BehaviorStepContent.tsx
grep -n '"Settings"' src/app/app/settings/page.tsx
grep -n '"Connect your phone"' src/app/app/settings/phone/page.tsx
grep -n '"Integrations"' src/app/app/settings/integrations/page.tsx
grep -n '"Pause account"' src/app/app/settings/billing/page.tsx
grep -n '"Welcome to Recall"' src/app/app/onboarding/page.tsx

# Public website — no hardcoded English
grep -n '"Pricing"' src/components/PricingContent.tsx
grep -n '"Professional"' src/components/LiveAgentChat.tsx
grep -n '"Loading"' src/components/demo/DemoSimulatorSection.tsx

# Hex colors — none remaining
grep -c 'bg-\[#\|text-\[#\|border-\[#' src/app/app/agents/components/GoLiveStepContent.tsx
grep -c 'bg-\[#\|text-\[#\|border-\[#' src/app/app/call-intelligence/page.tsx

# ALL grep commands must return empty / 0

npx tsc --noEmit && npm run build

git add -A && git commit -m "fix: complete i18n — agent wizard, settings, onboarding, public site, hex colors" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
