# CURSOR MASTER PROMPT — FINAL i18n COMPLETION

> **CRITICAL**: The codebase has been updated to use `t()` translation calls in many files,
> but **the corresponding keys were NEVER added to the locale JSON files**.
> This means users see raw translation key strings (e.g. `settings.agent.heading`)
> instead of actual text. This prompt fixes ALL of them.

## TECH CONTEXT

- Framework: Next.js App Router + next-intl ^4.8.3
- Locale files: `src/i18n/messages/{en,es,fr,de,pt,ja}.json`
- Pattern: `useTranslations("namespace")` → `t("key")` → looks up `namespace.key` in JSON
- Brand names (Recall Touch, Salesforce, HubSpot, ElevenLabs, Vapi, Twilio, Deepgram) are NEVER translated
- Do NOT touch any files that are already working — only add missing keys and fix specific hardcoded strings listed below

---

## PART 1 — ADD ALL MISSING TRANSLATION KEYS TO ALL 6 LOCALE FILES

Below is every translation key that is used in code via `t("...")` but does NOT exist in the locale JSON files.
You MUST add every single one to ALL 6 locale files.

For `en.json`, use the English values provided below.
For `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json` — provide proper REAL translations (not English copies).

### 1A. `activate.agent` namespace (src/app/activate/steps/AgentStep.tsx)

These keys go inside `activate.agent` in each locale file. The namespace already exists — just add the missing keys.

```json
"defaultAgentName": "Receptionist",
"greetingTemplate": "Thanks for calling {business}, how can I help you today?",
"yourBusiness": "your business",
"previewVoice": "Preview voice ▶"
```

Also fix the hardcoded string on line 124 of `src/app/activate/steps/AgentStep.tsx`:
```tsx
// BEFORE (line 124):
Preview voice ▶

// AFTER:
{t("previewVoice")}
```

### 1B. `agents` namespace — actions & toast (src/app/app/agents/components/AgentList.tsx)

Add inside the existing `agents` object:

```json
"actions": {
  "activate": "Activate",
  "deactivate": "Deactivate",
  "deleteAgent": "Delete agent",
  "editAgent": "Edit agent",
  "on": "On",
  "pause": "Pause"
},
"toast": {
  "active": "Agent activated",
  "paused": "Agent paused"
}
```

NOTE: `agents.actions` might already have some keys like `remove`, `addObjection`, `addFromSuggestions` — MERGE, do not overwrite.

### 1C. `agents.testPanel` namespace (src/app/app/agents/AgentTestPanel.tsx)

Add inside the existing `agents` object as a new `testPanel` sub-object:

```json
"testPanel": {
  "aiAgent": "AI Agent",
  "conversationAria": "Conversation with AI agent",
  "defaultGreeting": "Hi! I'm your AI assistant. How can I help you today?",
  "errors": {
    "auth": "Authentication failed. Please sign in again.",
    "connection": "Connection lost. Please try again.",
    "generic": "Something went wrong. Please try again.",
    "mic": "Microphone access denied. Please allow microphone access.",
    "noResponse": "No response from agent. Please try again.",
    "notConfigured": "Agent is not configured yet. Please complete setup first.",
    "voiceUnsupported": "Voice is not supported in this browser."
  },
  "hint": {
    "micOrType": "Use your microphone or type a message"
  },
  "inputAria": "Type a message",
  "inputPlaceholder": "Type a message...",
  "listeningClickToStop": "Listening… click to stop",
  "orTryScenario": "Or try a scenario:",
  "reset": "Reset",
  "send": "Send",
  "speaking": "Speaking…",
  "startConversation": "Start conversation",
  "stopListening": "Stop listening",
  "tapToSpeak": "Tap to speak",
  "testYourAgentHeading": "Test your agent",
  "testYourAgentSubtitle": "Have a conversation with your AI agent to see how it responds.",
  "testingLabel": "Testing",
  "thinking": "Thinking…",
  "youAsCaller": "You (caller)"
}
```

### 1D. `agents.voiceTest` namespace (src/app/app/agents/[id]/voice-test/page.tsx)

Add inside the existing `agents` object:

