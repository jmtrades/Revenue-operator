# FINAL CLEANUP — 2 FILES REMAINING

Everything else is done. Only these 2 files have hardcoded English strings left. Fix them and this is complete.

**Stack**: Next.js App Router · React 19 · TypeScript · next-intl ^4.8.3
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
**Rule**: Every user-visible string must use `t()`. Add keys to ALL 6 locale files with proper translations.

---

## FILE 1: `src/app/app/calls/page.tsx` — Call Detail Sheet

The call detail drawer/sheet (lines ~687-804) has 14 hardcoded strings. The page already has `const t = useTranslations();` available.

| Line | Hardcoded String | Replace With |
|------|-----------------|-------------|
| 687 | `View lead details →` | `{t("calls.detail.viewLead")}` |
| 695 | `Recording` | `{t("calls.detail.recording")}` |
| 701 | `Transcript` | `{t("calls.detail.transcript")}` |
| 707 | `Transcript (AI-processed, caller and agent turns)` | `{t("calls.detail.transcriptDesc")}` |
| 749 | `Actions taken` | `{t("calls.detail.actionsTaken")}` |
| 751 | `Appointment booked` | `{t("calls.detail.actions.appointmentBooked")}` |
| 752 | `Lead captured` | `{t("calls.detail.actions.leadCaptured")}` |
| 753 | `Call transferred` | `{t("calls.detail.actions.callTransferred")}` |
| 754 | `Voicemail left` | `{t("calls.detail.actions.voicemailLeft")}` |
| 756 | `Call handled` | `{t("calls.detail.actions.callHandled")}` |
| 762 | `Notes` | `{t("calls.detail.notes")}` |
| 789 | `Call back` | `{t("calls.detail.callBack")}` |
| 793 | `Send SMS` | `{t("calls.detail.sendSms")}` |
| 800 | `Add to leads` | `{t("calls.detail.addToLeads")}` |
| 804 | `Flag` | `{t("calls.detail.flag")}` |

**Add to `calls.detail` in en.json:**
```json
"detail": {
  "viewLead": "View lead details →",
  "recording": "Recording",
  "transcript": "Transcript",
  "transcriptDesc": "Transcript (AI-processed, caller and agent turns)",
  "actionsTaken": "Actions taken",
  "actions": {
    "appointmentBooked": "Appointment booked",
    "leadCaptured": "Lead captured",
    "callTransferred": "Call transferred",
    "voicemailLeft": "Voicemail left",
    "callHandled": "Call handled"
  },
  "notes": "Notes",
  "callBack": "Call back",
  "sendSms": "Send SMS",
  "addToLeads": "Add to leads",
  "flag": "Flag"
}
```

**Spanish (es.json):**
```json
"detail": {
  "viewLead": "Ver detalles del prospecto →",
  "recording": "Grabación",
  "transcript": "Transcripción",
  "transcriptDesc": "Transcripción (procesada por IA, turnos del llamante y agente)",
  "actionsTaken": "Acciones realizadas",
  "actions": {
    "appointmentBooked": "Cita reservada",
    "leadCaptured": "Prospecto capturado",
    "callTransferred": "Llamada transferida",
    "voicemailLeft": "Buzón de voz dejado",
    "callHandled": "Llamada atendida"
  },
  "notes": "Notas",
  "callBack": "Devolver llamada",
  "sendSms": "Enviar SMS",
  "addToLeads": "Agregar a prospectos",
  "flag": "Marcar"
}
```

Translate equivalently for fr, de, pt, ja.

---

## FILE 2: `src/app/app/call-intelligence/page.tsx` — Section Headers, Stats, Empty States

This page has ~30 hardcoded strings. It already uses `useTranslations("callIntelligence")` — use `t("key")` directly.

