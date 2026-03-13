You are an implementation engineer. This is a COMPREHENSIVE fix pass — 7 bugs ranked by severity. Do every single one. Do not plan. Do not narrate. Do not stop partway. Open files, edit, save, move on. If you finish one bug, immediately start the next. Do NOT ask questions.

---

## BUG 1: DUPLICATE `"knowledge"` KEY IN en.json — SILENT DATA LOSS (CRITICAL)

**What happens:** `src/i18n/messages/en.json` has TWO top-level `"knowledge"` objects. JSON does NOT allow duplicate keys — the second one (line 925) silently overrides the first (line 541). This means these keys are COMPLETELY LOST at runtime:
- `knowledge.toast.callSummaryDraftAdded`
- `knowledge.errors.testFailed`
- `knowledge.errors.noResponse`

Additionally, the FIRST knowledge block (line 541) has TWO `"toast"` sub-keys (lines 543 and 550), so even within that block the `callSummaryDraftAdded` key was being overridden.

**File: `src/i18n/messages/en.json`**

### Fix:

**MERGE** both knowledge objects into ONE. Delete the first block (lines 541–560) entirely. Add the missing keys into the second block (line 925) so the final merged object looks like this:

```json
"knowledge": {
  "pageTitle": "Knowledge — Recall Touch",
  "addEntry": "Add entry",
  "editEntry": "Edit entry",
  "heading": "Knowledge Base",
  "searchPlaceholder": "Search entries…",
  "allTypes": "All types",
  "allStatuses": "All statuses",
  "importUrl": "Import from URL",
  "bulkUpload": "Bulk upload (CSV)",
  "gapsHeading": "Knowledge Gaps",
  "mostReferenced": "Most Referenced",
  "testHeading": "Test your knowledge base",
  "testDescription": "Ask a question to see how your AI agent would respond using your knowledge entries.",
  "testPlaceholder": "e.g. What are your business hours?",
  "testButton": "Test",
  "noEntries": "No entries found",
  "noEntriesHint": "Try adjusting your filters.",
  "addFirst": "Add your first entry",
  "gapsDescription": "Callers asked about these topics but your content is limited or missing.",
  "mostReferencedDescription": "Top 5 entries used by your agent in calls.",
  "toast": {
    "callSummaryDraftAdded": "Call summary added as a draft knowledge entry. Edit and save when you're ready.",
    "minTranscript": "Paste at least 100 characters of transcript.",
    "analysisFailed": "Analysis failed.",
    "analysisSuccess": "Analyzed. {count} insights extracted.",
    "dismissFailed": "Failed to dismiss.",
    "applied": "Applied to agent.",
    "applyFailed": "Apply failed.",
    "noteSaved": "Note saved.",
    "noteSaveFailed": "Could not save note."
  },
  "errors": {
    "testFailed": "Failed to test knowledge. Please try again.",
    "noResponse": "No response generated."
  },
  "modal": {
    "addEntry": "Add entry",
    "editEntry": "Edit entry",
    "titlePlaceholder": "Entry title",
    "type": "Type",
    "question": "Question",
    "questionPlaceholder": "e.g. What are your hours?",
    "answer": "Answer",
    "uploadFile": "Upload file",
    "uploadHint": "Drag and drop or click to upload",
    "chooseFile": "Choose file",
    "indexedFile": "Indexed: {fileName}",
    "fetch": "Fetch",
    "indexing": "Indexing…",
    "indexedPages": "Indexed {count} pages",
    "content": "Content",
    "contentPlaceholder": "Freeform text…",
    "status": "Status"
  },
  "types": {
    "FAQ": "FAQ",
    "Document": "Document",
    "Website": "Website URL",
    "Custom": "Custom"
  },
  "status": {
    "active": "Active",
    "draft": "Draft"
  }
}
```

**IMPORTANT:** Also check ALL 5 non-English locale files (es.json, fr.json, de.json, pt.json, ja.json) for the same duplicate `"knowledge"` key problem. Merge them the same way. If the non-English files don't have the keys at all, add translated stubs.

---

## BUG 2: Knowledge page — 10+ hardcoded English strings (HIGH — i18n)

**File: `src/app/app/knowledge/page.tsx`**

The Knowledge page has 10+ hardcoded English strings visible to users. The i18n keys exist (or were just added in Bug 1 fix) but the page doesn't use them.

### Fix — replace each hardcoded string:

| Line | Current hardcoded string | Replace with |
|------|--------------------------|-------------|
| 523 | `"Knowledge Base"` | `{t("knowledge.heading")}` |
| 541 | `placeholder="Search entries…"` | `placeholder={t("knowledge.searchPlaceholder")}` |
| 550 | `<option value="all">All types</option>` | `<option value="all">{t("knowledge.allTypes")}</option>` |
| 560 | `<option value="all">All statuses</option>` | `<option value="all">{t("knowledge.allStatuses")}</option>` |
| 572 | `"Add Entry"` | `{t("knowledge.addEntry")}` |
| 583 | `"Import from URL"` | `{t("knowledge.importUrl")}` |
| 587 | `"Bulk upload (CSV)"` | `{t("knowledge.bulkUpload")}` |
| ~830 | `"Knowledge Gaps"` | `{t("knowledge.gapsHeading")}` |
| ~855 | `"Most Referenced"` | `{t("knowledge.mostReferenced")}` |
| ~879 | `"Test your knowledge base"` | `{t("knowledge.testHeading")}` |

Also replace any hardcoded strings for "No entries found", "Try adjusting your filters", "Add your first entry", the test description text, test placeholder, and test button label.

The page already has `const t = useTranslations();` at line 327, so just use `t("knowledge.xxx")`.

---

## BUG 3: Footer has duplicate "Contact" links (MEDIUM — UX)

**What users see:** Under the "Company" column in the footer, there are two links both labeled "Contact" — one goes to `mailto:team@recall-touch.com`, the other goes to `/contact`.

**File: `src/components/sections/Footer.tsx` — lines 45-53**

Current code:
```tsx
<a href="mailto:team@recall-touch.com" className="block hover:opacity-80 transition-opacity">
  Contact
</a>
<Link href="/blog" className="block hover:opacity-80 transition-opacity">
  Blog
</Link>
<Link href="/contact" className="block hover:opacity-80 transition-opacity">
  Contact
</Link>
```

### Fix:

Change the first link's text from "Contact" to "Email us" to differentiate them:
```tsx
<a href="mailto:team@recall-touch.com" className="block hover:opacity-80 transition-opacity">
  Email us
</a>
<Link href="/blog" className="block hover:opacity-80 transition-opacity">
  Blog
</Link>
<Link href="/contact" className="block hover:opacity-80 transition-opacity">
  Contact
</Link>
```

---

## BUG 4: Missing i18n keys in non-English locale files (MEDIUM — i18n)

The following keys exist in en.json but are MISSING from es.json, fr.json, de.json, pt.json, ja.json:

1. `agents.testPanel` namespace — if it exists in en.json, ensure all locales have it
2. `agents.voiceTest` namespace — if it exists in en.json, ensure all locales have it
3. `flowBuilder` namespace — check `flowBuilder.toast` keys (loadFailed, saved, saveFailed)
4. The new `knowledge` keys added in Bug 1 (heading, searchPlaceholder, allTypes, allStatuses, importUrl, bulkUpload, gapsHeading, mostReferenced, testHeading, testDescription, testPlaceholder, testButton, noEntries, noEntriesHint, addFirst, gapsDescription, mostReferencedDescription)

### Fix:

For each missing key in each locale file, add translated versions. Use proper translations — not English. Here are the translations for the knowledge page keys:

**es.json:**
```json
"heading": "Base de conocimiento",
"searchPlaceholder": "Buscar entradas…",
"allTypes": "Todos los tipos",
"allStatuses": "Todos los estados",
"importUrl": "Importar desde URL",
"bulkUpload": "Carga masiva (CSV)",
"gapsHeading": "Brechas de conocimiento",
"mostReferenced": "Más referenciados",
"testHeading": "Prueba tu base de conocimiento",
"testDescription": "Haz una pregunta para ver cómo respondería tu agente usando tus entradas.",
"testPlaceholder": "ej. ¿Cuál es su horario?",
"testButton": "Probar",
"noEntries": "No se encontraron entradas",
"noEntriesHint": "Intenta ajustar tus filtros.",
"addFirst": "Agrega tu primera entrada",
"gapsDescription": "Los llamantes preguntaron sobre estos temas pero tu contenido es limitado o falta.",
"mostReferencedDescription": "Las 5 entradas más usadas por tu agente en llamadas."
```

**fr.json:**
```json
"heading": "Base de connaissances",
"searchPlaceholder": "Rechercher des entrées…",
"allTypes": "Tous les types",
"allStatuses": "Tous les statuts",
"importUrl": "Importer depuis URL",
"bulkUpload": "Import en masse (CSV)",
"gapsHeading": "Lacunes de connaissances",
"mostReferenced": "Les plus référencés",
"testHeading": "Testez votre base de connaissances",
"testDescription": "Posez une question pour voir comment votre agent répondrait.",
"testPlaceholder": "ex. Quelles sont vos heures d'ouverture ?",
"testButton": "Tester",
"noEntries": "Aucune entrée trouvée",
"noEntriesHint": "Essayez d'ajuster vos filtres.",
"addFirst": "Ajoutez votre première entrée",
"gapsDescription": "Les appelants ont posé des questions sur ces sujets mais votre contenu est limité.",
"mostReferencedDescription": "Les 5 entrées les plus utilisées par votre agent lors des appels."
```