```json
"voiceTest": {
  "defaultPreviewText": "Hi, thanks for calling! How can I help you today?",
  "errors": {
    "applyFailed": "Failed to apply voice settings",
    "previewFailed": "Failed to preview voice"
  },
  "scriptPlaceholder": "Enter text to preview with this voice...",
  "toast": {
    "applied": "Voice settings applied",
    "played": "Voice preview played"
  }
}
```

### 1E. `billing.errors` namespace (src/app/app/settings/billing/page.tsx)

Add inside the existing `billing` object:

```json
"errors": {
  "loadingFailed": "Failed to load billing information",
  "loadingFailedDesc": "Please try again or contact support if the problem persists."
}
```

### 1F. `callIntelligence.toast` namespace (src/app/app/call-intelligence/page.tsx)

Add inside the existing `callIntelligence` object:

```json
"toast": {
  "analysisFailed": "Analysis failed. Please try again.",
  "analysisSuccess": "Analysis complete",
  "applied": "Suggestion applied",
  "applyFailed": "Failed to apply suggestion",
  "dismissFailed": "Failed to dismiss suggestion",
  "minTranscript": "Transcript is too short for analysis"
}
```

### 1G. `campaigns` namespace (src/app/app/campaigns/page.tsx)

Add to the existing `campaigns` object (MERGE with any existing keys):

```json
"addStep": "+ Add step",
"campaignRoi": "Campaign ROI",
"contacted": "Contacted",
"daysLabel": "days",
"messageTemplate": "Message template",
"minScore": "Minimum score",
"notContactedInDays": "Not contacted in X days",
"progress": "Progress",
"scheduleTypeLabel": "Schedule type",
"scheduleTypes": {
  "manual": "Manual",
  "once": "One-time",
  "recurring": "Recurring",
  "trigger": "Trigger-based"
},
"sequenceHint": "Define the steps in your outreach sequence",
"sequenceLabel": "Sequence",
"touchpointTypes": {
  "call": "Call",
  "email": "Email",
  "sms": "SMS",
  "wait": "Wait"
}
```

### 1H. `common` namespace — missing keys

Add to the existing `common` object:

```json
"activity": "Activity",
"agents": "Agents",
"title": "Title",
"url": "URL"
```

Also change `common.error` from a string to an object:
```json
// BEFORE:
"error": "Error",

// AFTER:
"error": {
  "label": "Error",
  "generic": "Something went wrong. Please try again."
}
```

**IMPORTANT**: After changing `common.error` from a string to an object, search the entire codebase for any `t("error")` calls under the `common` namespace. If any code uses `t("error")` expecting a string, update it to `t("error.label")`. Do the same for all 6 locale files.

### 1I. `contacts.form` namespace (src/app/app/contacts/page.tsx)

Add inside the existing `contacts` object:

```json
"form": {
  "addTag": "+ Add tag"
}
```

### 1J. `settings.activity` namespace (src/app/app/settings/activity/page.tsx)

Add inside the existing `settings` object:

```json
"activity": {
  "backToSettings": "← Back to Settings",
  "description": "View recent activity and changes in your workspace.",
  "empty": "No activity yet",
  "heading": "Activity Log",
  "loading": "Loading activity…"
}
```

### 1K. `settings.agent` namespace (src/app/app/settings/agent/page.tsx)

Add inside the existing `settings` object as `agent` sub-object:

```json
"agent": {
  "agentNameLabel": "Agent name",
  "agentNamePlaceholder": "e.g. Receptionist",
  "answerPlaceholder": "Answer",
  "backToSettings": "← Back to Settings",
  "businessNameLabel": "Business name",
  "businessNamePlaceholder": "e.g. Acme Corp",
  "defaultAgentName": "Receptionist",
  "defaultBusiness": "your business",
  "defaultGreeting": "Thanks for calling {business}, how can I help you today?",
  "defaultWorkspaceName": "My Business",
  "description": "Configure your AI phone agent's personality, greeting, and knowledge base.",
  "endLiveTest": "End live test",
  "greetingPlaceholderDefault": "e.g. Thanks for calling {business}, how can I help?",
  "heading": "Agent Settings",
  "knowledgeAdd": "+ Add Q&A",
  "knowledgeLabel": "Knowledge base",
  "loadFailed": "Failed to load agent settings",
  "loading": "Loading agent settings…",
  "openingGreetingHelp": "This is what callers hear first when the agent picks up.",
  "openingGreetingLabel": "Opening greeting",
  "playingVoicePreview": "Playing voice preview…",
  "previewVoice": "Preview voice",
  "questionPlaceholder": "Question",
  "removeAria": "Remove Q&A item",
  "saveAndUpdateAgent": "Save & update agent",
  "saveFailed": "Failed to save agent settings",
  "saving": "Saving…",
  "startLiveTest": "Start live test",
  "testDescription": "Test your agent by having a live phone conversation.",
  "testTitle": "Live test",
  "updated": "Agent settings updated",
  "voiceLabel": "Voice",
  "voicePreviewText": "Hi, thanks for calling! How can I help you today?",
  "voiceSyncFailed": "Settings saved but voice sync failed. Please try again."
}
```

NOTE: `settings` may already have an `agentPageTitle` key at the top level. Keep it. The `agent` sub-object is separate.

### 1L. `settings.business` namespace (src/app/app/settings/business/page.tsx)

Add inside the existing `settings` object:

```json
"business": {
  "deleteWorkspaceError": "Failed to delete workspace",
  "deleted": "Workspace deleted",
  "nameNoMatch": "Name does not match",
  "saveFailed": "Failed to save business settings"
}
```

### 1M. `settings.compliance` namespace (src/app/app/settings/compliance/page.tsx)

Add inside the existing `settings` object:

```json
"compliance": {
  "loadFailed": "Failed to load compliance settings",
  "recordingSaved": "Recording consent settings saved",
  "saveFailed": "Failed to save compliance settings",
  "saved": "Compliance settings saved"
}
```

### 1N. `settings.integrations` namespace (src/app/app/settings/integrations/mapping/page.tsx)

Add inside the existing `settings` object (MERGE with existing `integrations` if present):

```json
"integrations": {
  "addMapping": "+ Add mapping",
  "backToIntegrations": "← Back to Integrations",
  "breadcrumbIntegrations": "Integrations",
  "breadcrumbSettings": "Settings",
  "crmFallback": "CRM",
  "defaultsLoaded": "Default mappings loaded",
  "loadDefaults": "Load defaults",
  "mappingBreadcrumb": "Field Mapping",
  "mappingDescription": "Map fields between Recall Touch and your CRM.",
  "mappingTitle": "Field Mapping",
  "saveFailed": "Failed to save mapping",
  "saveMapping": "Save mapping",
  "saved": "Mapping saved",
  "saving": "Saving…",
  "testOutput": "Test output",
  "testSuccess": "Test passed",
  "testWithSampleData": "Test with sample data"
}
```

### 1O. `settings.notifications` namespace (src/app/app/settings/notifications/page.tsx)

Add inside the existing `settings` object:

```json
"notifications": {
  "backToSettings": "← Back to Settings",
  "description": "Manage how and when you receive notifications.",
  "heading": "Notifications",
  "loadFailed": "Failed to load notification preferences",
  "loadingPrefs": "Loading preferences…",
  "savePreferences": "Save preferences",
  "saved": "Notification preferences saved",
  "saving": "Saving…"
}
```

### 1P. `settings.phone` namespace (src/app/app/settings/phone/marketplace/page.tsx)

Add inside the existing `settings` object:

```json
"phone": {
  "provisionFailed": "Failed to provision phone number",
  "provisioned": "Phone number provisioned",
  "searchFailed": "Failed to search phone numbers"
}
```

### 1Q. `settings.profile` namespace (src/app/app/settings/page.tsx)

Add inside the existing `settings` object:

```json
"profile": {
  "saveFailed": "Failed to save profile",
  "saved": "Profile saved"
}
```

### 1R. `settings.syncLog` namespace (src/app/app/settings/integrations/sync-log/page.tsx)

Add inside the existing `settings` object:

```json
"syncLog": {
  "allDirections": "All directions",
  "allProviders": "All providers",
  "breadcrumb": "Sync Log",
  "description": "View the history of data syncs between Recall Touch and your integrations.",
  "empty": "No sync events yet",
  "heading": "Sync Log",
  "inbound": "Inbound",
  "loadMore": "Load more",
  "loading": "Loading sync log…",
  "outbound": "Outbound",
  "refresh": "Refresh"
}
```

---

## PART 2 — FIX REMAINING HARDCODED STRINGS

### 2A. IndustryPageTemplate.tsx (src/components/IndustryPageTemplate.tsx)

The `industry` namespace already exists in en.json with some keys. Add these NEW keys to the `industry` namespace in ALL 6 locale files:

```json
"problemHeading": "Missed calls cost {industry} businesses every day.",
"capabilitiesHeading": "Built for {industry} workflows.",
"roiText": "The average {industry} business misses",
"roiCallsPerWeek": "{count} calls per week",
"roiAtValue": "At ${value} per {label}",
"roiThatsLost": "that's",
"roiPerMonth": "${amount}/month",
"roiInLostRevenue": "in lost revenue.",
"roiPayback": "Recall Touch pays for itself in {days}.",
"per": "per {label}",
"month": "month",
"day": "day",
"days": "days"
```

Then update these lines in IndustryPageTemplate.tsx:

```tsx
// Line 163 — BEFORE:
Missed calls cost {industry.name.toLowerCase()} businesses every day.
// AFTER:
{t("problemHeading", { industry: industry.name.toLowerCase() })}

// Line 291 — BEFORE:
Built for {industry.name.toLowerCase()} workflows.
// AFTER:
{t("capabilitiesHeading", { industry: industry.name.toLowerCase() })}

// Lines 350-376 — Replace the entire ROI text content.
// The <p> tag structure stays the same, but replace all English text with t() calls:

// Line 350 "The average ... business misses" →
{t("roiText", { industry: industry.name.toLowerCase() })}{" "}

// Line 351-353 keep the <strong> wrapper, change inner text:
<strong style={{ color: "var(--text-primary)" }}>
  {industry.roi.missedCallsPerWeek} {t("roiCallsPerWeek", { count: industry.roi.missedCallsPerWeek })}
</strong>

// ". At $X per label" →
{". "}{t("roiAtValue", { value: industry.roi.avgValueNumber.toLocaleString(), label: industry.roi.avgValueLabel })}

// "that's" →
{", "}{t("roiThatsLost")}{" "}

// "$X/month" inside <strong> →
<strong style={{ color: "var(--accent-primary)" }}>
  ${industry.roi.recoveredPerMonth.toLocaleString()}/{t("month")}
</strong>{" "}

// "in lost revenue." →
{t("roiInLostRevenue")}

// Line 372 — BEFORE:
Recall Touch pays for itself in{" "}
{industry.roi.paybackDays != null ? `${industry.roi.paybackDays} day${...}` : "days"}.
// AFTER:
{t("roiPayback", {
  days: industry.roi.paybackDays != null
    ? `${industry.roi.paybackDays} ${industry.roi.paybackDays === 1 ? t("day") : t("days")}`
    : t("days")
})}
```

### 2B. calls/[id]/page.tsx — "Download" hardcoded (line 137)

The `CallRecordingPlayer` sub-component uses `useTranslations("calls.detail")`.

Add to `calls.detail` in all 6 locale files:
```json
"download": "Download"
```

Then update line 137:
```tsx
// BEFORE:
          Download

// AFTER:
          {t("download")}
```

---

## PART 3 — TRANSLATIONS FOR ALL NON-ENGLISH LOCALES

For EVERY key added above, provide REAL translations in all 5 non-English locales.

### Spanish (es.json) examples:
- "Agent Settings" → "Configuración del agente"
- "Save & update agent" → "Guardar y actualizar agente"
- "Loading…" → "Cargando…"
- "Failed to load" → "Error al cargar"
- "Activity Log" → "Registro de actividad"
- "Notifications" → "Notificaciones"
- "Download" → "Descargar"
- "Missed calls cost {industry} businesses every day." → "Las llamadas perdidas cuestan a los negocios de {industry} todos los días."
- "Built for {industry} workflows." → "Diseñado para flujos de trabajo de {industry}."
- "Send" → "Enviar"
- "Reset" → "Reiniciar"
- "Thinking…" → "Pensando…"
- "Speaking…" → "Hablando…"
- "Tap to speak" → "Toca para hablar"
- "Start conversation" → "Iniciar conversación"
- "Test your agent" → "Prueba tu agente"

