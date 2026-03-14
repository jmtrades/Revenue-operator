# FINAL i18n CLEANUP — 6 FILES WITH HARDCODED ENGLISH

The calls detail sheet and call-intelligence pages are DONE. These 6 files still have hardcoded English strings. Fix them all and the i18n work is complete.

**Stack**: Next.js App Router · React 19 · TypeScript · next-intl ^4.8.3
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
**Rule**: Every user-visible string must use `t()`. Add keys to ALL 6 locale files with proper translations.

---

## FILE 1: `src/app/app/leads/components/LeadDetail.tsx` — 18 hardcoded strings

The file already has `const t = useTranslations("leads")` and `const tRoot = useTranslations()`. Use `t("detail.xxx")` for leads-namespaced keys.

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 70 | `Agent: ` (prefix text) | `{t("detail.agent")}: ` or `{t("detail.agentLabel", { name: lead.assignedAgent })}` |
| 71 | `Created ` (prefix text) | `{t("detail.created")} ` |
| 77 | `Contact` (section header) | `{t("detail.contact")}` |
| 79 | `Name` (input label) | `{t("detail.name")}` |
| 80 | `Phone` (input label) | `{t("detail.phone")}` |
| 81 | `Email` (input label) | `{t("detail.email")}` |
| 87 | `What they need` (section header) | `{t("detail.whatTheyNeed")}` |
| 93 | `Stage` (section header) | `{t("detail.stage")}` |
| 106 | `Timeline` (section header) | `{t("detail.timeline")}` |
| 122 | `Call ` (prefix in link text) | `{t("detail.callPrefix")} ` |
| 132 | `Notes` (section header) | `{t("detail.notes")}` |
| 136 | `Add notes…` (placeholder) | `{t("detail.notesPlaceholder")}` |
| 149 | `Text` (button label) | `{t("detail.textButton")}` |
| 155 | `Add note` (button label) | `{t("detail.addNote")}` |
| 163 | `Call type` (aria-label) | `{t("detail.callTypeLabel")}` |
| 165-167 | `Default` / `Follow-up` / `Reminder` (select options) | `{t("detail.callTypes.default")}` / `{t("detail.callTypes.followUp")}` / `{t("detail.callTypes.reminder")}` |
| 170 | `Starting…` / `Have AI call` (button text) | `{t("detail.startingCall")}` / `{t("detail.haveAiCall")}` |
| 175 | `Archive` (button label) | `{t("detail.archive")}` |

**Add to `leads.detail` in en.json:**
```json
"detail": {
  "agent": "Agent",
  "created": "Created",
  "contact": "Contact",
  "name": "Name",
  "phone": "Phone",
  "email": "Email",
  "whatTheyNeed": "What they need",
  "stage": "Stage",
  "timeline": "Timeline",
  "callPrefix": "Call",
  "notes": "Notes",
  "notesPlaceholder": "Add notes…",
  "textButton": "Text",
  "addNote": "Add note",
  "callTypeLabel": "Call type",
  "callTypes": {
    "default": "Default",
    "followUp": "Follow-up",
    "reminder": "Reminder"
  },
  "startingCall": "Starting…",
  "haveAiCall": "Have AI call",
  "archive": "Archive"
}
```

**Spanish (es.json):**
```json
"detail": {
  "agent": "Agente",
  "created": "Creado",
  "contact": "Contacto",
  "name": "Nombre",
  "phone": "Teléfono",
  "email": "Correo",
  "whatTheyNeed": "Lo que necesitan",
  "stage": "Etapa",
  "timeline": "Cronología",
  "callPrefix": "Llamada",
  "notes": "Notas",
  "notesPlaceholder": "Agregar notas…",
  "textButton": "Mensaje",
  "addNote": "Agregar nota",
  "callTypeLabel": "Tipo de llamada",
  "callTypes": {
    "default": "Predeterminado",
    "followUp": "Seguimiento",
    "reminder": "Recordatorio"
  },
  "startingCall": "Iniciando…",
  "haveAiCall": "Llamada con IA",
  "archive": "Archivar"
}
```

