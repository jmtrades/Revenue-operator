# i18n PHASE 2 — 305+ HARDCODED STRINGS ACROSS 16 FILES

Phase 1 (calls, call-intelligence, leads detail/list, live calls, lead-scoring, compliance, errors, agent list) is DONE. This prompt covers everything that remains.

**Stack**: Next.js App Router · React 19 · TypeScript · next-intl ^4.8.3
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
**Rule**: Every user-visible string must use `t()`. Add keys to ALL 6 locale files with proper translations.
**Pattern**: If a file already has `useTranslations("namespace")`, use `t("key")`. If it doesn't, add the import and appropriate namespace.
**DB values vs display**: TypeScript type values like `"New" | "Contacted"` are DB values — keep them as-is. Display text must use `t()` mapping functions.

---

## PRIORITY 1 — AGENT SETUP WIZARD (Critical user flow)

### FILE 1: `src/app/app/agents/components/GoLiveStepContent.tsx`
**Status**: Does NOT import useTranslations — ADD IT
**Action**: Add `import { useTranslations } from "next-intl";` and `const t = useTranslations("agents");` inside the component.

All strings in this file are hardcoded (~30 strings). Key ones:
- "Go live" heading
- "Phone number" section with description
- "No numbers available" / "None" fallbacks
- "(this agent)" suffix
- "Assigned: " / "Readiness: " labels
- "Readiness checklist" heading
- "Syncing…" / "Retry sync" buttons
- "Forward your number to your AI" section with carrier instructions (AT&T, Verizon, T-Mobile, Other)
- "Preview — how your AI will respond" section with 4 scenario headings and response descriptions
- "Connect your phone number or activate for test calls and outbound only."
- "Forward your existing number" / "Get a new number" option labels

Use namespace `agents.goLive.*` for all keys.

### FILE 2: `src/app/app/agents/components/TestStepContent.tsx`
**Status**: Does NOT import useTranslations — ADD IT
**Action**: Add `import { useTranslations } from "next-intl";` and `const t = useTranslations("agents");` inside the component.

All strings hardcoded (~15 strings):
- TEST_SCENARIOS array (4 labels + 4 prompts) — refactor to function taking `t`
- Scorecard items: "Greeting", "Knowledge", "Booking", "Tone"
- "Talk to your AI" heading + description
- "Scenario" label
- "Copy test link" button
- "Scorecard" heading
- "Ready to go live?" heading
- "Continue" button

Use namespace `agents.test.*` for all keys.

### FILE 3: `src/app/app/agents/components/IdentityStepContent.tsx`
**Status**: Has `useTranslations("agents")` but ~50 strings are still hardcoded.

Key areas to fix:
- TONE_OPTIONS array (line ~34): "Professional", "Friendly", "Casual", "Formal" — refactor to use `t("identity.tone.professional")` etc.
- INDUSTRY options (lines ~50-89): 13 industry labels + greeting templates — refactor to use t()
- TEMPLATES array (lines ~94-150): 6 template labels and descriptions — use `t("template.xxx.label")` and `t("template.xxx.description")`
- Error messages (lines ~202, 208): website scanning errors
- Section headers: "Describe what you do...", "What does this agent do?", "Industry template", "Tone", "Agent name", "Call direction", "Opening line", "Who should this agent serve?", "Website (optional)", "Playbooks"
- Button labels: "Reading…" / "Fill from site", "Apply details", "Dismiss", "Continue to voice →"
- Placeholder text: "https://yourbusiness.com", "New inbound leads, existing customers..."
- Step indicator: "Step 1 of 6 — Identity"
- Help text strings

Use namespace `agents.identity.*` for all keys.

### FILE 4: `src/app/app/agents/components/BehaviorStepContent.tsx`
**Status**: Has `useTranslations("agents")` but ~30 strings are still hardcoded.

Key areas:
- NEVER_DO_PRESETS array (5 preset boundary rules) — refactor to use t()
- Section headers: "How should your agent behave?", "What should your AI never do?", "Qualification questions", "Objection handling", "Escalation & transfer"
- Help text for each section
- BANT / MEDDIC preset questions (6+ each)
- Button labels: "BANT", "MEDDIC", "Custom", "+ Add question"
- Escalation triggers: "Caller explicitly asks for a human", "Caller is angry or frustrated", etc.
- "Transfer when the caller..." label

Use namespace `agents.behavior.*` for all keys.

### FILE 5: `src/app/app/agents/components/KnowledgeStepContent.tsx`
**Status**: Has `useTranslations("agents")` — 5 strings remaining.

- "What does your agent know?" heading
- "Import from website" button
- "Quick start: add common Q&As for your business." description
- "Suggest Q&As" button
- "Add at least one Q&A for better results..." help text

