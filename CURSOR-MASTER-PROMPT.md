# FINAL CURSOR MASTER PROMPT — COMPLETE PRODUCT HARDENING

> This is the LAST prompt. Fix every item below. Do NOT skip anything.
> After all changes: `npx tsc --noEmit` must produce zero errors. Then commit and push.

---

## TECH CONTEXT

- Next.js App Router, React 19, TypeScript, Tailwind CSS v4, next-intl ^4.8.3
- Supabase (auth + DB + realtime), Vapi (voice AI), Stripe (billing), Twilio (phone)
- Locale files: `src/i18n/messages/{en,es,fr,de,pt,ja}.json`
- next-intl supports BOTH nested objects AND flat dotted keys (e.g., `settings["agent.heading"]` is accessible via `t("agent.heading")`)
- CSS variables: `var(--bg-card)`, `var(--border-default)`, `var(--text-primary)`, `var(--accent-primary)`
- Brand names (Recall Touch, Salesforce, HubSpot) are NEVER translated

---

## PART 1 — FIX CALL DIRECTION PILLS CLIPPING (CRITICAL UI BUG)

**File:** `src/app/app/agents/components/IdentityStepContent.tsx`
**Line:** 338

**Problem:** The "Inbound", "Outbound", "Both" call direction selector buttons show as "In bo un d", "Ou tb ou nd", "Bo th" because text wraps inside the flex-1 buttons.

**Fix:** Add `whitespace-nowrap` to the button className:

```tsx
// Line 338 — BEFORE:
className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-medium transition ${

// AFTER:
className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-medium whitespace-nowrap transition ${
```

Also increase the minimum width or change `text-[11px]` to `text-xs` if the pills still clip after adding `whitespace-nowrap`. Test visually — the three pills must show "Inbound", "Outbound", "Both" on a single line each without any text wrapping.

---

## PART 2 — ADD MISSING `agents.voiceTest` TRANSLATION KEYS

**File affected:** `src/app/app/agents/[id]/voice-test/page.tsx`
**Problem:** 6 translation keys used in code don't exist in any locale file. Users see raw keys.

Add to `agents` namespace in ALL 6 locale files. Since the `agents` namespace already uses flat dotted keys in some locales, you can add these EITHER as nested objects OR as flat dotted keys — be consistent with what's already there.

### en.json — add inside `agents` object:
```json
"voiceTest": {
  "defaultPreviewText": "Hi, thanks for calling! How can I help you today?",
  "errors": {
    "applyFailed": "Failed to apply voice settings. Please try again.",
    "previewFailed": "Failed to preview voice. Please try again."
  },
  "scriptPlaceholder": "Enter text to preview with this voice…",
  "toast": {
    "applied": "Voice settings applied",
    "played": "Voice preview played"
  }
}
```

### es.json:
```json
"voiceTest": {
  "defaultPreviewText": "Hola, gracias por llamar. ¿En qué puedo ayudarte hoy?",
  "errors": {
    "applyFailed": "Error al aplicar la configuración de voz. Inténtalo de nuevo.",
    "previewFailed": "Error al previsualizar la voz. Inténtalo de nuevo."
  },
  "scriptPlaceholder": "Escribe texto para previsualizar con esta voz…",
  "toast": {
    "applied": "Configuración de voz aplicada",
    "played": "Vista previa de voz reproducida"
  }
}
```

### fr.json:
```json
"voiceTest": {
  "defaultPreviewText": "Bonjour, merci d'avoir appelé ! Comment puis-je vous aider ?",
  "errors": {
    "applyFailed": "Échec de l'application des paramètres vocaux. Veuillez réessayer.",
    "previewFailed": "Échec de l'aperçu vocal. Veuillez réessayer."
  },
  "scriptPlaceholder": "Saisissez du texte pour prévisualiser avec cette voix…",
  "toast": {
    "applied": "Paramètres vocaux appliqués",
    "played": "Aperçu vocal lu"
  }
}
```

### de.json:
```json
"voiceTest": {
  "defaultPreviewText": "Hallo, danke für Ihren Anruf! Wie kann ich Ihnen helfen?",
  "errors": {
    "applyFailed": "Spracheinstellungen konnten nicht übernommen werden. Bitte erneut versuchen.",
    "previewFailed": "Sprachvorschau fehlgeschlagen. Bitte erneut versuchen."
  },
  "scriptPlaceholder": "Text eingeben, um mit dieser Stimme vorzuhören…",
  "toast": {
    "applied": "Spracheinstellungen übernommen",
    "played": "Sprachvorschau abgespielt"
  }
}
```