Translate equivalently for fr, de, pt, ja.

---

## FILE 2: `src/app/app/leads/components/LeadsList.tsx` — 7 hardcoded table headers

The file already has `const t = useTranslations()` and `const tLeads = useTranslations("leads")`. Use `tLeads("table.xxx")` for the table headers.

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 159 | `Name` | `{tLeads("table.name")}` |
| 162 | `Phone` | `{tLeads("table.phone")}` |
| 165 | `Source` | `{tLeads("table.source")}` |
| 168 | `Score` | `{tLeads("table.score")}` |
| 171 | `Stage` | `{tLeads("table.stage")}` |
| 174 | `Last contact` | `{tLeads("table.lastContact")}` |
| 177 | `Agent` | `{tLeads("table.agent")}` |

**Add to `leads.table` in en.json:**
```json
"table": {
  "name": "Name",
  "phone": "Phone",
  "source": "Source",
  "score": "Score",
  "stage": "Stage",
  "lastContact": "Last contact",
  "agent": "Agent"
}
```

**Spanish (es.json):**
```json
"table": {
  "name": "Nombre",
  "phone": "Teléfono",
  "source": "Fuente",
  "score": "Puntuación",
  "stage": "Etapa",
  "lastContact": "Último contacto",
  "agent": "Agente"
}
```

Translate equivalently for fr, de, pt, ja.

---

## FILE 3: `src/app/app/calls/live/page.tsx` — 15 hardcoded strings

The file has `const t = useTranslations()`. Use `t("calls.live.xxx")` for all keys.

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 69 | `Select a workspace to view live calls.` | `{t("calls.live.selectWorkspace")}` |
| 77 | `Calls` (breadcrumb) | `{t("calls.live.breadcrumbCalls")}` |
| 79 | `Live` (breadcrumb) | `{t("calls.live.breadcrumbLive")}` |
| 81 | `Live call monitoring` | `{t("calls.live.pageTitle")}` |
| 82 | `Active calls across your workspace. Updates every 5 seconds.` | `{t("calls.live.pageSubtitle")}` |
| 95 | `In progress` | `{t("calls.live.inProgress")}` |
| 102 | `Waiting` | `{t("calls.live.waiting")}` |
| 111 | `No active calls right now.` | `{t("calls.live.noActiveCalls")}` |
| 112 | `New calls will appear here when they start.` | `{t("calls.live.noActiveCallsHint")}` |
| 128 | `Unknown caller` (fallback) | `{t("calls.live.unknownCaller")}` |
| 142 | `Listen in (silent)` (title attr) | `{t("calls.live.listenIn")}` |
| 150 | `Whisper (to agent only)` (title attr) | `{t("calls.live.whisper")}` |
| 158 | `Barge in` (title attr) | `{t("calls.live.bargeIn")}` |
| 167 | `Live transcript` | `{t("calls.live.liveTranscript")}` |
| 169 | `— No transcript yet —` (fallback) | `{t("calls.live.noTranscript")}` |
| 173 | `Sentiment: —` | `{t("calls.live.sentiment")}` |
| 187 | `Emergency takeover` (button) | `{t("calls.live.emergencyTakeover")}` |

**Add to `calls.live` in en.json:**
```json
"live": {
  "selectWorkspace": "Select a workspace to view live calls.",
  "breadcrumbCalls": "Calls",
  "breadcrumbLive": "Live",
  "pageTitle": "Live call monitoring",
  "pageSubtitle": "Active calls across your workspace. Updates every 5 seconds.",
  "inProgress": "In progress",
  "waiting": "Waiting",
  "noActiveCalls": "No active calls right now.",
  "noActiveCallsHint": "New calls will appear here when they start.",
  "unknownCaller": "Unknown caller",
  "listenIn": "Listen in (silent)",
  "whisper": "Whisper (to agent only)",
  "bargeIn": "Barge in",
  "liveTranscript": "Live transcript",
  "noTranscript": "— No transcript yet —",
  "sentiment": "Sentiment: —",
  "emergencyTakeover": "Emergency takeover"
}
```

