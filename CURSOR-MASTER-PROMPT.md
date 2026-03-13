You are an implementation engineer. This is a COMPREHENSIVE fix pass — 8 bugs ranked by severity. Do every single one. Do not plan. Do not narrate. Do not stop partway. Open files, edit, save, move on. If you finish one bug, immediately start the next. Do NOT ask questions.

---

## BUG 1: Dashboard stat cards show RAW i18n keys to users (CRITICAL — USER-VISIBLE)

**What users see on /app/activity right now:**
The four stat cards literally display `DASHBOARD.STATS.CALLS`, `DASHBOARD.STATS.ANSWERRATE`, `DASHBOARD.STATS.LEADS`, `DASHBOARD.STATS.ESTIMATEDREVENUE` as their labels. These are raw i18n key fallbacks. Console floods with 20+ `MISSING_MESSAGE` errors per page load.

**Root cause:** `src/app/app/activity/page.tsx` uses `t("dashboard.stats.calls")` etc., but the key path `dashboard.stats` does NOT exist in en.json. The actual keys live under `dashboard.kpis`.

**File: `src/app/app/activity/page.tsx`**

The page uses `const t = useTranslations();` (root namespace) at line 225.

### Fix — change these 4 lines:

Line 703 — change:
```ts
label={t("dashboard.stats.calls")}
```
to:
```ts
label={t("dashboard.kpis.callsHandled")}
```

Line 710 — change:
```ts
label={t("dashboard.stats.answerRate")}
```
to:
```ts
label={t("dashboard.kpis.answerRate")}
```

Line 716 — change:
```ts
label={t("dashboard.stats.leads")}
```
to:
```ts
label={t("dashboard.kpis.leadsCreated")}
```

Line 722 — change:
```ts
label={t("dashboard.stats.estimatedRevenue")}
```
to:
```ts
label={t("dashboard.kpis.revenueProtected")}
```

**Verification:** The en.json `dashboard.kpis` object contains exactly these keys:
- `"callsHandled": "Calls handled"`
- `"answerRate": "Answer rate"`
- `"leadsCreated": "Leads created"`
- `"appointmentsBooked": "Appointments booked"`
- `"revenueProtected": "Revenue protected"`

After this fix, the stat cards will display "Calls handled", "Answer rate", "Leads created", "Revenue protected" — real English labels, zero console errors.

---

## BUG 2: Leads page missing 8 translation keys — errors and toast (HIGH)

**What happens:** When a user tries to add a lead with missing name/phone, or when CSV import fails, the error messages show raw i18n keys instead of actual error text. The `leads.errors` and `leads.toast.added` keys do not exist in en.json.

**Root cause:** `src/app/app/leads/page.tsx` references keys that were never added to en.json.

**File: `src/app/app/leads/page.tsx` — references these missing keys:**
- Line 227: `t("leads.errors.loadFailed")`
- Line 417: `t("leads.errors.nameRequired")`
- Line 418: `t("leads.errors.phoneRequired")`
- Line 422: `t("leads.errors.workspaceMissing")`
- Line 448: `t("leads.errors.addFailed")`
- Line 467: `t("leads.errors.addFailed")`
- Line 465: `t("leads.toast.added")`
- Line 1023: `t("leads.errors.csvNoValidRows")`

### Fix 2A: Add to en.json

In `src/i18n/messages/en.json`, find the `"leads"` object. Add these two new sub-objects inside it (after the existing `"toast"` object):

Add `"added"` to the existing `leads.toast` object:
```json
"toast": {
  "callStarted": "Call started. Check Calls for status.",
  "callFailed": "Could not start call.",
  "exportFailed": "Export failed. Try again.",
  "exportSuccess": "Leads exported. Check your downloads.",
  "importFailed": "Import failed.",
  "importSuccess": "{count} leads imported.",
  "added": "Lead added successfully."
}
```

Add the entirely new `leads.errors` object:
```json
"errors": {
  "loadFailed": "Failed to load leads.",
  "nameRequired": "Name is required.",
  "phoneRequired": "Phone number is required.",
  "workspaceMissing": "No workspace selected.",
  "addFailed": "Failed to add lead.",
  "csvNoValidRows": "No valid rows found in CSV."
}
```

### Fix 2B: Add to ALL 5 non-English locale files

Add `leads.toast.added` and the entire `leads.errors` block to each locale file:

**`src/i18n/messages/es.json`:**
```json
"added": "Lead agregado exitosamente."
```
```json
"errors": {
  "loadFailed": "Error al cargar leads.",
  "nameRequired": "El nombre es obligatorio.",
  "phoneRequired": "El teléfono es obligatorio.",
  "workspaceMissing": "No hay espacio de trabajo seleccionado.",
  "addFailed": "Error al agregar lead.",
  "csvNoValidRows": "No se encontraron filas válidas en el CSV."
}
```

**`src/i18n/messages/fr.json`:**
```json
"added": "Lead ajouté avec succès."
```
```json
"errors": {
  "loadFailed": "Échec du chargement des leads.",
  "nameRequired": "Le nom est requis.",
  "phoneRequired": "Le numéro de téléphone est requis.",
  "workspaceMissing": "Aucun espace de travail sélectionné.",
  "addFailed": "Échec de l'ajout du lead.",
  "csvNoValidRows": "Aucune ligne valide trouvée dans le CSV."
}
```

**`src/i18n/messages/de.json`:**
```json
"added": "Lead erfolgreich hinzugefügt."
```
```json
"errors": {
  "loadFailed": "Leads konnten nicht geladen werden.",
  "nameRequired": "Name ist erforderlich.",
  "phoneRequired": "Telefonnummer ist erforderlich.",
  "workspaceMissing": "Kein Arbeitsbereich ausgewählt.",
  "addFailed": "Lead konnte nicht hinzugefügt werden.",
  "csvNoValidRows": "Keine gültigen Zeilen in der CSV gefunden."
}
```

**`src/i18n/messages/pt.json`:**
```json
"added": "Lead adicionado com sucesso."
```
```json
"errors": {
  "loadFailed": "Falha ao carregar leads.",
  "nameRequired": "O nome é obrigatório.",
  "phoneRequired": "O telefone é obrigatório.",
  "workspaceMissing": "Nenhum espaço de trabalho selecionado.",
  "addFailed": "Falha ao adicionar lead.",
  "csvNoValidRows": "Nenhuma linha válida encontrada no CSV."
}
```

**`src/i18n/messages/ja.json`:**
```json
"added": "リードが正常に追加されました。"
```
```json
"errors": {
  "loadFailed": "リードの読み込みに失敗しました。",
  "nameRequired": "名前は必須です。",
  "phoneRequired": "電話番号は必須です。",
  "workspaceMissing": "ワークスペースが選択されていません。",
  "addFailed": "リードの追加に失敗しました。",
  "csvNoValidRows": "CSVに有効な行が見つかりません。"
}
```

---

## BUG 3: Docs page title shows "Docs — Recall Touch — Recall Touch" (MEDIUM — USER-VISIBLE)

**What users see:** The browser tab for /docs shows the site name twice: "Docs — Recall Touch — Recall Touch".

**Root cause:** `src/app/docs/page.tsx` sets `title: "Docs — Recall Touch"` but the root layout at `src/app/layout.tsx` has a title template `"%s — Recall Touch"`. Next.js applies the template to the page title, producing `"Docs — Recall Touch — Recall Touch"`.

**File: `src/app/docs/page.tsx` — line 5**

### Fix:

Change:
```ts
title: "Docs — Recall Touch",
```
to:
```ts
title: "Docs",
```

The root layout template will automatically append " — Recall Touch", producing the correct "Docs — Recall Touch".

**IMPORTANT:** Check ALL other page.tsx files in public routes for the same pattern. Any page that sets `title: "Something — Recall Touch"` will get double-suffixed. The correct pattern is `title: "Something"` and let the template handle the suffix. Verify these files:
- `src/app/docs/page.tsx`
- `src/app/product/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/demo/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/activate/page.tsx`
- `src/app/sign-in/page.tsx`
- `src/app/industries/dental/page.tsx`

For each one: if the title already includes " — Recall Touch", remove that suffix and let the template handle it. If the title is just a plain name like "Pricing", leave it alone.

---

## BUG 4: Missing eslint-disable for console.error in ElevenLabs webhook (MEDIUM)

**File: `src/app/api/webhooks/elevenlabs/route.ts` — line 67**

### Fix:

Add the eslint-disable comment above line 67:
```ts
// eslint-disable-next-line no-console
console.error("ElevenLabs webhook error:", error);
```

---

