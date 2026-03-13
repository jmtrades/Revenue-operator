You are an implementation engineer. This is a TARGETED fix pass — 5 regressions introduced in commit 9173c52 on the Knowledge page. The previous fix correctly merged the duplicate JSON key and added i18n keys/translations, but the page.tsx itself still has bugs. Do every single one. Do not plan. Do not narrate. Do not stop partway. Open files, edit, save, move on. Do NOT ask questions.

---

## BUG 1: Knowledge page document.title — DOUBLE NAMESPACE (HIGH — user-visible)

**What users see:** Browser tab title shows the raw i18n key `knowledge.knowledge.pageTitle` instead of "Knowledge — Recall Touch".

**Console error:** `MISSING_MESSAGE: knowledge.knowledge.pageTitle (en)`

**Root cause:** Line 332 of the knowledge page uses `t("knowledge.pageTitle")`, but `t` is scoped to the `knowledge` namespace via `useTranslations("knowledge")` on line 327. So `t("knowledge.pageTitle")` resolves to `knowledge.knowledge.pageTitle` — a double namespace.

**File: `src/app/app/knowledge/page.tsx` — line 332**

Current code:
```typescript
document.title = t("knowledge.pageTitle");
```

### Fix:
```typescript
document.title = t("pageTitle");
```

That's it. Remove the `knowledge.` prefix since the `t` function already has the `knowledge` namespace.

---

## BUG 2: Missing `common.item` and `common.items` keys (HIGH — user-visible)

**What users see:** The entry count displays `"0 common.items"` — a raw i18n key shown to the user.

**Console error:** `MISSING_MESSAGE: common.items (en)` (and `(es)`, etc.)

**Root cause:** Line 527 uses `tCommon("item")` and `tCommon("items")` but these keys do NOT exist in the `common` namespace of any locale file.

**File: `src/app/app/knowledge/page.tsx` — line 527**

Current code:
```typescript
{entries.length} {entries.length === 1 ? tCommon("item") : tCommon("items")}
```

### Fix — add missing keys to ALL locale files:

**`src/i18n/messages/en.json`** — inside the `"common"` object, add:
```json
"item": "item",
"items": "items"
```

**`src/i18n/messages/es.json`** — inside `"common"`:
```json
"item": "elemento",
"items": "elementos"
```

**`src/i18n/messages/fr.json`** — inside `"common"`:
```json
"item": "élément",
"items": "éléments"
```

**`src/i18n/messages/de.json`** — inside `"common"`:
```json
"item": "Element",
"items": "Elemente"
```

**`src/i18n/messages/pt.json`** — inside `"common"`:
```json
"item": "item",
"items": "itens"
```

**`src/i18n/messages/ja.json`** — inside `"common"`:
```json
"item": "件",
"items": "件"
```

---

## BUG 3: Knowledge type dropdown options — hardcoded labels (MEDIUM — i18n)

**What users see in Spanish:** The type filter dropdown shows "FAQ", "Document", "Website URL", "Custom" in English even when the UI is in Spanish. The "All types" label IS translated (because it uses `t("allTypes")`), but the individual option labels are hardcoded.

**Root cause:** Lines 541-550 use `o.label` from the `TYPE_OPTIONS` constant (which has hardcoded English strings like `{ value: "FAQ", label: "FAQ" }`). Meanwhile, the same type dropdown in the modal (line 178) correctly uses `t(`types.${o.value}`)`.

**File: `src/app/app/knowledge/page.tsx`**

Find the main filter TYPE dropdown (around lines 541-550). It currently looks like:
```tsx
{TYPE_OPTIONS.map((o) => (
  <option key={o.value} value={o.value}>{o.label}</option>
))}
```

### Fix:
```tsx
{TYPE_OPTIONS.map((o) => (
  <option key={o.value} value={o.value}>{t(`types.${o.value}`)}</option>
))}
```

This matches the pattern already used in the modal at line 178.

---

## BUG 4: Knowledge status dropdown options — hardcoded labels (MEDIUM — i18n)

**Same issue as Bug 3** but for the status filter dropdown (around lines 551-560).

Current code uses `o.label` from `STATUS_OPTIONS` constant (hardcoded English: "Active", "Draft", "Processing").

### Fix:
```tsx
{STATUS_OPTIONS.map((o) => (
  <option key={o.value} value={o.value}>{t(`status.${o.value.toLowerCase()}`)}</option>
))}
```

**ALSO** add the missing `"processing"` key to `knowledge.status` in ALL locale files:

**en.json** — inside `knowledge.status`:
```json
"processing": "Processing"
```

**es.json** — inside `knowledge.status`:
```json
"processing": "Procesando"
```

**fr.json** — inside `knowledge.status`:
```json
"processing": "En cours"
```

**de.json** — inside `knowledge.status`:
```json
"processing": "Wird verarbeitet"
```

**pt.json** — inside `knowledge.status`:
```json
"processing": "Processando"
```

**ja.json** — inside `knowledge.status`:
```json
"processing": "処理中"
```

---

## BUG 5: Knowledge empty state — hardcoded strings (MEDIUM — i18n)

**What users see in Spanish:** When there are no knowledge entries, the empty state shows English text "No entries found", "Try adjusting your filters.", "Add your first entry" — even though the rest of the page is in Spanish.

**Root cause:** Lines 765-772 have hardcoded strings instead of using the i18n keys that already exist in all locale files (`noEntries`, `noEntriesHint`, `addFirst`).

**File: `src/app/app/knowledge/page.tsx` — around lines 765-772**

Current code:
```tsx
<p className="text-sm font-medium text-white mb-1">No entries found</p>
<p className="text-xs text-zinc-500 mb-4">Try adjusting your filters.</p>
<button
  type="button"
  onClick={() => openAddModal()}
  className="text-sm font-medium text-white hover:underline"
>
  Add your first entry
</button>
```

### Fix:
```tsx
<p className="text-sm font-medium text-white mb-1">{t("noEntries")}</p>
<p className="text-xs text-zinc-500 mb-4">{t("noEntriesHint")}</p>
<button
  type="button"
  onClick={() => openAddModal()}
  className="text-sm font-medium text-white hover:underline"
>
  {t("addFirst")}
</button>
```

---

## VERIFICATION

After ALL 5 fixes, run these checks:

### Check 1: No double-namespace on pageTitle
```bash
grep -n 'knowledge\.pageTitle' src/app/app/knowledge/page.tsx
```
Expected: Should show `t("pageTitle")` — NOT `t("knowledge.pageTitle")`.

### Check 2: common.items key exists
```bash
grep -n '"items"' src/i18n/messages/en.json | head -5
```
Expected: Should show the `"items": "items"` key inside common.

### Check 3: No hardcoded dropdown labels
```bash
grep -n 'o\.label' src/app/app/knowledge/page.tsx
```
Expected: ZERO results in the main filter dropdowns (only acceptable if used elsewhere).

### Check 4: No hardcoded empty state
```bash
grep -n 'No entries found\|Try adjusting\|Add your first entry' src/app/app/knowledge/page.tsx
```
Expected: ZERO results.

### Check 5: Build succeeds
```bash
npm run build
```
Expected: Build completes with no errors.

### Check 6: Commit and push
```bash
git add -A && git commit -m "fix: knowledge page double-namespace title, missing common.items key, hardcoded dropdown/empty-state strings" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Bug 1 first — open `src/app/app/knowledge/page.tsx`, line 332, remove the `knowledge.` prefix from the pageTitle key. GO.