**Spanish (es.json):**
```json
"live": {
  "selectWorkspace": "Selecciona un espacio de trabajo para ver llamadas en vivo.",
  "breadcrumbCalls": "Llamadas",
  "breadcrumbLive": "En vivo",
  "pageTitle": "Monitoreo de llamadas en vivo",
  "pageSubtitle": "Llamadas activas en tu espacio de trabajo. Se actualiza cada 5 segundos.",
  "inProgress": "En curso",
  "waiting": "En espera",
  "noActiveCalls": "No hay llamadas activas ahora.",
  "noActiveCallsHint": "Las nuevas llamadas aparecerán aquí cuando comiencen.",
  "unknownCaller": "Llamante desconocido",
  "listenIn": "Escuchar (silencioso)",
  "whisper": "Susurrar (solo al agente)",
  "bargeIn": "Intervenir",
  "liveTranscript": "Transcripción en vivo",
  "noTranscript": "— Sin transcripción aún —",
  "sentiment": "Sentimiento: —",
  "emergencyTakeover": "Toma de emergencia"
}
```

Translate equivalently for fr, de, pt, ja.

---

## FILE 4: `src/app/app/settings/lead-scoring/page.tsx` — 15+ hardcoded strings

The file has `const tSettings = useTranslations("settings")`. Use `tSettings("leadScoring.xxx")`.

**The CONFIG_KEYS array on lines 10-19 has all labels and help text hardcoded.** Refactor it to use t():

```tsx
// BEFORE (lines 10-19):
const CONFIG_KEYS: { key: keyof LeadScoringConfig; label: string; help?: string }[] = [
  { key: "baseScore", label: "Base score (0–100)", help: "Starting score before any events" },
  { key: "callCount", label: "Per call" },
  // ...
];

// AFTER — make CONFIG_KEYS a function that takes t:
function getConfigKeys(t: (k: string) => string) {
  return [
    { key: "baseScore" as const, label: t("leadScoring.weights.baseScore"), help: t("leadScoring.weights.baseScoreHelp") },
    { key: "callCount" as const, label: t("leadScoring.weights.callCount") },
    { key: "durationOver2Min" as const, label: t("leadScoring.weights.durationOver2Min") },
    { key: "positiveSentiment" as const, label: t("leadScoring.weights.positiveSentiment") },
    { key: "pricingQuestion" as const, label: t("leadScoring.weights.pricingQuestion") },
    { key: "booked" as const, label: t("leadScoring.weights.booked") },
    { key: "returnCaller" as const, label: t("leadScoring.weights.returnCaller") },
    { key: "negativeSentiment" as const, label: t("leadScoring.weights.negativeSentiment") },
    { key: "justBrowsing" as const, label: t("leadScoring.weights.justBrowsing") },
  ];
}
```

Then call `const configKeys = getConfigKeys(tSettings);` inside the component and use `configKeys` instead of `CONFIG_KEYS`.

**Other hardcoded strings:**

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 90 | `"Settings"` / `"Lead scoring"` (breadcrumbs) | `{tSettings("breadcrumb")}` / `{tSettings("leadScoring.title")}` |
| 91 | `Lead scoring` (h1) | `{tSettings("leadScoring.title")}` |
| 93 | Long description text | `{tSettings("leadScoring.description")}` |
| 97 | `Loading…` | `{tSettings("leadScoring.loading")}` |
| 123 | `Reset to default ({defaults[key]})` | `{tSettings("leadScoring.resetToDefault", { value: defaults[key] })}` |
| 135 | `Saving…` / `Save weights` | `{tSettings("leadScoring.saving")}` / `{tSettings("leadScoring.saveWeights")}` |
| 142 | `Use all defaults` | `{tSettings("leadScoring.useAllDefaults")}` |
| 149 | `View leads` link text + surrounding text | `{tSettings("leadScoring.viewLeadsHint")}` |