### Page heading (lines 352-355):
```tsx
// BEFORE:
<h1 ...>Call Intelligence</h1>
<p ...>Analyze real conversations to make your AI agent smarter.</p>
// AFTER:
<h1 ...>{t("pageTitle")}</h1>
<p ...>{t("pageSubtitle")}</p>
```

### Tab labels (lines 370, 382):
```tsx
// BEFORE: Analyzed Calls / Manual Analysis
// AFTER: {t("tabs.analyzed")} / {t("tabs.manual")}
```

### Stats section (lines 392-406):
```tsx
// BEFORE: "Calls analyzed" / "Insights extracted" / "Applied to agent" / "Avg quality"
// AFTER: {t("stats.callsAnalyzed")} / {t("stats.insightsExtracted")} / {t("stats.appliedToAgent")} / {t("stats.avgQuality")}
```

### Chart section (lines 413, 433, 446):
```tsx
// BEFORE: "Quality trends" / "No data in this range. Analyze more calls." / "Avg quality"
// AFTER: {t("chart.qualityTrends")} / {t("chart.noData")} / {t("chart.avgQuality")}
```

### Common Issues section (lines 456-464):
```tsx
// BEFORE: "Common issues" / "No recurring issues in this period." / "calls"
// AFTER: {t("commonIssues.title")} / {t("commonIssues.empty")} / {t("commonIssues.calls")}
```

### Agent Leaderboard (lines 471-473):
```tsx
// BEFORE: "Agent leaderboard (avg quality)" / "No calls by agent yet."
// AFTER: {t("leaderboard.title")} / {t("leaderboard.empty")}
```

### Filter section (lines 507, 514-518):
```tsx
// BEFORE: "Flagged (<60)" / quality filter option labels
// AFTER: {t("filters.flagged")} / {t(`filters.quality.${value}`)}
```

### Empty state (lines 528-530):
```tsx
// BEFORE: "No analyzed calls yet..." message
// AFTER: {t("empty.analyzed")}
```

### Recording label (line 618):
```tsx
// BEFORE: "Recording"
// AFTER: {t("recording")}
```

### Notes section (lines 638, 654, 656, 662):
```tsx
// BEFORE: "Internal note" / "Note saved." / "Could not save note." / "Save note"
// AFTER: {t("notes.label")} / {t("notes.saved")} / {t("notes.saveFailed")} / {t("notes.save")}
```

### Insights section (lines 738, 747-748):
```tsx
// BEFORE: "Recent insights" / "No insights yet..." message
// AFTER: {t("insights.title")} / {t("insights.empty")}
```

### Common Questions (lines 817, 820):
```tsx
// BEFORE: "Common questions" / message text
// AFTER: {t("questions.title")} / {t("questions.empty")}
```

### Analyze section (lines 851-852, 862, 865-867):
```tsx
// BEFORE: "Analyze more calls..." / "Analyze a new call" / subtitle text
// AFTER: {t("analyze.cta")} / {t("analyze.title")} / {t("analyze.subtitle")}
```

### Hex colors to replace:
- `#4F8CFF` → `var(--accent-primary)` or `text-blue-400`
- `#0A0A0B` → `var(--bg-surface)` or `bg-zinc-950`
- `#1A1A1D` → `var(--bg-card)` or `bg-zinc-900`
- `#EDEDEF` → `var(--text-primary)` or `text-zinc-100`
- `#5A5A5C` → `var(--text-tertiary)` or `text-zinc-500`
- `#8B8B8D` → `var(--text-secondary)` or `text-zinc-400`