### pt.json:
```json
"voiceTest": {
  "defaultPreviewText": "Olá, obrigado por ligar! Como posso ajudar?",
  "errors": {
    "applyFailed": "Falha ao aplicar configurações de voz. Tente novamente.",
    "previewFailed": "Falha na pré-visualização da voz. Tente novamente."
  },
  "scriptPlaceholder": "Digite texto para pré-visualizar com esta voz…",
  "toast": {
    "applied": "Configurações de voz aplicadas",
    "played": "Pré-visualização de voz reproduzida"
  }
}
```

### ja.json:
```json
"voiceTest": {
  "defaultPreviewText": "お電話ありがとうございます。本日はどのようなご用件でしょうか？",
  "errors": {
    "applyFailed": "音声設定の適用に失敗しました。もう一度お試しください。",
    "previewFailed": "音声プレビューに失敗しました。もう一度お試しください。"
  },
  "scriptPlaceholder": "この音声でプレビューするテキストを入力…",
  "toast": {
    "applied": "音声設定が適用されました",
    "played": "音声プレビューが再生されました"
  }
}
```

---

## PART 3 — FIX `common.error.generic` (MISSING KEY)

**Problem:** `common.error` is a STRING `"Error"` in all locale files. But `src/app/app/call-intelligence/page.tsx` and `src/components/WorkspaceVoiceButton.tsx` call `t("error.generic")` which tries to access `common.error.generic` — this fails because `common.error` is not an object.

**Fix Option A (recommended — least disruptive):** Add a new key `common.errorGeneric` and update the 2 files to use it:

In ALL 6 locale files, add to `common`:
```json
"errorGeneric": "Something went wrong. Please try again."
```

Then update:
- `src/app/app/call-intelligence/page.tsx`: Change `t("error.generic")` to `tCommon("errorGeneric")` or however the common namespace is accessed
- `src/components/WorkspaceVoiceButton.tsx`: Same change

**Translations:**
- es: `"errorGeneric": "Algo salió mal. Inténtalo de nuevo."`
- fr: `"errorGeneric": "Une erreur est survenue. Veuillez réessayer."`
- de: `"errorGeneric": "Etwas ist schiefgelaufen. Bitte erneut versuchen."`
- pt: `"errorGeneric": "Algo deu errado. Tente novamente."`
- ja: `"errorGeneric": "エラーが発生しました。もう一度お試しください。"`

---

## PART 4 — ADD `contacts.form.addTag` (MISSING KEY)

**File affected:** `src/app/app/contacts/page.tsx`

Add to `contacts.form` in ALL 6 locale files:

```json
"addTag": "+ Add tag"
```

Translations:
- es: `"addTag": "+ Agregar etiqueta"`
- fr: `"addTag": "+ Ajouter un tag"`
- de: `"addTag": "+ Tag hinzufügen"`
- pt: `"addTag": "+ Adicionar tag"`
- ja: `"addTag": "+ タグを追加"`

---

## PART 5 — ENSURE ALL JSON.parse CALLS HAVE TRY-CATCH

Check ALL files that use `JSON.parse` on localStorage data. Most were already wrapped by the previous prompt, but verify these specific ones that the scan found still unwrapped:

**`src/app/app/contacts/page.tsx` line 49**: If this `JSON.parse` is NOT inside a try-catch, wrap it:
```tsx
let parsed: Contact[] = [];
try {
  if (raw) parsed = JSON.parse(raw) as Contact[];
} catch {
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch { /* ignore */ }
}
```

Run a grep across all `.tsx` files in `src/app/app/` for `JSON.parse` and confirm every instance is inside a try-catch block. If any are not, wrap them using the pattern above.

---

## PART 6 — VERIFY ALL FUNCTIONALITY FIXES ARE WORKING

The previous prompt instructed several functionality improvements. Verify each exists and works:

### 6A. useDebounce hook
✅ Already exists at `src/hooks/useDebounce.ts`. Verify it's imported and used in:
- `src/app/app/calls/page.tsx` ✅
- `src/app/app/contacts/page.tsx` — CHECK and add if missing
- `src/app/app/leads/page.tsx` — CHECK and add if missing
- `src/app/app/inbox/page.tsx` — CHECK and add if missing

### 6B. useUnsavedChanges hook
✅ Already exists at `src/hooks/useUnsavedChanges.ts`. Verify it's imported and used in settings pages:
- `src/app/app/settings/agent/page.tsx`
- `src/app/app/settings/business/page.tsx`
- `src/app/app/settings/notifications/page.tsx`
- `src/app/app/settings/compliance/page.tsx`

### 6C. safe-storage utility
✅ Already exists at `src/lib/client/safe-storage.ts`. Verify ALL pages that persist to localStorage use `safeSetItem`/`safeGetItem` instead of raw `localStorage.*` calls.

### 6D. env-check
✅ Already exists at `src/lib/env-check.ts`. Verify it's called at startup.