**Add to `settings.leadScoring` in en.json:**
```json
"leadScoring": {
  "title": "Lead scoring",
  "description": "Weights used to compute lead score (0–100) from calls and interactions. Scores recalculate after each call. Omit a key to use the default.",
  "loading": "Loading…",
  "resetToDefault": "Reset to default ({value})",
  "saving": "Saving…",
  "saveWeights": "Save weights",
  "useAllDefaults": "Use all defaults",
  "viewLeadsHint": "View leads to see scores. Scores update automatically after each call.",
  "weights": {
    "baseScore": "Base score (0–100)",
    "baseScoreHelp": "Starting score before any events",
    "callCount": "Per call",
    "durationOver2Min": "Call over 2 min",
    "positiveSentiment": "Positive sentiment",
    "pricingQuestion": "Asked about pricing",
    "booked": "Booked appointment",
    "returnCaller": "Return caller",
    "negativeSentiment": "Negative sentiment",
    "justBrowsing": "Just browsing / low intent"
  }
}
```

**Spanish (es.json):**
```json
"leadScoring": {
  "title": "Puntuación de prospectos",
  "description": "Pesos utilizados para calcular la puntuación del prospecto (0–100) a partir de llamadas e interacciones. Las puntuaciones se recalculan después de cada llamada.",
  "loading": "Cargando…",
  "resetToDefault": "Restablecer a predeterminado ({value})",
  "saving": "Guardando…",
  "saveWeights": "Guardar pesos",
  "useAllDefaults": "Usar todos los predeterminados",
  "viewLeadsHint": "Ver prospectos para ver puntuaciones. Se actualizan automáticamente después de cada llamada.",
  "weights": {
    "baseScore": "Puntuación base (0–100)",
    "baseScoreHelp": "Puntuación inicial antes de cualquier evento",
    "callCount": "Por llamada",
    "durationOver2Min": "Llamada de más de 2 min",
    "positiveSentiment": "Sentimiento positivo",
    "pricingQuestion": "Preguntó por precios",
    "booked": "Cita reservada",
    "returnCaller": "Llamante recurrente",
    "negativeSentiment": "Sentimiento negativo",
    "justBrowsing": "Solo mirando / baja intención"
  }
}
```

Translate equivalently for fr, de, pt, ja.

---

## FILE 5: `src/app/app/settings/compliance/page.tsx` — 20+ hardcoded strings

The file has `const tSettings = useTranslations("settings")`. Use `tSettings("compliance.xxx")`.

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 86 | `Compliance` (h1) | `{tSettings("compliance.title")}` |
| 87 | `Recording, privacy, and data retention settings.` | `{tSettings("compliance.subtitle")}` |
| 92 | `Recording consent` | `{tSettings("compliance.recordingConsent")}` |
| 94 | `Choose consent model...` description | `{tSettings("compliance.consentDescription")}` |
| 101 | `Consent mode` | `{tSettings("compliance.consentMode")}` |
| 107 | `One-party (e.g. most US states)` | `{tSettings("compliance.oneParty")}` |
| 108 | `Two-party (play announcement at call start)` | `{tSettings("compliance.twoParty")}` |
| 109 | `Do not record` | `{tSettings("compliance.doNotRecord")}` |
| 112 | `Some states (...)  require two-party consent.` | `{tSettings("compliance.twoPartyStatesHint")}` |
| 117 | `Consent announcement (played at call start)` | `{tSettings("compliance.announcementLabel")}` |
| 129 | `Pause recording during sensitive info` | `{tSettings("compliance.pauseSensitive")}` |
| 130 | `Best-effort; agent may pause...` | `{tSettings("compliance.pauseSensitiveHelp")}` |
| 148 | `Saving…` / `Save recording consent` | `{tSettings("compliance.savingConsent")}` / `{tSettings("compliance.saveConsent")}` |
| 157 | `Call recording` | `{tSettings("compliance.callRecording")}` |
| 158 | `All AI calls are recorded...` | `{tSettings("compliance.callRecordingHelp")}` |
| 169 | `HIPAA mode` | `{tSettings("compliance.hipaaMode")}` |
| 170 | `Encrypt PHI, BAA required (+$99/mo on Scale plan)` | `{tSettings("compliance.hipaaModeHelp")}` |
| 179 | `Data retention` | `{tSettings("compliance.dataRetention")}` |
| 181-184 | `30 days` / `90 days` / `180 days` / `1 year` | `{tSettings("compliance.retention30")}` etc. |
| 186 | `Recordings and transcripts older than this...` | `{tSettings("compliance.retentionHelp")}` |
| 191 | `Save changes` | `{tSettings("compliance.saveChanges")}` |
| 192 | `Export all data` | `{tSettings("compliance.exportData")}` |