**de.json:**
```json
"heading": "Wissensdatenbank",
"searchPlaceholder": "Einträge suchen…",
"allTypes": "Alle Typen",
"allStatuses": "Alle Status",
"importUrl": "Von URL importieren",
"bulkUpload": "Massenupload (CSV)",
"gapsHeading": "Wissenslücken",
"mostReferenced": "Am häufigsten referenziert",
"testHeading": "Testen Sie Ihre Wissensdatenbank",
"testDescription": "Stellen Sie eine Frage, um zu sehen, wie Ihr Agent antworten würde.",
"testPlaceholder": "z.B. Was sind Ihre Öffnungszeiten?",
"testButton": "Testen",
"noEntries": "Keine Einträge gefunden",
"noEntriesHint": "Versuchen Sie, Ihre Filter anzupassen.",
"addFirst": "Erstellen Sie Ihren ersten Eintrag",
"gapsDescription": "Anrufer fragten nach diesen Themen, aber Ihr Inhalt ist begrenzt.",
"mostReferencedDescription": "Die 5 am häufigsten verwendeten Einträge Ihres Agenten."
```

**pt.json:**
```json
"heading": "Base de conhecimento",
"searchPlaceholder": "Pesquisar entradas…",
"allTypes": "Todos os tipos",
"allStatuses": "Todos os status",
"importUrl": "Importar de URL",
"bulkUpload": "Upload em massa (CSV)",
"gapsHeading": "Lacunas de conhecimento",
"mostReferenced": "Mais referenciados",
"testHeading": "Teste sua base de conhecimento",
"testDescription": "Faça uma pergunta para ver como seu agente responderia.",
"testPlaceholder": "ex. Qual é o horário de funcionamento?",
"testButton": "Testar",
"noEntries": "Nenhuma entrada encontrada",
"noEntriesHint": "Tente ajustar seus filtros.",
"addFirst": "Adicione sua primeira entrada",
"gapsDescription": "Os chamadores perguntaram sobre estes tópicos, mas seu conteúdo é limitado.",
"mostReferencedDescription": "As 5 entradas mais usadas pelo seu agente em chamadas."
```

**ja.json:**
```json
"heading": "ナレッジベース",
"searchPlaceholder": "エントリーを検索…",
"allTypes": "すべてのタイプ",
"allStatuses": "すべてのステータス",
"importUrl": "URLからインポート",
"bulkUpload": "一括アップロード (CSV)",
"gapsHeading": "ナレッジギャップ",
"mostReferenced": "最も参照されている",
"testHeading": "ナレッジベースをテスト",
"testDescription": "質問をして、AIエージェントがどのように回答するか確認してください。",
"testPlaceholder": "例：営業時間は？",
"testButton": "テスト",
"noEntries": "エントリーが見つかりません",
"noEntriesHint": "フィルターを調整してみてください。",
"addFirst": "最初のエントリーを追加",
"gapsDescription": "発信者がこれらのトピックについて質問しましたが、コンテンツが不足しています。",
"mostReferencedDescription": "エージェントが通話で最も使用した上位5件のエントリー。"
```

---

## BUG 5: Unused imports in AgentsPageClient.tsx (MEDIUM — CODE QUALITY)

**File: `src/app/app/agents/AgentsPageClient.tsx`**

These imports are never used and should be removed to reduce bundle size and pass linting:

- Line 10: `CheckCircle2` (from lucide-react)
- Line 13: `Headphones` (from lucide-react)
- Line 17: `PhoneOutgoing` (from lucide-react)
- Line 18: `Settings` (from lucide-react)
- Line 20: `UserCheck` (from lucide-react)
- Line 23: `AgentTestPanel` import
- Line 25: `AccordionItem` import
- Line 30: `AgentKnowledgePanel` import

### Fix:

Remove each unused import. For the lucide-react imports, remove only the unused names from the import statement — keep the ones that ARE used.