### 6E. ConfirmDialog on destructive actions
Currently used in 8 places. Verify these specific destructive actions have ConfirmDialog:
- Agent deletion ✅
- Campaign deletion — CHECK
- Knowledge entry deletion — CHECK
- Lead deletion — CHECK
- Phone number release — CHECK

If any of these are missing a ConfirmDialog, add one.

---

## PART 7 — ADD useEffect CLEANUP TO REMAINING FETCH CALLS

Search all files in `src/app/app/` for this pattern:
```
useEffect(() => {
  fetch(
```

For each match, check if there's a `let cancelled = false` with `return () => { cancelled = true }` cleanup. If not, add it:

```tsx
useEffect(() => {
  let cancelled = false;
  fetch(...)
    .then((res) => res.json())
    .then((data) => {
      if (cancelled) return;
      // existing state update logic
    })
    .catch((err) => {
      if (cancelled) return;
      // existing error handling
    });
  return () => { cancelled = true; };
}, [deps]);
```

---

## PART 8 — VERIFY AUTH ON SENSITIVE API ROUTES

Check these API routes and add `requireSession` + workspace ownership validation if missing:

```
src/app/api/leads/[id]/messages/route.ts
src/app/api/leads/[id]/closing-call/route.ts
src/app/api/leads/[id]/forensics/route.ts
src/app/api/leads/[id]/next-action/route.ts
src/app/api/leads/[id]/inaction-reason/route.ts
src/app/api/leads/[id]/closer-packet/route.ts
src/app/api/leads/[id]/follow-up/route.ts
src/app/api/calls/[id]/coaching/route.ts
```

For each: if there is NO `requireSession` or `getSession` call at the top, add one:

```tsx
import { requireSession } from "@/lib/auth/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... existing logic
}
```

If `requireSession` doesn't exist, check what auth function the codebase uses (it may be `getSession` or `requireWorkspaceAccess`) and use that instead.

---

## PART 9 — VISUAL POLISH: LOADING SKELETONS FOR DRILL-DOWN PAGES

Add loading skeletons to these pages that currently show blank screens while loading:

### 9A. Call detail page (`src/app/app/calls/[id]/page.tsx`)
When `loading === true`, render:
```tsx
<div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
  <div className="h-4 w-32 bg-zinc-800 rounded" />
  <div className="h-8 w-64 bg-zinc-800 rounded" />
  <div className="grid grid-cols-3 gap-4">
    {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-800 rounded-xl" />)}
  </div>
  <div className="h-40 bg-zinc-800 rounded-xl" />
</div>
```

### 9B. Settings agent page (`src/app/app/settings/agent/page.tsx`)
When loading, show a form-shaped skeleton instead of blank space.

---

## PART 10 — FINAL VALIDATION

After all changes:

1. **`npx tsc --noEmit`** — must produce ZERO errors
2. **Visual check**: Open agents → create new agent → the "Inbound / Outbound / Both" pills must show full text without wrapping
3. **Translation check**: Open voice-test page — no raw translation keys visible
4. **Auth check**: Try accessing `/api/leads/[id]/messages` without auth — should return 401
5. **Console check**: No React warnings about state updates on unmounted components

---

## PART 11 — GIT COMMIT & PUSH

```bash
git add -A
git commit -m "fix: final hardening — UI clipping, missing i18n keys, auth, cleanup

- Fix call direction pill text clipping (add whitespace-nowrap)
- Add agents.voiceTest translations to all 6 locales
- Fix common.error.generic missing key issue
- Add contacts.form.addTag to all 6 locales
- Verify JSON.parse try-catch wrapping on all pages
- Verify useDebounce applied to all search inputs
- Verify ConfirmDialog on all destructive actions
- Add useEffect cleanup to remaining fetch calls
- Add auth to unprotected lead/call API routes
- Add loading skeletons to drill-down pages"
git push origin HEAD
```

---

## SUMMARY

| # | Issue | Severity | Files |
|---|-------|----------|-------|
| 1 | Direction pills clipping | 🔴 CRITICAL (visible UI bug) | IdentityStepContent.tsx |
| 2 | agents.voiceTest missing (6 keys) | 🔴 CRITICAL (raw keys visible) | voice-test/page.tsx + 6 locale files |
| 3 | common.error.generic missing | 🟡 HIGH (error handling broken) | call-intelligence + WorkspaceVoiceButton + 6 locales |
| 4 | contacts.form.addTag missing | 🟡 HIGH (raw key visible) | contacts/page.tsx + 6 locale files |
| 5 | JSON.parse safety verification | 🟡 HIGH | ~12 pages |
| 6 | Functionality fix verification | 🟢 MEDIUM | Various |
| 7 | useEffect cleanup | 🟢 MEDIUM | ~16 pages |
| 8 | API route auth | 🔴 CRITICAL (security) | 8 API routes |
| 9 | Loading skeletons | 🟢 MEDIUM | 2 pages |
