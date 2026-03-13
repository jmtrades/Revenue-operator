You are an implementation engineer. This is the FINAL comprehensive fix prompt. Complete EVERY bug listed below. Do not stop, do not skip, do not narrate. Fix them all, then verify.

---

# FINAL COMPREHENSIVE BUG FIX — recall-touch.com

**Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, next-intl ^4.8.3, Supabase, Vercel
**Locales:** en, es, fr, de, pt, ja — files at `src/i18n/messages/{locale}.json`
**Layout title template:** `"%s — Recall Touch"` in `src/app/layout.tsx`

---

## BUG 1: Missing `common.item` and `common.items` keys in 5 locale files

**What users see:** On the Knowledge page, non-English users see raw key text like `"0 item"` or `"3 items"` instead of translated text.

**Root cause:** Commit 9ed6636 added `common.item` and `common.items` to `en.json` only. The keys are MISSING from es.json, fr.json, de.json, pt.json, and ja.json.

**File:** `src/app/app/knowledge/page.tsx` line ~527 uses:
```typescript
{entries.length} {entries.length === 1 ? tCommon("item") : tCommon("items")}
```

### Fix:

Add BOTH keys to the `"common"` object in each file:

**es.json** — inside `"common"`:
```json
"item": "elemento",
"items": "elementos"
```

**fr.json** — inside `"common"`:
```json
"item": "element",
"items": "elements"
```

**de.json** — inside `"common"`:
```json
"item": "Element",
"items": "Elemente"
```

**pt.json** — inside `"common"`:
```json
"item": "item",
"items": "itens"
```

**ja.json** — inside `"common"`:
```json
"item": "件",
"items": "件"
```

---

## BUG 2: Knowledge page — 12 hardcoded English strings that bypass i18n

**What users see:** When switching to any non-English locale, these strings remain in English. They are hardcoded in `src/app/app/knowledge/page.tsx`.

### Fix — Step A: Add i18n keys to ALL 6 locale files

Add these keys inside the `"knowledge"` object of each locale file:

**en.json** — inside `"knowledge"`:
```json
"importHeading": "Turn your website into call-ready knowledge",
"importDescription": "Paste a public FAQ, services, or pricing page. We'll suggest Q&A pairs you can add.",
"importButton": "Import",
"importButtonLoading": "Importing...",
"importErrorNotPublic": "Could not import this URL. Check that it is public and try again.",
"importErrorGeneric": "Something went wrong importing this URL. Try again in a moment.",
"importSuggestionHint": "Click a suggestion to add it to your knowledge.",
"answerPlaceholder": "Answer text...",
"urlPlaceholder": "https://...",
"wordCount": "{count} words",
"usageCount": "Used {count} times in calls",
"gapFlag": "Callers need more info on this",
"testAnswerLabel": "AI would respond:"
```

**es.json** — inside `"knowledge"`:
```json
"importHeading": "Convierte tu sitio web en conocimiento listo para llamadas",
"importDescription": "Pega una pagina publica de preguntas frecuentes, servicios o precios. Sugeriremos pares de preguntas y respuestas que puedes agregar.",
"importButton": "Importar",
"importButtonLoading": "Importando...",
"importErrorNotPublic": "No se pudo importar esta URL. Verifica que sea publica e intentalo de nuevo.",
"importErrorGeneric": "Algo salio mal al importar esta URL. Intentalo de nuevo en un momento.",
"importSuggestionHint": "Haz clic en una sugerencia para agregarla a tu conocimiento.",
"answerPlaceholder": "Texto de respuesta...",
"urlPlaceholder": "https://...",
"wordCount": "{count} palabras",
"usageCount": "Usado {count} veces en llamadas",
"gapFlag": "Los llamantes necesitan mas informacion sobre esto",
"testAnswerLabel": "La IA responderia:"
```

**fr.json** — inside `"knowledge"`:
```json
"importHeading": "Transformez votre site web en connaissances pretes pour les appels",
"importDescription": "Collez une page publique de FAQ, services ou tarifs. Nous suggererons des paires Q&R que vous pourrez ajouter.",
"importButton": "Importer",
"importButtonLoading": "Importation...",
"importErrorNotPublic": "Impossible d'importer cette URL. Verifiez qu'elle est publique et reessayez.",
"importErrorGeneric": "Une erreur s'est produite lors de l'importation de cette URL. Reessayez dans un moment.",
"importSuggestionHint": "Cliquez sur une suggestion pour l'ajouter a vos connaissances.",
"answerPlaceholder": "Texte de reponse...",
"urlPlaceholder": "https://...",
"wordCount": "{count} mots",
"usageCount": "Utilise {count} fois dans les appels",
"gapFlag": "Les appelants ont besoin de plus d'informations a ce sujet",
"testAnswerLabel": "L'IA repondrait :"
```