## BUG 5: Phone provision route swallows Twilio errors silently (MEDIUM)

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

## BUG 6: Footer "About" link text points to /contact (LOW — CONFUSING UX)

**File: `src/components/sections/Footer.tsx` — line 51**

The link text says "About" but the href is "/contact". This confuses users who expect an About page.

### Fix — choose ONE:

**Option A (recommended):** Change the link text to match the destination:
```tsx
<Link href="/contact" className="block hover:opacity-80 transition-opacity">Contact</Link>
```
Then remove the duplicate "Contact" link if one exists above it in the footer.

**Option B:** Create an actual `/about` page. If the business wants an About page, create `src/app/about/page.tsx` with company info and update the href to "/about".

---

## BUG 7: Onboarding page has 50+ hardcoded English strings (MEDIUM — i18n)

**File: `src/app/onboarding/page.tsx`**

This is the ONLY app page with hardcoded English strings instead of i18n translations. Every other page correctly uses `useTranslations()`. The onboarding page has 50+ hardcoded strings like button labels, step titles, instructions, error messages, and placeholder text.

### Fix:

1. Add an `"onboarding"` section to `src/i18n/messages/en.json` with all needed keys:
```json
"onboarding": {
  "pageTitle": "Get started — Recall Touch",
  "steps": {
    "identity": {
      "title": "Your business",
      "nameLabel": "Business name",
      "namePlaceholder": "e.g. Acme Dental",
      "industryLabel": "Industry",
      "phoneLabel": "Your phone number"
    },
    "agent": {
      "title": "Configure your agent",
      "templateLabel": "Start from a template",
      "toneLabel": "Tone",
      "directionLabel": "Call direction"
    },
    "knowledge": {
      "title": "Business knowledge",
      "description": "Upload documents or paste text your agent should know",
      "uploadLabel": "Upload files",
      "pasteLabel": "Or paste text"
    },
    "phone": {
      "title": "Connect a phone number",
      "description": "Forward your existing number or get a new one",
      "forwardLabel": "Forward existing number",
      "newLabel": "Get a new number"
    },
    "test": {
      "title": "Test your agent",
      "description": "Make a test call to hear your agent in action",
      "callButton": "Make test call",
      "skipButton": "Skip for now"
    }
  },
  "buttons": {
    "next": "Continue",
    "back": "Back",
    "finish": "Finish setup",
    "skip": "Skip"
  }
}
```

2. Replace every hardcoded string in the onboarding page with the corresponding `t("onboarding....")` call.
3. Add translated versions to all 5 non-English locale files.

**NOTE:** This is a large task. If time-constrained, at minimum extract the user-facing strings (button labels, titles, descriptions) and leave internal error messages for a follow-up.

---

## BUG 8: Billing webhook silent catch blocks (LOW — DEBUGGING)

**File: `src/app/api/billing/webhook/route.ts`**

Lines 320, 362, 453, 495 have `.catch(() => {})` — completely silent catch blocks that swallow errors during fire-and-forget operations.

### Fix:

Replace each `.catch(() => {})` with:
```ts
.catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Billing webhook background task failed:", err);
})
```

---

## VERIFICATION

After ALL fixes, run these checks in order:

### Check 1: No more raw i18n keys in dashboard
```bash
grep -n 'dashboard\.stats\.' src/app/app/activity/page.tsx
```
Expected: ZERO results.

### Check 2: Leads error keys exist
```bash
node -e "const j=require('./src/i18n/messages/en.json'); console.log(JSON.stringify(j.leads.errors, null, 2)); console.log(j.leads.toast.added);"
```
Expected: All 6 error keys + "added" toast key printed.

### Check 3: No double-suffixed page titles
```bash
grep -rn '".*— Recall Touch"' src/app/*/page.tsx src/app/*/*/page.tsx --include="*.tsx" | grep -v node_modules
```
Review output: NO page title should contain " — Recall Touch" — the template handles it.

### Check 4: TypeScript compiles
```bash
npx tsc --noEmit
```
Expected: ZERO errors.

### Check 5: Build succeeds
```bash
npm run build
```
Expected: Build completes with no errors.

### Check 6: Commit and push
```bash
git add -A && git commit -m "fix: dashboard stats i18n keys, leads errors, docs title, lint cleanup, onboarding i18n" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Bug 1 first — open `src/app/app/activity/page.tsx` line 703. GO.