Use namespace `agents.knowledge.*` for all keys.

### FILE 6: `src/app/app/agents/AgentsPageClient.tsx`
**Status**: Has `useTranslations("agents")` and `useTranslations("common")` — ~20 strings remaining.

Key areas:
- DEFAULT_FAQS array (5 Q&A pairs, lines ~265-274) — these are template content. Refactor to use `t("defaultFaqs.q1")` etc. for the question text, `t("defaultFaqs.a1")` for answers.
- templateGreeting() function (lines ~282-297): 6 greeting templates by agent template type
- Escalation trigger defaults (lines ~273-277): 4 English strings

Use namespace `agents.*` for all keys.

### FILE 7: `src/app/app/agents/new/NewAgentWizardClient.tsx`
**Status**: Has `useTranslations("agents.newWizard")` — ~10 strings remaining.

- STEPS array (7 step labels): "Purpose", "Personality", "Knowledge", "Rules", "Phone & Schedule", "Test", "Launch" — refactor to use t()
- "What will this agent do?" heading
- "Choose the primary use." description
- "Pick a template (optional)" label

Use namespace `agents.newWizard.*` for all keys.

---

## PRIORITY 2 — SETTINGS PAGES

### FILE 8: `src/app/app/settings/page.tsx`
**Status**: Has `useTranslations("settings")` — ~25 strings remaining.

Key areas:
- SETTINGS_LINKS array (13 entries, each with label + description) — refactor to use `t("links.phone.label")`, `t("links.phone.description")` etc.
- "Settings" page title + "Preferences and configuration" subtitle
- "Profile" section header
- "Email" label
- "Need to revisit onboarding?" + description + "Open setup" button
- "Danger zone" section with: "Cancel subscription →", "Delete all data", "Delete account"
- "Signing out…" / "Sign out" button
- "← Dashboard" link
- Delete confirmation dialog texts

Use namespace `settings.*` for all keys.

### FILE 9: `src/app/app/settings/phone/page.tsx`
**Status**: Has `useTranslations("phone")` — ~25 strings remaining.

Key areas:
- "Connect your phone number" heading + description
- "Option A — Your AI number" / "Option B — Forward your existing number" sections
- Forwarding instructions per carrier
- "Quick dial codes" section
- "Test forwarding" button + description
- Error messages

Use namespace `phone.*` for all keys.

### FILE 10: `src/app/app/settings/integrations/page.tsx`
**Status**: Has `useTranslations("integrations")` — ~30 strings remaining.

Key areas:
- CRM_INTEGRATIONS array descriptions (7 entries) — refactor to use `t("crm.salesforce.description")` etc. Keep `name` as brand names (Salesforce, HubSpot, etc.)
- Calendar toast messages (line 131): "Google Calendar connected." etc.
- Breadcrumbs: "Settings" / "Integrations"
- Page title + description
- Section headers: "Channels", "CRM & contacts", "Calendar", "Automation & webhooks"
- Channel cards: "Phone" + "AI phone number for calls" + "Manage →", "WhatsApp"
- CRM status: "Last sync:", "Records synced:", "sync error(s)", "View sync log →"
- Status badges: "Connected" / "Not connected"
- Buttons: "Configure", "Connect"
- Webhook section labels and placeholders
- Webhook event labels: "Lead captured", "Appointment booked"
- "Saving…" / "Save webhook", "Testing…" / "Send test"

Use namespace `integrations.*` for all keys.

### FILE 11: `src/app/app/settings/billing/page.tsx`
**Status**: Has `useTranslations("billing")` — ~25 strings remaining.

Key areas:
- Breadcrumbs: "Settings" / "Billing"
- Error states: "Unable to load billing details." + description
- Plan display: "Starter — $297/mo"
- "Change plan", "Payment method: •••• 4242", "Update"
- "Invoice history" + description + "View invoices and payment history →"
- "Pause account" button + dialog text
- Cancellation flow: "Before you go" + stats message + "Pause instead?" + "Downgrade to Starter?" + "We're sorry to see you go"

Use namespace `billing.*` for all keys.

### FILE 12: `src/app/app/settings/lead-scoring/page.tsx` — 2 REMAINING
Line 135: `{saving ? "Saving…" : "Save weights"}` → `{saving ? tSettings("leadScoring.saving") : tSettings("leadScoring.saveWeights")}`

The keys `leadScoring.saving` and `leadScoring.saveWeights` should already exist in en.json from Phase 1. Just wire them up.

---

## PRIORITY 3 — OTHER PRODUCT PAGES

