# FINAL COMPREHENSIVE FIX — Missing Locale Keys + Live Bugs

This prompt fixes ALL remaining issues found during a full live-site + codebase audit. After this, the product is launch-ready.

---

## GLOBAL RULES

**Stack**: Next.js App Router · React 19 · TypeScript · next-intl ^4.8.3 · Tailwind CSS v4
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
**Pattern**: `useTranslations("namespace")` → `t("key")` = `namespace.key` in JSON
**Critical rule**: en.json is the source of truth. Every key in en.json MUST exist in ALL 5 other locale files with a proper native translation. No English placeholders.

---

## PART 1 — SYNC ALL LOCALE FILES TO MATCH en.json (CRITICAL)

There are significant gaps in translation files. These cause raw keys or fallback English to appear for non-English users.

### Missing key counts:
| Language | Missing Keys | Key Namespaces |
|----------|-------------|----------------|
| fr | 229 | agents, analytics, commandPalette, contacts, leads, notifications, phone, pricing, proofDrawer, settings |
| de | 343 | activate, agents, analytics, commandPalette, contactPage, contacts, hero, leads, notifications, phone, pricing, proofDrawer, settings |
| pt | 343 | activate, agents, analytics, commandPalette, contactPage, contacts, hero, leads, notifications, phone, pricing, proofDrawer, settings |
| ja | 352 | activate, agents, analytics, commandPalette, contactPage, contacts, hero, leads, notifications, phone, pricing, proofDrawer, settings |

### How to fix:
1. Load `en.json` as the source of truth
2. For each of `fr.json`, `de.json`, `pt.json`, `ja.json`:
   - Recursively compare against en.json
   - For every key that exists in en.json but NOT in the target locale file, add it with a proper native translation
   - Do NOT delete extra keys — leave them (they may be used by locale-specific content)
3. For `es.json`: it has 15 extra keys — leave them. Check if it's missing any en.json keys and add those too.

### The missing namespaces and what they contain:

**`analytics` (63 keys)** — Full analytics page: headings, day names (Mon-Sun), chart labels, metrics labels, AI insights, sentiment analysis, call volume descriptions, export labels.

**`agents` (51-63 keys)** — Agent behavior panel: handoff triggers, objection handling, identity templates (appointment_setter, follow_up, review_request, emergency, support, receptionist greetings), delete/save aria labels, knowledge panel titles.

**`phone` (47 keys)** — Phone settings: forwarding instructions per platform (iPhone, Android, business line), test call flow, number provisioning, carrier instructions, call forwarding status messages.

**`activate` (35 keys, missing from de/pt/ja)** — Activation wizard: business type options (Healthcare, Legal, Contractors, Home Services, Insurance, B2B Sales), step labels, AI ready message, placeholder text, account creation flow.

**`hero` (64 keys, missing from de/pt/ja)** — Hero section simulator: 3 demo call scripts with line-by-line dialogue, detail cards (contact name, phone, address, issue, appointment, confirmation), card labels.

**`commandPalette` (19 keys)** — Command palette: page names, action labels ("Test agent"), close label, no matches text, section headers.

**`notifications` (15 keys)** — Notification center: time labels (just now, Xm ago, Xh ago, Xd ago, yesterday), notification types (appointment_booked, billing_event, missed_call, new_lead, system), empty state, loading.

**`proofDrawer` (15 keys)** — Proof drawer panel: outcome labels (customer returned, decision progressed), next touch labels, loading/empty states, close aria.

**`contactPage` (12 keys, missing from de/pt/ja)** — Contact form: field labels (Name, Email, Company, Message), subject options (General, Sales, Partnership, Billing), sending state, validation message, success/error toasts.

**`contacts` (8 keys)** — Contact list: filter aria, inbound/outbound labels, last contact time labels (today, yesterday, X days ago, unknown), manual add note.

**`leads` (5 keys)** — Lead time labels: today, 1 day ago, X days ago, 1 week ago, X weeks ago.

**`pricing` (3 keys)** — ROI calculator description, trusted-by text, questions CTA.