Also check these files for unused imports/variables:
- `src/app/app/agents/components/BehaviorStepContent.tsx` line 3: unused `useState`
- `src/app/api/agents/[id]/test-call/route.ts` line 69: unused `firstMessage`
- `src/app/api/webhooks/twilio/voice/route.ts` line 150: unused `firstMessage`
- `src/lib/agents/sync-vapi-agent.ts` line 84: unused `clamp`, line 115: unused `voiceSettings`
- `src/lib/outbound/execute-lead-call.ts` line 155: unused `outboundFirstMessage`
- `src/components/WorkspaceVoiceButton.tsx` lines 19-20: unused parameters `endLabel`, `showUnavailable`

---

## BUG 6: Non-English locale files missing flowBuilder toast keys (LOW — i18n)

**Root cause:** `src/app/app/agents/[id]/flow-builder/FlowBuilderClient.tsx` uses `useTranslations("flowBuilder")` and references `t("toast.loadFailed")`, `t("toast.saved")`, `t("toast.saveFailed")`.

Check if `flowBuilder.toast` exists in en.json. If so, ensure ALL 5 non-English locale files have the same keys with proper translations:

**es.json:**
```json
"flowBuilder": {
  "toast": {
    "loadFailed": "Error al cargar el flujo.",
    "saved": "Flujo guardado.",
    "saveFailed": "Error al guardar el flujo."
  }
}
```

**fr.json:**
```json
"flowBuilder": {
  "toast": {
    "loadFailed": "Échec du chargement du flux.",
    "saved": "Flux enregistré.",
    "saveFailed": "Échec de l'enregistrement du flux."
  }
}
```

**de.json:**
```json
"flowBuilder": {
  "toast": {
    "loadFailed": "Fehler beim Laden des Flows.",
    "saved": "Flow gespeichert.",
    "saveFailed": "Fehler beim Speichern des Flows."
  }
}
```

**pt.json:**
```json
"flowBuilder": {
  "toast": {
    "loadFailed": "Falha ao carregar o fluxo.",
    "saved": "Fluxo salvo.",
    "saveFailed": "Falha ao salvar o fluxo."
  }
}
```

**ja.json:**
```json
"flowBuilder": {
  "toast": {
    "loadFailed": "フローの読み込みに失敗しました。",
    "saved": "フローが保存されました。",
    "saveFailed": "フローの保存に失敗しました。"
  }
}
```

---

## BUG 7: React hook dependency warnings (LOW — CODE QUALITY)

These will cause React Compiler warnings and may cause stale closure bugs:

1. **`src/app/app/agents/[id]/flow-builder/FlowBuilderClient.tsx` line 148:**
   - `useEffect` missing `t` in dependency array
   - Also line 155: `useCallback` missing `t` in dependency array
   - Fix: Add `t` to the dependency arrays

2. **`src/app/app/messages/page.tsx` line 208:**
   - `useCallback` missing `t` in dependency array
   - Fix: Add `t` to the dependency array

3. **`src/app/app/agents/AgentsPageClient.tsx` line 733:**
   - `useEffect` missing `tAgents` in dependency array
   - Fix: Add `tAgents` to the dependency array

---

## VERIFICATION

After ALL fixes, run these checks in order:

### Check 1: No duplicate JSON keys
```bash
node -e "
const fs = require('fs');
const text = fs.readFileSync('src/i18n/messages/en.json', 'utf8');
const matches = text.match(/\"knowledge\"/g);
console.log('knowledge key count:', matches ? matches.length : 0);
// Should appear exactly as many times as there are nested usages, but only ONCE at root level
"
```
Manually verify: open en.json and search for `"knowledge":` — it should appear at root level exactly ONCE (plus any nested usages in other objects like `onboarding.knowledge`, `nav.knowledge`, `agents.steps.knowledge`).

### Check 2: Knowledge page uses i18n
```bash
grep -n 'Knowledge Base\|Search entries\|All types\|All statuses\|Add Entry\|Import from URL\|Bulk upload\|Knowledge Gaps\|Most Referenced\|Test your knowledge' src/app/app/knowledge/page.tsx
```
Expected: ZERO results (all hardcoded strings replaced with t() calls).

### Check 3: No duplicate footer links
```bash
grep -c 'Contact' src/components/sections/Footer.tsx
```
Expected: 2 (one "Email us" replaced the old "Contact", one actual "Contact" remains). Verify by reading the file.

### Check 4: No unused imports in AgentsPageClient
```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: ZERO errors.

### Check 5: Build succeeds
```bash
npm run build
```
Expected: Build completes with no errors.

### Check 6: Commit and push
```bash
git add -A && git commit -m "fix: merge duplicate knowledge i18n keys, i18n knowledge page, footer dedup, unused imports, hook deps" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Bug 1 first — open `src/i18n/messages/en.json`, find both `"knowledge"` blocks, merge them. GO.