### FILE 13: `src/app/app/onboarding/page.tsx`
**Status**: Has `useTranslations("onboarding")` — ~30 strings remaining.

Key areas:
- ONBOARDING_VOICES preview text
- ONBOARDING_TEST_SCENARIOS (5 scenario labels)
- ONBOARDING_TEMPLATES (6 entries with labels + descriptions)
- Welcome heading + subtitle
- Form labels: "Business name", "What will your AI handle?", "Website", "Address", "Phone number..."
- Placeholders: "Portland Plumbing Co", "https://yoursite.com", "123 Main St...", "+1 (555) 000-0000"
- Help text strings
- Voice selection: "Choose how your AI sounds", "Preview", "Hear it"
- "Opening greeting" section + description

Use namespace `onboarding.*` for all keys.

### FILE 14: `src/app/app/leads/page.tsx`
**Status**: Has `useTranslations()` — ~10 strings remaining.

- SOURCE_TO_LABEL display mapping — should already use getSourceDisplay(). If any remain as hardcoded display text, wire them through t().
- "New lead: {name}" toast format string

### FILE 15: `src/app/app/knowledge/page.tsx`
**Status**: Has `useTranslations("knowledge")` — ~10 strings remaining.

- TYPE_OPTIONS array labels (4 types)
- STATUS_OPTIONS array labels (3 statuses)
- Any remaining form labels not using t()

### FILE 16: `src/app/app/developer/page.tsx`
**Status**: Has `useTranslations("developer")` — ~15 strings remaining.

- "Create API Key" button
- Table headers (6 columns)
- Input labels in create dialog
- Date formatting with hardcoded "ago" text

### FILE 17: `src/app/app/inbox/page.tsx`
**Status**: Has `useTranslations()` — ~10 strings remaining.

- formatRelative() function with hardcoded time labels (today, yesterday, X days ago)
- Any remaining hardcoded labels

---

## IMPLEMENTATION RULES

1. **For const arrays defined outside components** (TEMPLATES, SCENARIOS, CONFIG_KEYS, etc.): Refactor to a function that takes `t` as parameter and returns the array with translated strings. Call it inside the component.

2. **For brand names** (Salesforce, HubSpot, Google Calendar, Stripe, AT&T, Verizon, T-Mobile): Keep as-is — these are proper nouns, not translatable.

3. **For DB values** (status enums like "New", "Contacted", "Won"): Keep the TypeScript types as-is. Only translate the display text via mapping functions.

4. **For template/default content** (FAQ answers, greeting templates): These ARE translatable because they're user-facing defaults shown in the UI. Add them as locale keys.

5. **For number formatting** ($297, 4242): Keep numbers but translate surrounding text. Use ICU message format where needed: `t("planCost", { price: 297 })`.

6. **For each file**: Add new keys under the file's existing namespace in ALL 6 locale files (en, es, fr, de, pt, ja) with proper translations.

---

## LOCALE KEY GUIDELINES

When adding keys to locale files, follow these namespace conventions:
- `agents.identity.*` — Identity step
- `agents.behavior.*` — Behavior step
- `agents.knowledge.*` — Knowledge step (agent setup)
- `agents.test.*` — Test step
- `agents.goLive.*` — Go Live step
- `agents.newWizard.*` — New agent wizard
- `agents.defaultFaqs.*` — Default FAQ templates
- `settings.*` — Settings main page
- `phone.*` — Phone settings
- `integrations.*` — Integrations page
- `billing.*` — Billing page
- `onboarding.*` — Onboarding flow
- `knowledge.*` — Knowledge base page
- `developer.*` — Developer page
- `inbox.*` — Inbox page

---

## VERIFICATION

```bash
# Spot-check critical files for remaining hardcoded English
grep -n '"Go live"' src/app/app/agents/components/GoLiveStepContent.tsx
grep -n '"Talk to your AI"' src/app/app/agents/components/TestStepContent.tsx
grep -n '"Professional"' src/app/app/agents/components/IdentityStepContent.tsx
grep -n '"How should your agent"' src/app/app/agents/components/BehaviorStepContent.tsx
grep -n '"Connect your phone"' src/app/app/settings/phone/page.tsx
grep -n '"Integrations"' src/app/app/settings/integrations/page.tsx
grep -n '"Pause account"' src/app/app/settings/billing/page.tsx
grep -n '"Welcome to Recall"' src/app/app/onboarding/page.tsx
grep -n '"Settings"' src/app/app/settings/page.tsx
grep -n '"Saving…"' src/app/app/settings/lead-scoring/page.tsx
# ALL must return empty

npx tsc --noEmit && npm run build

git add -A && git commit -m "fix: i18n phase 2 — agent wizard, settings, onboarding, and remaining product pages" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
