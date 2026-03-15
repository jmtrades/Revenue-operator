# FINAL COMPREHENSIVE CLEANUP — Every Remaining Issue

This is the LAST pass. Fix EVERY item below. Do NOT skip anything. Do NOT partially implement. Every string must work when the user switches locale. After all changes: `npx tsc --noEmit` must show zero errors. Then commit and push.

**Global Rules:**
- Use the existing `useTranslations("namespace")` pattern — add `t()` calls
- Add all new keys to ALL 6 locale files: `en.json`, `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`
- Provide REAL translations for every locale (not English copies)
- Brand names stay as-is: Recall Touch, Twilio, Zapier, Vapi, ElevenLabs, AT&T, Verizon, T-Mobile, etc.
- API endpoints, code examples, dial codes stay as-is
- `const` arrays outside components → convert to functions taking `t` parameter
- For error boundary files (can't use hooks): use `useTranslations` via a wrapper client component

---

## Part 1: Error Pages — 19 identical files (HIGH PRIORITY)

All 19 error.tsx files have 3 hardcoded strings each: "Something went wrong", "An unexpected error occurred.", "Try again". Since these are Next.js error boundaries, they CAN use hooks (they're "use client" components, NOT class components).

**Files to update (all identical pattern):**
```
src/app/app/activity/error.tsx
src/app/app/agents/error.tsx
src/app/app/analytics/error.tsx
src/app/app/appointments/error.tsx
src/app/app/billing/error.tsx
src/app/app/calendar/error.tsx
src/app/app/call-intelligence/error.tsx
src/app/app/calls/error.tsx
src/app/app/campaigns/error.tsx
src/app/app/compliance/error.tsx
src/app/app/contacts/error.tsx
src/app/app/developer/error.tsx
src/app/app/inbox/error.tsx
src/app/app/knowledge/error.tsx
src/app/app/leads/error.tsx
src/app/app/messages/error.tsx
src/app/app/onboarding/error.tsx
src/app/app/settings/error.tsx
src/app/app/team/error.tsx
```

**Replace the content of EVERY file with:**
```tsx
"use client";

import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white/90 mb-2">{t("heading")}</h2>
      <p className="text-sm text-white/50 text-center max-w-sm mb-6">
        {error?.message || t("defaultMessage")}
      </p>
      <button onClick={reset} className="px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100">
        {t("tryAgain")}
      </button>
    </div>
  );
}
```

**Add to all 6 locale files under `errors` namespace:**

en.json:
```json
"errors": {
  "heading": "Something went wrong",
  "defaultMessage": "An unexpected error occurred.",
  "tryAgain": "Try again"
}
```

es.json:
```json
"errors": {
  "heading": "Algo salió mal",
  "defaultMessage": "Ocurrió un error inesperado.",
  "tryAgain": "Intentar de nuevo"
}
```

fr.json:
```json
"errors": {
  "heading": "Une erreur est survenue",
  "defaultMessage": "Une erreur inattendue s'est produite.",
  "tryAgain": "Réessayer"
}
```

de.json:
```json
"errors": {
  "heading": "Ein Fehler ist aufgetreten",
  "defaultMessage": "Ein unerwarteter Fehler ist aufgetreten.",
  "tryAgain": "Erneut versuchen"
}
```

pt.json:
```json
"errors": {
  "heading": "Algo deu errado",
  "defaultMessage": "Ocorreu um erro inesperado.",
  "tryAgain": "Tentar novamente"
}
```

ja.json:
```json
"errors": {
  "heading": "エラーが発生しました",
  "defaultMessage": "予期しないエラーが発生しました。",
  "tryAgain": "もう一度試す"
}
```

---

## Part 2: "Receptionist" Default & Greeting Hardcoding (5 files)

The string `"Receptionist"` is hardcoded as a default agent name in multiple files. The greeting `"Thanks for calling. How can I help you today?"` is also hardcoded in multiple places. These must use the existing translation key `agents.defaultAgent.name` and `agents.defaultAgent.greeting`.

### File: `src/app/app/settings/agent/page.tsx`
Already has `useTranslations("settings")`.

**Line 65** — default config:
```tsx
// BEFORE:
agentName: "Receptionist",
// AFTER:
agentName: tSettings("agent.defaultAgentName"),
```

**Line 80** — fallback:
```tsx
// BEFORE:
agentName: data.agentName ?? "Receptionist",
// AFTER:
agentName: data.agentName ?? tSettings("agent.defaultAgentName"),
```

**Line 174** — partial hardcoding in playGreeting:
```tsx
// BEFORE:
const text = config.greeting.trim() || `Thanks for calling ${config.businessName || tSettings("agent.defaultBusiness")}. How can I help?`;
// AFTER:
const text = config.greeting.trim() || tSettings("agent.defaultGreeting", { business: config.businessName || tSettings("agent.defaultBusiness") });
```

**Line 188** — back link:
```tsx
// BEFORE:
<Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link>
// AFTER:
<Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">{tSettings("agent.backToSettings")}</Link>
```

**Line 244** — voice preview text:
```tsx
// BEFORE:
previewVoiceViaApi("Thanks for calling. How can I help you today?", {
// AFTER:
previewVoiceViaApi(tSettings("agent.voicePreviewText"), {
```

Add to `settings` namespace in all 6 locales under `agent`:
```json
"agent": {
  "defaultAgentName": "Receptionist",
  "defaultGreeting": "Thanks for calling {business}. How can I help?",
  "backToSettings": "← Settings",
  "voicePreviewText": "Thanks for calling. How can I help you today?"
}
```
Translate into all 5 non-English locales.

### File: `src/app/app/agents/new/NewAgentWizardClient.tsx`
Find the existing `useTranslations` call (or add one: `const tAgents = useTranslations("agents");`).

**Line 60** — default state:
```tsx
// BEFORE:
name: "Receptionist",
// AFTER:
name: tAgents("defaultAgent.name"),
```
NOTE: Since `defaultState` is a const OUTSIDE the component, convert it to a function: `function getDefaultState(t: ...) { ... }` and call it inside the component.

**Line 65** — default greeting:
```tsx
// BEFORE:
greeting: "Thanks for calling. How can I help you today?",
// AFTER:
greeting: t("defaultAgent.simpleGreeting"),
```

**Line 66** — default business hours:
```tsx
// BEFORE:
businessHours: "Mon–Fri 9am–5pm",
// AFTER:
businessHours: t("defaultAgent.defaultHours"),
```

**Lines 134, 153, 191** — fallback names:
```tsx
// BEFORE (all three):
name: state.name.trim() || "Receptionist",
// AFTER (all three):
name: state.name.trim() || tAgents("defaultAgent.name"),
```

Add to `agents.defaultAgent` in all 6 locales:
```json
"defaultAgent": {
  "simpleGreeting": "Thanks for calling. How can I help you today?",
  "defaultHours": "Mon–Fri 9am–5pm"
}
```
(The key `agents.defaultAgent.name` already exists — verify it has "Receptionist" in en.json.)
Translate into all 5 non-English locales.

### File: `src/app/activate/ActivateWizard.tsx`
Add `import { useTranslations } from "next-intl";` and `const t = useTranslations("activate");` inside the component.

**Line 29** — default greeting:
```tsx
// BEFORE:
greeting: "Hi, thanks for calling. How can I help you today?",
// AFTER:
greeting: t("defaultGreeting"),
```
NOTE: Since this is in a zustand store or state initializer OUTSIDE the component, you'll need to restructure. If it's a `create()` store, make the greeting empty string `""` and set the default in the component on first render, OR pass the translated default via a `useEffect`.

Add to `activate` namespace:
```json
"defaultGreeting": "Hi, thanks for calling. How can I help you today?"
```
Translate into all 5 non-English locales.

### File: `src/app/activate/steps/AgentStep.tsx`
Already has `useTranslations("activate")`.

**Line 136-137** — agent name fallback and greeting template:
```tsx
// BEFORE:
agentName: prev.agentName || "Agent",
greeting: `Hi, thanks for calling ${prev.businessName || "your business"}. How can I help you today?`,
// AFTER:
agentName: prev.agentName || t("defaultAgentName"),
greeting: t("greetingTemplate", { business: prev.businessName || t("yourBusiness") }),
```

Add to `activate` namespace:
```json
"defaultAgentName": "Agent",
"greetingTemplate": "Hi, thanks for calling {business}. How can I help you today?",
"yourBusiness": "your business"
```
Translate into all 5 non-English locales.

### File: `src/app/app/agents/AgentsPageClient.tsx`

**Line ~461** — fallback name in agent row:
```tsx
// BEFORE:
name: String(row.name ?? "Receptionist"),
// AFTER:
name: String(row.name ?? tAgents("defaultAgent.name")),
```

---

## Part 3: CoverageLimitedBanner.tsx (4 strings)

File: `src/components/CoverageLimitedBanner.tsx`
Add `import { useTranslations } from "next-intl";` and `const t = useTranslations("coverage");` at the top of the component function.

**Line 31:**
```tsx
// BEFORE:
<span>Coverage: Phone continuity active</span>
// AFTER:
<span>{t("active")}</span>
```

**Line 50:**
```tsx
// BEFORE:
Add your number to maintain conversations from personal phone threads.
// AFTER:
{t("addNumberPrompt")}
```

**Line 58:**
```tsx
// BEFORE:
Add number
// AFTER:
{t("addNumber")}
```

**Line 66:**
```tsx
// BEFORE:
Dismiss
// AFTER:
{t("dismiss")}
```

Add `coverage` namespace to all 6 locale files:

en.json:
```json
"coverage": {
  "active": "Coverage: Phone continuity active",
  "addNumberPrompt": "Add your number to maintain conversations from personal phone threads.",
  "addNumber": "Add number",
  "dismiss": "Dismiss"
}
```
Translate into all 5 non-English locales.

---

## Part 4: IndustryPageTemplate.tsx (~15 strings)

File: `src/components/IndustryPageTemplate.tsx`
Add `import { useTranslations } from "next-intl";` and `const t = useTranslations("industry");` at the top of the component.

Replace ALL hardcoded UI strings:
```tsx
// Line 103:
"This is one example of how Recall Touch works. It adapts to any business." → {t("heroSubtitle")}

// Line 109:
"Solutions" → {t("solutionsLabel")}

// Line 119:
{industry.name} AI Phone Agent → {t("heroTitle", { industry: industry.name })}

// Line 125:
Never miss a {industry.customerType} again. → {t("heroTagline", { customerType: industry.customerType })}

// Line 151 (or wherever "The problem" appears):
"The problem" → {t("problemLabel")}

// Line ~217:
"Three steps to an AI agent that answers every call." → {t("stepsHeading")}

// Line ~280:
"Key capabilities" → {t("capabilitiesLabel")}

// Line ~336:
"ROI" → {t("roiLabel")}

// Line ~402:
"Start free →" → {t("ctaStartFree")}

// Line ~408:
"See pricing →" → {t("ctaPricing")}
```

Also check for any other hardcoded strings like section descriptions, step descriptions, CTA subtexts. Translate ALL of them.

Add `industry` namespace to all 6 locale files with all keys. Translate properly.

---

## Part 5: Calls Detail Page — "Speed" label

File: `src/app/app/calls/[id]/page.tsx`

**Line 118:**
```tsx
// BEFORE:
<span className="text-[11px] text-zinc-500">Speed</span>
// AFTER:
<span className="text-[11px] text-zinc-500">{t("playbackSpeed")}</span>
```

Make sure this file has `useTranslations("calls")` and add `playbackSpeed` key:
```json
"calls": {
  "playbackSpeed": "Speed"
}
```
Translate into all 5 non-English locales (es: "Velocidad", fr: "Vitesse", de: "Geschwindigkeit", pt: "Velocidade", ja: "速度").

---

## Part 6: DocsPageContent.tsx — Remaining Technical Content

File: `src/app/docs/DocsPageContent.tsx`
Already has `const t = useTranslations("docs");`

### Integrations subsections (lines 190-211):
```tsx
// Line 190: "Zapier & Make" heading
<h3 ...>Zapier & Make</h3> → <h3 ...>{t("sections.integrations.zapierHeading")}</h3>

// Line 192: OAuth description
"Use OAuth to connect your Recall Touch workspace, then poll triggers or invoke actions." →
{t("sections.integrations.zapierDesc")}

// Line 201: "Authorize:" label
<strong>Authorize:</strong> → <strong>{t("sections.integrations.authorizeLabel")}:</strong>

// Line 202: "Token:" label
<strong>Token:</strong> → <strong>{t("sections.integrations.tokenLabel")}:</strong>

// Line 204: "Triggers (GET, Bearer token)"
{t("sections.integrations.triggersHeading")}

// Line 211: "Actions (POST, Bearer token)"
{t("sections.integrations.actionsHeading")}
```

### API endpoint descriptions (lines 260-290):
```tsx
// Line 267: "Returns current workspace and user. Auth: required (session or Bearer)."
{t("sections.api.workspaceMeDesc")}

// Line 274: "List leads for the workspace. Auth: required. Query: limit, offset, state."
{t("sections.api.leadsListDesc")}

// Line 281: "Create a lead. Auth: required. Body: name, phone, email?, company?."
{t("sections.api.leadsCreateDesc")}
```

### Code block titles:
```tsx
// title="Example: curl" → title={t("sections.api.exampleCurl")}
// title="Request body" → title={t("sections.api.requestBody")}
```

### SDK section (line 305):
```tsx
// "Create a lead" heading
<h3 ...>Create a lead</h3> → <h3 ...>{t("sections.sdk.createLeadHeading")}</h3>

// title="curl" → title={t("sections.sdk.curlTitle")}
// title="JavaScript (fetch)" → title={t("sections.sdk.jsTitle")}
// title="Python (requests)" → title={t("sections.sdk.pythonTitle")}
```

### Changelog entries (lines 347-349):
```tsx
// Line 347:
"Campaign sequences (Call, SMS, Email, Wait), lead scoring, notification center, onboarding checklist, error reporting, SEO and accessibility improvements."
→ {t("sections.changelog.entry202503")}

// Line 348:
"Vapi voice agents, Twilio phone provisioning, activity and inbox views, settings hub."
→ {t("sections.changelog.entry202502")}

// Line 349:
"Initial launch: workspace setup, sign-in, pricing, demo simulator."
→ {t("sections.changelog.entry202501")}
```

### Call forwarding carrier instructions (lines 144-148):
The carrier instructions contain BOTH translatable descriptions AND universal dial codes. Split them:
```tsx
// Line 144: AT&T
<li><strong>AT&T:</strong> {t("sections.callForwarding.att")}</li>

// Line 145: Verizon
<li><strong>Verizon:</strong> {t("sections.callForwarding.verizon")}</li>

// Line 146: T-Mobile
<li><strong>T-Mobile:</strong> {t("sections.callForwarding.tmobile")}</li>

// Line 147: Comcast Business
<li><strong>Comcast Business:</strong> {t("sections.callForwarding.comcast")}</li>

// Line 148: Google Voice
<li><strong>Google Voice:</strong> {t("sections.callForwarding.googleVoice")}</li>
```

Add ALL these keys to `docs` namespace in en.json with the original English text. Then translate ALL keys into es, fr, de, pt, ja. Keep dial codes (*21*, *72, etc.) and API endpoints as-is in translations. Only translate the surrounding descriptions.

---

## Part 7: Uncommitted Files — Commit Everything

After ALL changes above, run:

```bash
npx tsc --noEmit
```

Zero errors required. Then:

```bash
git add src/app/app/*/error.tsx src/app/app/*/*/error.tsx src/components/CoverageLimitedBanner.tsx src/components/IndustryPageTemplate.tsx src/app/docs/DocsPageContent.tsx src/app/app/settings/agent/page.tsx src/app/app/agents/new/NewAgentWizardClient.tsx src/app/app/agents/AgentsPageClient.tsx src/app/activate/ActivateWizard.tsx src/app/activate/steps/AgentStep.tsx src/app/app/calls/[id]/page.tsx src/i18n/messages/en.json src/i18n/messages/es.json src/i18n/messages/fr.json src/i18n/messages/de.json src/i18n/messages/pt.json src/i18n/messages/ja.json CURSOR-MASTER-PROMPT.md
git commit -m 'fix: complete i18n — translate error pages, defaults, banners, docs, and industry template'
git push origin main
```

Paste: the `tsc` output, `git log --oneline -3`, and confirm the push succeeded.

---

## CHECKLIST — Verify Before Committing

- [ ] All 19 error.tsx files updated with `useTranslations("errors")`
- [ ] "Receptionist" replaced with `t()` call in ALL 5 files
- [ ] Default greetings replaced in settings/agent, NewAgentWizard, ActivateWizard, AgentStep
- [ ] CoverageLimitedBanner — 4 strings translated
- [ ] IndustryPageTemplate — all ~10 strings translated
- [ ] Calls [id] page — "Speed" label translated
- [ ] DocsPageContent — integrations subsection, API descriptions, SDK subheadings, changelog, carrier instructions
- [ ] ALL new keys added to ALL 6 locale JSON files with REAL translations (not English copies)
- [ ] `npx tsc --noEmit` — ZERO errors
- [ ] Committed and pushed to main