### French (fr.json) examples:
- "Agent Settings" → "Paramètres de l'agent"
- "Save & update agent" → "Enregistrer et mettre à jour l'agent"
- "Activity Log" → "Journal d'activité"
- "Notifications" → "Notifications"
- "Download" → "Télécharger"
- "Send" → "Envoyer"
- "Thinking…" → "Réflexion…"

### German (de.json) examples:
- "Agent Settings" → "Agenteneinstellungen"
- "Save & update agent" → "Speichern und Agenten aktualisieren"
- "Activity Log" → "Aktivitätsprotokoll"
- "Download" → "Herunterladen"
- "Send" → "Senden"
- "Thinking…" → "Denke nach…"

### Portuguese (pt.json) examples:
- "Agent Settings" → "Configurações do agente"
- "Save & update agent" → "Salvar e atualizar agente"
- "Activity Log" → "Registro de atividade"
- "Download" → "Baixar"
- "Send" → "Enviar"
- "Thinking…" → "Pensando…"

### Japanese (ja.json) examples:
- "Agent Settings" → "エージェント設定"
- "Save & update agent" → "保存してエージェントを更新"
- "Activity Log" → "アクティビティログ"
- "Download" → "ダウンロード"
- "Send" → "送信"
- "Thinking…" → "考え中…"
- "Tap to speak" → "タップして話す"

**These are examples only.** You must translate EVERY SINGLE KEY listed in Parts 1 and 2 into ALL 5 non-English locales with proper, natural translations.

---

## PART 4 — VALIDATION CHECKLIST

After making all changes:

1. Run `npx tsc --noEmit` — must produce ZERO errors
2. Verify every key added to `en.json` also exists in `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`
3. Verify no key is left as an English copy in non-English files (except brand names)
4. Search for any remaining hardcoded English text in these files:
   - `src/app/activate/steps/AgentStep.tsx` — "Preview voice ▶" must be `{t("previewVoice")}`
   - `src/components/IndustryPageTemplate.tsx` — no English text outside `t()` calls
   - `src/app/app/calls/[id]/page.tsx` — "Download" must be `{t("download")}`

---

## PART 5 — GIT COMMIT & PUSH

```bash
git add -A
git commit -m "feat(i18n): add all missing translation keys to 6 locales

- Add 160+ missing translation keys across 15+ namespaces
- Fix hardcoded strings in IndustryPageTemplate, AgentStep, CallDetail
- Add proper translations for es, fr, de, pt, ja
- Namespaces: settings.agent, agents.testPanel, agents.voiceTest,
  campaigns, callIntelligence.toast, billing.errors, settings.activity,
  settings.notifications, settings.integrations, settings.compliance,
  settings.business, settings.phone, settings.profile, settings.syncLog,
  activate.agent, contacts.form, common additions, industry page strings"
git push origin HEAD
```

---

## SUMMARY OF SCOPE

| Category | Count | Files affected |
|----------|-------|----------------|
| Missing `settings.*` keys | 88 | agent, activity, business, compliance, integrations, notifications, phone, profile, syncLog pages |
| Missing `agents.*` keys | 40 | AgentList, AgentTestPanel, voice-test page |
| Missing `campaigns.*` keys | 19 | campaigns page |
| Missing `calls.detail.*` keys | 1 | calls/[id] "Download" |
| Missing `callIntelligence.*` keys | 6 | call-intelligence page |
| Missing `billing.*` keys | 2 | billing page |
| Missing `common.*` keys | 5 | various |
| Missing `activate.agent.*` keys | 4 | AgentStep (includes "Preview voice ▶") |
| Missing `contacts.form.*` keys | 1 | contacts page |
| Hardcoded strings in IndustryPageTemplate | ~10 | IndustryPageTemplate.tsx |
| **Total keys to add per locale** | **~176** | |
| **Total across 6 locales** | **~1,056** | |