**Add to `settings.compliance` in en.json** (merge with any existing compliance keys):
```json
"compliance": {
  "title": "Compliance",
  "subtitle": "Recording, privacy, and data retention settings.",
  "recordingConsent": "Recording consent",
  "consentDescription": "Choose consent model for your jurisdiction. Two-party requires playing an announcement at call start.",
  "consentMode": "Consent mode",
  "oneParty": "One-party (e.g. most US states)",
  "twoParty": "Two-party (play announcement at call start)",
  "doNotRecord": "Do not record",
  "twoPartyStatesHint": "Some states require two-party consent.",
  "announcementLabel": "Consent announcement (played at call start)",
  "pauseSensitive": "Pause recording during sensitive info",
  "pauseSensitiveHelp": "Best-effort; agent may pause when payment or PII is discussed",
  "savingConsent": "Saving…",
  "saveConsent": "Save recording consent",
  "callRecording": "Call recording",
  "callRecordingHelp": "All AI calls are recorded for quality and compliance",
  "hipaaMode": "HIPAA mode",
  "hipaaModeHelp": "Encrypt PHI, BAA required (+$99/mo on Scale plan)",
  "dataRetention": "Data retention",
  "retention30": "30 days",
  "retention90": "90 days",
  "retention180": "180 days",
  "retention365": "1 year",
  "retentionHelp": "Recordings and transcripts older than this are deleted automatically.",
  "saveChanges": "Save changes",
  "exportData": "Export all data"
}
```

**Spanish (es.json):**
```json
"compliance": {
  "title": "Cumplimiento",
  "subtitle": "Configuraciones de grabación, privacidad y retención de datos.",
  "recordingConsent": "Consentimiento de grabación",
  "consentDescription": "Elige el modelo de consentimiento para tu jurisdicción. Dos partes requiere reproducir un anuncio al inicio de la llamada.",
  "consentMode": "Modo de consentimiento",
  "oneParty": "Una parte (ej. la mayoría de estados de EE.UU.)",
  "twoParty": "Dos partes (reproduce anuncio al inicio de la llamada)",
  "doNotRecord": "No grabar",
  "twoPartyStatesHint": "Algunos estados requieren consentimiento de dos partes.",
  "announcementLabel": "Anuncio de consentimiento (se reproduce al inicio de la llamada)",
  "pauseSensitive": "Pausar grabación durante información sensible",
  "pauseSensitiveHelp": "Mejor esfuerzo; el agente puede pausar cuando se discuta información de pago o datos personales",
  "savingConsent": "Guardando…",
  "saveConsent": "Guardar consentimiento de grabación",
  "callRecording": "Grabación de llamadas",
  "callRecordingHelp": "Todas las llamadas con IA se graban para calidad y cumplimiento",
  "hipaaMode": "Modo HIPAA",
  "hipaaModeHelp": "Cifrar PHI, se requiere BAA (+$99/mes en plan Scale)",
  "dataRetention": "Retención de datos",
  "retention30": "30 días",
  "retention90": "90 días",
  "retention180": "180 días",
  "retention365": "1 año",
  "retentionHelp": "Las grabaciones y transcripciones anteriores a esto se eliminan automáticamente.",
  "saveChanges": "Guardar cambios",
  "exportData": "Exportar todos los datos"
}
```

Translate equivalently for fr, de, pt, ja.

---

## FILE 6: `src/app/app/settings/errors/page.tsx` — 5 hardcoded strings

