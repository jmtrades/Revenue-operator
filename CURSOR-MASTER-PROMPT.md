You are an implementation engineer. This is the FINAL cleanup pass. The big fix landed — 200+ strings were i18n'd across 7 pages. These are the remaining gaps found during live Spanish locale testing. Fix every one. Do NOT stop until done.

---

# FINAL CLEANUP — recall-touch.com

**Stack:** Next.js App Router, React 19, TypeScript, next-intl ^4.8.3
**Locales:** en, es, fr, de, pt, ja — files at `src/i18n/messages/{locale}.json`
**Rule:** Every user-visible string MUST use `t()`. Add keys to ALL 6 locale files with proper translations.

---

## BUG 1: Calls page — pagination strings still hardcoded

**File:** `src/app/app/calls/page.tsx`
**What users see (Spanish):** "Showing 0–0 of 0 calls" and "Page 1 / 1" in English at the bottom of the calls table.

Search the file for these exact hardcoded strings and replace them with `t()` calls:

```
"Showing "  →  t("calls.showing")
" of "      →  t("calls.of")
" calls"    →  t("calls.callsLabel")
"Page "     →  t("calls.page")
```

Add these keys to the `calls` object in ALL 6 locale files if not already present:

**en.json:** `"showing": "Showing", "of": "of", "callsLabel": "calls", "page": "Page"`
**es.json:** `"showing": "Mostrando", "of": "de", "callsLabel": "llamadas", "page": "Página"`
**fr.json:** `"showing": "Affichage", "of": "sur", "callsLabel": "appels", "page": "Page"`
**de.json:** `"showing": "Anzeige", "of": "von", "callsLabel": "Anrufe", "page": "Seite"`
**pt.json:** `"showing": "Mostrando", "of": "de", "callsLabel": "chamadas", "page": "Página"`
**ja.json:** `"showing": "表示中", "of": "/", "callsLabel": "件の通話", "page": "ページ"`

---

## BUG 2: Activity page — "X of Y steps complete" still hardcoded

**File:** `src/app/app/activity/page.tsx`
**What users see (Spanish):** "5 of 10 steps complete" in English on the setup checklist progress bar.

Search for the hardcoded pattern that builds this string (likely string concatenation or template literal with "steps complete") and replace with a `t()` call:

Add to `dashboard` object in ALL 6 locale files:

**en.json:** `"stepsComplete": "{done} of {total} steps complete"`
**es.json:** `"stepsComplete": "{done} de {total} pasos completados"`
**fr.json:** `"stepsComplete": "{done} sur {total} étapes terminées"`
**de.json:** `"stepsComplete": "{done} von {total} Schritten abgeschlossen"`
**pt.json:** `"stepsComplete": "{done} de {total} etapas concluídas"`
**ja.json:** `"stepsComplete": "{done} / {total} ステップ完了"`

Replace in code: `t("dashboard.stepsComplete", { done: completedCount, total: totalCount })`

---

## BUG 3: Sidebar — "Leads" nav label not translated

**File:** Check the sidebar/navigation component (likely `src/components/app/Sidebar.tsx` or `src/components/app/AppShell.tsx` or similar).

The sidebar shows "Leads" in English even when in Spanish locale. All other sidebar items are translated (Panel, Agentes, Llamadas, Campañas, Bandeja, Citas, Analítica).

Find where sidebar nav items are defined. If "Leads" is hardcoded, replace with a `t()` call using the appropriate nav translation key. If the key exists in en.json but is missing from es.json (and other locales), add translations:

**es.json:** `"Prospectos"` or `"Oportunidades"`
**fr.json:** `"Prospects"`
**de.json:** `"Interessenten"`
**pt.json:** `"Leads"` (same in Portuguese)
**ja.json:** `"リード"`

---

## BUG 4: Analytics page — 5 StatCard labels still hardcoded

**File:** `src/app/app/analytics/page.tsx`
**Lines ~583-609:** The StatCard component labels are still hardcoded English:

```tsx
label="Total calls"
label="Avg handle time"
label="Lead conversion"
label="Appointments booked"
label="Est. revenue"
```

Replace each with the corresponding `t()` call. Add keys to the `analytics.kpi` (or `analytics.statCards`) object in ALL 6 locale files if not already present:

**en.json** (inside `analytics`):
```json
"kpiTotalCalls": "Total calls",
"kpiAvgHandleTime": "Avg handle time",
"kpiLeadConversion": "Lead conversion",
"kpiAppointmentsBooked": "Appointments booked",
"kpiEstRevenue": "Est. revenue"
```

**es.json:** `"kpiTotalCalls": "Total de llamadas", "kpiAvgHandleTime": "Tiempo promedio", "kpiLeadConversion": "Conversión de leads", "kpiAppointmentsBooked": "Citas reservadas", "kpiEstRevenue": "Ingresos est."`
**fr.json:** `"kpiTotalCalls": "Total d'appels", "kpiAvgHandleTime": "Durée moyenne", "kpiLeadConversion": "Conversion leads", "kpiAppointmentsBooked": "Rendez-vous pris", "kpiEstRevenue": "Revenus est."`
**de.json:** `"kpiTotalCalls": "Anrufe gesamt", "kpiAvgHandleTime": "Durchschn. Dauer", "kpiLeadConversion": "Lead-Konvertierung", "kpiAppointmentsBooked": "Termine gebucht", "kpiEstRevenue": "Gesch. Umsatz"`
**pt.json:** `"kpiTotalCalls": "Total de chamadas", "kpiAvgHandleTime": "Tempo médio", "kpiLeadConversion": "Conversão de leads", "kpiAppointmentsBooked": "Consultas agendadas", "kpiEstRevenue": "Receita est."`
**ja.json:** `"kpiTotalCalls": "総通話数", "kpiAvgHandleTime": "平均対応時間", "kpiLeadConversion": "リード転換率", "kpiAppointmentsBooked": "予約済み", "kpiEstRevenue": "推定収益"`

---

## BUG 5: Activity page — some PROGRESS_LABELS still hardcoded

**File:** `src/app/app/activity/page.tsx`
**Lines ~119-137:** The codebase audit found that some entries in the PROGRESS_LABELS object still use hardcoded English strings instead of `t()` calls. Specifically:

- "Import your contacts"
- "Set up your calendar"
- "Launch your first campaign"
- "Invite your team"

And any other progress label strings still hardcoded.

Add these to the `dashboard.progress` object in ALL 6 locale files and replace in code with `t("dashboard.progress.keyName")`.

**en.json** (inside `dashboard.progress`):
```json
"importContacts": "Import your contacts",
"setupCalendar": "Set up your calendar",
"launchCampaign": "Launch your first campaign",
"inviteTeam": "Invite your team"
```

Translate into es, fr, de, pt, ja and add to all locale files.

---

## BUG 6: Missing locale keys for agents, contacts, developer

**Files:** `src/i18n/messages/{es,fr,de,pt,ja}.json`

These keys exist in `en.json` but are MISSING from some or all non-English locale files:

1. `agents.toast.createFailed`, `agents.toast.created`, `agents.toast.deleteFailed`, `agents.toast.deleted`, `agents.toast.saveFailed`, `agents.toast.saveRetry`, `agents.toast.previewFailed`, `agents.toast.selectVoiceFirst`, `agents.toast.testLinkCopied`, `agents.toast.agentLive`
2. `contacts.toast.deleteError`, `contacts.toast.saveError`, `contacts.toast.updateError`
3. `developer.webhooks.title`, `developer.webhooks.subtitle`, `developer.webhooks.empty.title`, `developer.webhooks.empty.body`, `developer.webhooks.empty.action`

For EACH missing key:
1. Read the English value from en.json
2. Translate it
3. Add the translation to the same nested path in es.json, fr.json, de.json, pt.json, ja.json

---

## VERIFICATION

```bash
# No hardcoded pagination in calls
grep -n '"Showing "' src/app/app/calls/page.tsx
grep -n '"Page "' src/app/app/calls/page.tsx

# No hardcoded steps in activity
grep -n '"steps complete"' src/app/app/activity/page.tsx

# No hardcoded StatCard labels in analytics
grep -n 'label="Total calls"' src/app/app/analytics/page.tsx
grep -n 'label="Avg handle time"' src/app/app/analytics/page.tsx

# Sidebar "Leads" translated
grep -n '"Leads"' src/components/app/Sidebar.tsx 2>/dev/null || grep -rn '"Leads"' src/components/app/

# Build succeeds
npm run build && npx tsc --noEmit
```
Expected: All greps return empty. Build passes.

```bash
git add -A && git commit -m "fix: final i18n cleanup — pagination, stat cards, progress labels, sidebar nav, missing locale keys" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