**de.json** — inside `"knowledge"`:
```json
"importHeading": "Verwandeln Sie Ihre Website in anrufbereites Wissen",
"importDescription": "Fugen Sie eine offentliche FAQ-, Service- oder Preisseite ein. Wir schlagen Frage-Antwort-Paare vor, die Sie hinzufugen konnen.",
"importButton": "Importieren",
"importButtonLoading": "Importiere...",
"importErrorNotPublic": "Diese URL konnte nicht importiert werden. Prufen Sie, ob sie offentlich ist, und versuchen Sie es erneut.",
"importErrorGeneric": "Beim Importieren dieser URL ist ein Fehler aufgetreten. Versuchen Sie es in einem Moment erneut.",
"importSuggestionHint": "Klicken Sie auf einen Vorschlag, um ihn zu Ihrem Wissen hinzuzufugen.",
"answerPlaceholder": "Antworttext...",
"urlPlaceholder": "https://...",
"wordCount": "{count} Worter",
"usageCount": "{count} Mal in Anrufen verwendet",
"gapFlag": "Anrufer benotigen mehr Informationen hierzu",
"testAnswerLabel": "KI wurde antworten:"
```

**pt.json** — inside `"knowledge"`:
```json
"importHeading": "Transforme seu site em conhecimento pronto para chamadas",
"importDescription": "Cole uma pagina publica de FAQ, servicos ou precos. Sugeriremos pares de perguntas e respostas que voce pode adicionar.",
"importButton": "Importar",
"importButtonLoading": "Importando...",
"importErrorNotPublic": "Nao foi possivel importar esta URL. Verifique se ela e publica e tente novamente.",
"importErrorGeneric": "Algo deu errado ao importar esta URL. Tente novamente em um momento.",
"importSuggestionHint": "Clique em uma sugestao para adiciona-la ao seu conhecimento.",
"answerPlaceholder": "Texto da resposta...",
"urlPlaceholder": "https://...",
"wordCount": "{count} palavras",
"usageCount": "Usado {count} vezes em chamadas",
"gapFlag": "Os chamadores precisam de mais informacoes sobre isso",
"testAnswerLabel": "A IA responderia:"
```

**ja.json** — inside `"knowledge"`:
```json
"importHeading": "ウェブサイトを通話対応のナレッジに変換",
"importDescription": "公開されたFAQ、サービス、または料金ページを貼り付けてください。追加できるQ&Aペアを提案します。",
"importButton": "インポート",
"importButtonLoading": "インポート中...",
"importErrorNotPublic": "このURLをインポートできませんでした。公開されているか確認して再試行してください。",
"importErrorGeneric": "このURLのインポート中にエラーが発生しました。しばらくしてから再試行してください。",
"importSuggestionHint": "提案をクリックしてナレッジに追加します。",
"answerPlaceholder": "回答テキスト...",
"urlPlaceholder": "https://...",
"wordCount": "{count} 語",
"usageCount": "通話で {count} 回使用",
"gapFlag": "発信者はこれについてより多くの情報を必要としています",
"testAnswerLabel": "AIの応答:"
```

### Fix — Step B: Replace hardcoded strings in knowledge/page.tsx

In `src/app/app/knowledge/page.tsx`, make these exact replacements:

**Line ~201** — FAQ answer placeholder:
```typescript
// BEFORE:
placeholder="Answer text…"
// AFTER:
placeholder={t("answerPlaceholder")}
```

**Line ~250** — Website URL placeholder:
```typescript
// BEFORE:
placeholder="https://…"
// AFTER:
placeholder={t("urlPlaceholder")}
```

**Line ~651** — Import section heading:
```typescript
// BEFORE:
Turn your website into call-ready knowledge
// AFTER:
{t("importHeading")}
```

**Lines ~654-655** — Import section description:
```typescript
// BEFORE:
Paste a public FAQ, services, or pricing page. We&apos;ll suggest Q&A pairs you can add.
// AFTER:
{t("importDescription")}
```