**`settings` (3 keys)** — Notification channel/event labels, activity actions.

### Implementation approach:
For EACH missing key, look up the English value in en.json, then write the proper translation:
- **fr**: French
- **de**: German
- **pt**: Brazilian Portuguese
- **ja**: Japanese

Do NOT use machine-translated placeholders. Use natural, professional translations appropriate for a business SaaS product.

---

## PART 2 — FIX ANALYTICS PAGE RAW TRANSLATION KEY

**Live bug**: The analytics page shows `"analytics.heading"` as raw text in the main heading.

### Check: `src/app/app/analytics/page.tsx`
Verify the component uses `useTranslations("analytics")` and calls `t("heading")`. If the code is correct, the issue is that the `analytics` namespace keys are missing from locale files (covered in Part 1). But double-check the code imports are correct.

---

## PART 3 — PRICING PAGE FEATURE LISTS

**Live bug**: /pricing page shows Spanish nav/buttons but English feature list text like "400 inbound min included", "50 outbound calls", "100 SMS", "Appointment booking", etc.

### Check: `src/app/pricing/` and `src/components/PricingContent.tsx`
Verify that ALL pricing plan feature list items use `t()` calls and that the keys exist in all locale files. The plan feature strings like:
- "400 inbound min included"
- "50 outbound calls"
- "100 SMS"
- "Appointment booking"
- "Follow-up sequences"
- "Analytics"
- "Custom integrations"
- "Dedicated success partner"
- etc.

Must ALL be wrapped in `t()` with keys in all 6 locale files.

---

## PART 4 — REMOVE UNUSED FUNCTIONS (ESLint warnings)

**File**: `src/app/app/agents/AgentsPageClient.tsx`

Two functions are defined but never used (causing ESLint warnings):
1. `getDefaultFaqSeed` (line ~267) — either wire it up where it should be used, or remove it
2. `getFaqCategoryTabs` (line ~1772) — either wire it up where it should be used, or remove it

Check the component to see if these functions SHOULD be used somewhere (e.g., in the FAQ section of the agent editor). If they should be used, add the calls. If they're truly dead code, remove them.

---

## PART 5 — HARDCODED ERROR/TOAST MESSAGES

**File**: `src/app/app/settings/business/page.tsx`
Line ~123: `toast.error(e instanceof Error ? e.message : "Could not delete workspace.");`

Replace the hardcoded fallback with `t("deleteWorkspaceError")` and add the key to the `settings` namespace in all 6 locale files.

Search the entire `src/` directory for other hardcoded toast messages:
```bash
grep -rn 'toast\.\(error\|success\|warning\|info\)(' src/ --include='*.tsx' --include='*.ts' | grep '"[A-Z]'
```

For each one found, replace the hardcoded string with a `t()` call and add the key to the appropriate namespace.

---

## VERIFICATION

```bash
# 1. All locale files should match en.json structure
python3 -c "
import json
def get_keys(obj, prefix=''):
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full = f'{prefix}.{k}' if prefix else k
            keys.add(full)
            keys.update(get_keys(v, full))
    return keys

en = json.load(open('src/i18n/messages/en.json'))
en_keys = get_keys(en)
for lang in ['es','fr','de','pt','ja']:
    data = json.load(open(f'src/i18n/messages/{lang}.json'))
    lang_keys = get_keys(data)
    missing = en_keys - lang_keys
    print(f'{lang}: {\"MISSING \" + str(len(missing)) + \" keys\" if missing else \"COMPLETE\"} ({len(lang_keys)} total)')
"

# 2. No ESLint warnings
npx eslint src/app/app/agents/AgentsPageClient.tsx --quiet 2>&1 | head -10

# 3. TypeScript clean
npx tsc --noEmit

# 4. Build
npm run build

# 5. Commit and push
git add -A && git commit -m "fix: sync all locale files to en.json, fix analytics raw key, pricing features, remove dead code" && git push origin main
git log --oneline -3
```

Paste ONLY the verification output.
