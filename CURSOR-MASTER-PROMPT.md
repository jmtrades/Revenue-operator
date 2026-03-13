You are an implementation engineer. This is a TARGETED fix pass — 2 console-error bugs + 2 minor code-quality fixes. Do every single one. Do not plan. Do not narrate. Do not stop partway. Open files, edit, save, move on.

---

## BUG 1: `MISSING_MESSAGE: forms.saving` — fires 42+ times per session (CRITICAL)

**Root cause:** `AgentDetail.tsx` uses `useTranslations("forms")` but the keys live under `forms.state.*` in en.json. So `tForms("saving")` resolves to `forms.saving` which doesn't exist — the real key is `forms.state.saving`.

**File: `src/app/app/agents/components/AgentDetail.tsx`**

Every other file in the codebase correctly uses `useTranslations("forms.state")` for these keys. AgentDetail is the ONLY file that uses the wrong namespace.

### Fix:

Line 104 — change:
```ts
const tForms = useTranslations("forms");
```
to:
```ts
const tForms = useTranslations("forms.state");
```

The `tForms("saving")` calls at lines 321 and 334 will then correctly resolve to `forms.state.saving` = "Saving…".

There are NO `tForms("validation.` calls in this file — already verified. Only `tForms("saving")` x2.

---

## BUG 2: Missing `forms.state.uploading` key in en.json (MEDIUM)

**File: `src/app/app/knowledge/page.tsx` — line 233**

This file correctly uses `useTranslations("forms.state")` at line 89, but calls `tForms("uploading")` at line 233 — and the key `uploading` doesn't exist in `forms.state` in any locale file.

### Fix 2A: Add to en.json

In `src/i18n/messages/en.json`, find the `forms.state` object (around line 804) and add after the `"importing"` line:
```json
"uploading": "Uploading…"
```

The full `forms.state` object should become:
```json
"state": {
  "saving": "Saving…",
  "deleting": "Deleting…",
  "submitting": "Submitting…",
  "loading": "Loading…",
  "creating": "Creating…",
  "importing": "Importing…",
  "uploading": "Uploading…"
}
```

### Fix 2B: Add to ALL 5 locale files

Add `"uploading"` to `forms.state` in each file (the `forms.state` block is around line 713 in each):

| File | Value |
|------|-------|
| `src/i18n/messages/es.json` | `"uploading": "Subiendo…"` |
| `src/i18n/messages/fr.json` | `"uploading": "Téléversement…"` |
| `src/i18n/messages/de.json` | `"uploading": "Hochladen…"` |
| `src/i18n/messages/pt.json` | `"uploading": "Enviando…"` |
| `src/i18n/messages/ja.json` | `"uploading": "アップロード中…"` |

---

## FIX 3: Missing eslint-disable for console.error in ElevenLabs webhook (MINOR)

**File: `src/app/api/webhooks/elevenlabs/route.ts` — line 67**

The `console.error` call has no eslint-disable comment, which causes lint warnings.

### Fix:

Add the eslint disable comment above line 67:
```ts
// eslint-disable-next-line no-console
console.error("ElevenLabs webhook error:", error);
```

---

## FIX 4: Generic error in phone provision route — add error details (MINOR)

**File: `src/app/api/phone/provision/route.ts` — lines 84-87**

Current code:
```ts
} catch (e) {
  // Twilio purchase failed; error response below
  return NextResponse.json({ error: "Provisioning failed. Try again later." }, { status: 500 });
}
```

### Fix:

Log the actual error for debugging (server-side only — never expose to client):
```ts
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("Twilio provisioning failed:", e);
  return NextResponse.json({ error: "Provisioning failed. Try again later." }, { status: 500 });
}
```

---

## VERIFICATION

After all fixes, run:
```bash
grep -rn 'useTranslations("forms")' src/ --include="*.tsx" --include="*.ts" | grep -v 'forms\.\|node_modules'
```

This should return ZERO results. Every `useTranslations("forms` call must include a sub-namespace like `"forms.state"` or `"forms.validation"`.

Then:
```bash
npx tsc --noEmit && npm run build
```

Fix ALL failures. Then:
```bash
git add -A && git commit -m "fix: forms.saving i18n namespace, add uploading key, lint cleanup" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Bug 1 first — open AgentDetail.tsx line 104. GO.