**Line ~690** — Import error (not public):
```typescript
// BEFORE:
"Could not import this URL. Check that it is public and try again."
// AFTER:
t("importErrorNotPublic")
```

**Line ~697** — Import error (generic):
```typescript
// BEFORE:
"Something went wrong importing this URL. Try again in a moment."
// AFTER:
t("importErrorGeneric")
```

**Line ~705** — Import button text:
```typescript
// BEFORE:
{importing ? "Importing…" : "Import"}
// AFTER:
{importing ? t("importButtonLoading") : t("importButton")}
```

**Line ~716** — Import suggestion hint:
```typescript
// BEFORE:
Click a suggestion to add it to your knowledge.
// AFTER:
{t("importSuggestionHint")}
```

**Line ~803** — Word count:
```typescript
// BEFORE:
{entry.wordCount} words
// AFTER:
{t("wordCount", { count: entry.wordCount })}
```

**Line ~805** — Usage count:
```typescript
// BEFORE:
Used {entry.usageCount} times in calls
// AFTER:
{t("usageCount", { count: entry.usageCount })}
```

**Line ~811** — Gap flag:
```typescript
// BEFORE:
Callers need more info on this
// AFTER:
{t("gapFlag")}
```

**Line ~908** — Test answer label:
```typescript
// BEFORE:
AI would respond:
// AFTER:
{t("testAnswerLabel")}
```

---

## BUG 3: Dead code — unused `label` field in TYPE_OPTIONS and STATUS_OPTIONS

**What it is:** Lines 43-54 of `src/app/app/knowledge/page.tsx` define `TYPE_OPTIONS` and `STATUS_OPTIONS` with a `label` property that is NEVER used (all dropdowns now use `t()`).

### Fix:

Remove the `label` field from both constants:

```typescript
// BEFORE:
const TYPE_OPTIONS: { value: KnowledgeType; label: string }[] = [
  { value: "FAQ", label: "FAQ" },
  { value: "Document", label: "Document" },
  { value: "Website", label: "Website URL" },
  { value: "Custom", label: "Custom" },
];

const STATUS_OPTIONS: { value: KnowledgeStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Draft", label: "Draft" },
  { value: "Processing", label: "Processing" },
];

// AFTER:
const TYPE_OPTIONS: { value: KnowledgeType }[] = [
  { value: "FAQ" },
  { value: "Document" },
  { value: "Website" },
  { value: "Custom" },
];

const STATUS_OPTIONS: { value: KnowledgeStatus }[] = [
  { value: "Active" },
  { value: "Draft" },
  { value: "Processing" },
];
```

Also search the entire file for any remaining reference to `o.label` and remove it. There should be NONE — all dropdowns already use `t()`.

---

## VERIFICATION CHECKLIST

Run each of these commands. ALL must pass.

### 1. Verify common.item/items exist in all 6 locale files:
```bash
for f in src/i18n/messages/*.json; do echo "=== $f ===" && grep -c '"item"' "$f" && grep -c '"items"' "$f"; done
```
Expected: Every file shows `1` for both.

### 2. Verify new knowledge i18n keys exist in all 6 locale files:
```bash
for f in src/i18n/messages/*.json; do echo "=== $f ===" && grep -c '"importHeading"' "$f"; done
```
Expected: Every file shows `1`.

### 3. Verify NO hardcoded strings remain in knowledge/page.tsx:
```bash
grep -n "Answer text" src/app/app/knowledge/page.tsx
grep -n "Turn your website" src/app/app/knowledge/page.tsx
grep -n "Click a suggestion" src/app/app/knowledge/page.tsx
grep -n "AI would respond" src/app/app/knowledge/page.tsx
grep -n "words" src/app/app/knowledge/page.tsx | grep -v "wordCount" | grep -v import | grep -v "//"
grep -n "o\.label" src/app/app/knowledge/page.tsx
```
Expected: ALL return empty (no matches).

### 4. Build succeeds:
```bash
npm run build
```
Expected: No errors.

### 5. No TypeScript errors:
```bash
npx tsc --noEmit
```
Expected: No errors.

### 6. Commit and push:
```bash
git add -A && git commit -m "fix: knowledge page i18n completeness — add missing locale keys, replace all hardcoded strings, remove dead label fields" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