**Add ALL keys to `callIntelligence` namespace in en.json:**
```json
"pageTitle": "Call Intelligence",
"pageSubtitle": "Analyze real conversations to make your AI agent smarter.",
"tabs": { "analyzed": "Analyzed Calls", "manual": "Manual Analysis" },
"stats": { "callsAnalyzed": "Calls analyzed", "insightsExtracted": "Insights extracted", "appliedToAgent": "Applied to agent", "avgQuality": "Avg quality" },
"chart": { "qualityTrends": "Quality trends", "noData": "No data in this range. Analyze more calls.", "avgQuality": "Avg quality" },
"commonIssues": { "title": "Common issues", "empty": "No recurring issues in this period.", "calls": "calls" },
"leaderboard": { "title": "Agent leaderboard (avg quality)", "empty": "No calls by agent yet." },
"filters": { "flagged": "Flagged (<60)" },
"empty": { "analyzed": "No analyzed calls yet. Paste a transcript or connect live calls to get started." },
"recording": "Recording",
"notes": { "label": "Internal note", "saved": "Note saved.", "saveFailed": "Could not save note.", "save": "Save note" },
"insights": { "title": "Recent insights", "empty": "No insights yet. Analyze calls to generate improvement suggestions." },
"questions": { "title": "Common questions", "empty": "Questions from callers will appear here after analysis." },
"analyze": { "title": "Analyze a new call", "subtitle": "Paste a transcript to extract quality scores, insights, and improvement suggestions.", "cta": "Analyze more calls to unlock deeper patterns." }
```

**Translate ALL to es, fr, de, pt, ja.** Spanish example:
```json
"pageTitle": "Inteligencia de Llamadas",
"pageSubtitle": "Analiza conversaciones reales para mejorar tu agente de IA.",
"tabs": { "analyzed": "Llamadas analizadas", "manual": "Análisis manual" },
"stats": { "callsAnalyzed": "Llamadas analizadas", "insightsExtracted": "Ideas extraídas", "appliedToAgent": "Aplicadas al agente", "avgQuality": "Calidad promedio" },
"chart": { "qualityTrends": "Tendencias de calidad", "noData": "Sin datos en este rango. Analiza más llamadas.", "avgQuality": "Calidad promedio" },
"commonIssues": { "title": "Problemas frecuentes", "empty": "Sin problemas recurrentes en este período.", "calls": "llamadas" },
"leaderboard": { "title": "Ranking de agentes (calidad promedio)", "empty": "Aún no hay llamadas por agente." },
"filters": { "flagged": "Marcadas (<60)" },
"empty": { "analyzed": "Aún no hay llamadas analizadas. Pega una transcripción o conecta llamadas en vivo para comenzar." },
"recording": "Grabación",
"notes": { "label": "Nota interna", "saved": "Nota guardada.", "saveFailed": "No se pudo guardar la nota.", "save": "Guardar nota" },
"insights": { "title": "Ideas recientes", "empty": "Aún no hay ideas. Analiza llamadas para generar sugerencias de mejora." },
"questions": { "title": "Preguntas frecuentes", "empty": "Las preguntas de los llamantes aparecerán aquí después del análisis." },
"analyze": { "title": "Analizar una nueva llamada", "subtitle": "Pega una transcripción para extraer puntuaciones de calidad, ideas y sugerencias de mejora.", "cta": "Analiza más llamadas para descubrir patrones más profundos." }
```

---

## VERIFICATION

```bash
# No remaining hardcoded English in these 2 files
grep -n '"View lead details' src/app/app/calls/page.tsx
grep -n '"Recording"' src/app/app/calls/page.tsx
grep -n '"Actions taken"' src/app/app/calls/page.tsx
grep -n '"Call back"' src/app/app/calls/page.tsx
grep -n '"Send SMS"' src/app/app/calls/page.tsx
grep -n '"Call Intelligence"' src/app/app/call-intelligence/page.tsx
grep -n '"Analyzed Calls"' src/app/app/call-intelligence/page.tsx
grep -n '"Note saved"' src/app/app/call-intelligence/page.tsx
grep -n '"Common issues"' src/app/app/call-intelligence/page.tsx
# ALL must return empty

npx tsc --noEmit && npm run build

git add -A && git commit -m "fix: i18n calls detail sheet + call intelligence — final hardcoded strings" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
