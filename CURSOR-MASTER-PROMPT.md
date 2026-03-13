You are an implementation engineer. ONE tiny fix remaining. Do not plan, do not narrate.

---

## BUG: Missing `knowledge.status.processing` key in en.json (and all locales)

**What users see:** The Knowledge page status dropdown shows the raw i18n key `knowledge.status.processing` instead of "Processing".

**Console error:** `MISSING_MESSAGE: knowledge.status.processing (en)`

**Root cause:** Commit 9ed6636 correctly changed the status dropdown to use `t(`status.${o.value.toLowerCase()}`)`, but only added the `"processing"` key to SOME locale files — it's missing from en.json (and possibly others).

### Fix:

Check ALL 6 locale files. Add `"processing"` to the `knowledge.status` object in any file where it's missing:

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

## VERIFICATION

```bash
grep -A5 '"status"' src/i18n/messages/en.json | grep -c 'processing'
```
Expected: 1

```bash
npm run build
```
Expected: No errors.

```bash
git add -A && git commit -m "fix: add missing knowledge.status.processing key to all locales" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