The file already has `const t = useTranslations("settings")`.

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 36 | `"Settings"` / `"Error reports"` (breadcrumbs) | `{t("breadcrumb")}` / `{t("errorsPage.title")}` |
| 37 | `Error reports` (h1) | `{t("errorsPage.title")}` |
| 38 | `Recent client errors from this workspace...` | `{t("errorsPage.description")}` |
| 41 | `Loading…` | `{t("errorsPage.loading")}` |
| 58 | `No error reports yet.` | `{t("errorsPage.empty")}` |

**Add to `settings.errorsPage` in en.json** (merge with existing):
```json
"errorsPage": {
  "title": "Error reports",
  "description": "Recent client errors from this workspace. Use this to spot recurring issues.",
  "loading": "Loading…",
  "empty": "No error reports yet."
}
```

**Spanish (es.json):**
```json
"errorsPage": {
  "title": "Informes de errores",
  "description": "Errores recientes del cliente en este espacio de trabajo. Úsalo para detectar problemas recurrentes.",
  "loading": "Cargando…",
  "empty": "Aún no hay informes de errores."
}
```

Translate equivalently for fr, de, pt, ja.

---

## BONUS: `src/app/app/agents/components/AgentList.tsx` — 5 hardcoded strings

The file has `const t = useTranslations("agents")`.

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 84 | `Active` / `Inactive` (badge text) | `{t("status.active")}` / `{t("status.inactive")}` |
| 91 | `Default` | `{t("defaultBadge")}` |
| 104 | `calls` (suffix) | `{t("callsSuffix")}` |
| 114 | `Deactivate` / `Activate` (aria-label) | `{t("actions.deactivate")}` / `{t("actions.activate")}` |
| 123 | `Agent paused` / `Agent active` (toast strings) | `{t("toast.paused")}` / `{t("toast.active")}` |
| 128 | `Pause` / `On` (button text) | `{t("actions.pause")}` / `{t("actions.on")}` |
| 133 | `Edit agent` (aria-label) | `{t("actions.editAgent")}` |
| 145 | `Delete agent` (aria-label) | `{t("actions.deleteAgent")}` |

**Add to `agents` in en.json** (merge with existing):
```json
"status": { "active": "Active", "inactive": "Inactive" },
"defaultBadge": "Default",
"callsSuffix": "calls",
"toast": { "paused": "Agent paused", "active": "Agent active" },
"actions": {
  "activate": "Activate",
  "deactivate": "Deactivate",
  "pause": "Pause",
  "on": "On",
  "editAgent": "Edit agent",
  "deleteAgent": "Delete agent"
}
```

**Spanish (es.json):**
```json
"status": { "active": "Activo", "inactive": "Inactivo" },
"defaultBadge": "Predeterminado",
"callsSuffix": "llamadas",
"toast": { "paused": "Agente pausado", "active": "Agente activo" },
"actions": {
  "activate": "Activar",
  "deactivate": "Desactivar",
  "pause": "Pausar",
  "on": "Activar",
  "editAgent": "Editar agente",
  "deleteAgent": "Eliminar agente"
}
```

Translate equivalently for fr, de, pt, ja.

---

## LOCALE FILE SYNC

After adding all keys above, run this check to ensure no locale is missing keys:

```bash
# Quick count check — all should be within ±5 of each other
wc -l src/i18n/messages/*.json
```

---

## VERIFICATION

```bash
# No remaining hardcoded English in these files
grep -n '"Contact"' src/app/app/leads/components/LeadDetail.tsx
grep -n '"Name"' src/app/app/leads/components/LeadsList.tsx
grep -n '"Live call monitoring"' src/app/app/calls/live/page.tsx
grep -n '"Base score"' src/app/app/settings/lead-scoring/page.tsx
grep -n '"Recording consent"' src/app/app/settings/compliance/page.tsx
grep -n '"Error reports"' src/app/app/settings/errors/page.tsx
grep -n '"Active"' src/app/app/agents/components/AgentList.tsx
# ALL must return empty

npx tsc --noEmit && npm run build

git add -A && git commit -m "fix: i18n remaining hardcoded strings — leads detail, live calls, lead scoring, compliance, errors, agent list" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
