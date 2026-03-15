# FINAL CURSOR MASTER PROMPT — POST-AUDIT REMAINING FIXES

> Fix every item below. Do NOT skip anything.
> After all changes: `npx tsc --noEmit` must produce zero errors. Then commit and push.

---

## TECH CONTEXT

- Next.js App Router, React 19, TypeScript, Tailwind CSS v4, next-intl ^4.8.3
- Supabase (auth + DB + realtime), Vapi (voice AI), Stripe (billing), Twilio (phone)
- Locale files: `src/i18n/messages/{en,es,fr,de,pt,ja}.json`
- next-intl supports BOTH nested objects AND flat dotted keys
- CSS variables: `var(--bg-card)`, `var(--border-default)`, `var(--text-primary)`, `var(--accent-primary)`
- Brand names (Recall Touch, Salesforce, HubSpot) are NEVER translated

---

## PART 1 — FIX CALL DIRECTION PILLS CLIPPING (CRITICAL — STILL BROKEN ON LIVE SITE)

**File:** `src/app/app/agents/components/IdentityStepContent.tsx`
**Line:** ~338

**Problem:** The "Entrante", "Saliente", "Ambos" (Spanish) / "Inbound", "Outbound", "Both" (English) call direction pills STILL show as "En tra nt e", "Sa lie nt e", "A m bo s" — each letter on its own line. The `whitespace-nowrap` that was added is NOT enough because `flex-1` (which is `flex: 1 1 0%`) allows the flex items to shrink below their content width.

**Fix:** Replace `flex-1` with a flex config that prevents shrinking below content width:

```tsx
// Line 338 — BEFORE:
className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-medium whitespace-nowrap transition ${

// AFTER — remove flex-1, add flex-1 with min-w-fit:
className={`flex-1 min-w-fit rounded-xl border px-3 py-2 text-[11px] font-medium whitespace-nowrap transition ${
```

**Alternative if `min-w-fit` doesn't work in Tailwind v4:** Replace `flex-1` entirely:
```tsx
className={`shrink-0 grow rounded-xl border px-3 py-2 text-[11px] font-medium whitespace-nowrap text-center transition ${
```

**Test visually:** Switch locale to Spanish. Go to Agents → click an agent → verify "Entrante", "Saliente", "Ambos" show on single lines without ANY text wrapping. Also test English "Inbound", "Outbound", "Both".

---

## PART 2 — REMOVE DUPLICATE voiceTest TRANSLATION KEYS

**Problem:** ALL 6 locale files contain DUPLICATE voiceTest keys:
1. A **nested** `"voiceTest"` key inside the `"agents"` object (dead code — NOT read by any component)
2. A **flat dotted** `"agents.voiceTest"` key at root level (this is what the code actually uses via `useTranslations("agents.voiceTest")`)

**Fix:** In ALL 6 locale files (en.json, es.json, fr.json, de.json, pt.json, ja.json):
- DELETE the nested `"voiceTest": { ... }` block that sits INSIDE the `"agents"` object
- KEEP the flat dotted `"agents.voiceTest": { ... }` key at the root level (this is the one the code reads)

To find the dead code: search for `"voiceTest"` inside the `"agents": { ... }` object. It will be around line 1519 in en.json and similar lines in other locales. Delete that entire nested block.

**Also for fr.json:** Verify it has the nested duplicate — if it only has the flat dotted version, no deletion needed for French.

---

## PART 3 — TRANSLATE 18+ HARDCODED STRINGS IN VOICE-TEST PAGE

**File:** `src/app/app/agents/[id]/voice-test/page.tsx`

This page has ~18 hardcoded English strings. The page uses `useTranslations("agents.voiceTest")`, so add all keys under the flat dotted `"agents.voiceTest"` key in ALL 6 locale files.

### Keys to add to `"agents.voiceTest"` in en.json:
```json
"noAgent": "No agent selected.",
"backToAgents": "Back to Agents",
"pageTitle": "Voice preview & test",
"scriptSection": "Test with your script",
"scriptHelp": "Select a voice below and click Play to hear this script. Or use \"Generate Preview\" after picking a voice.",
"abComparison": "A/B comparison",
"voiceA": "Voice A",
"voiceB": "Voice B",
"playA": "Play A",
"playB": "Play B",
"pickA": "Pick A",
"pickB": "Pick B",
"allVoices": "All voices",
"selected": "Selected",
"select": "Select",
"applyToAgent": "Apply to agent",
"selectVoicePrompt": "Select a voice above to apply."
```

### es.json translations:
```json
"noAgent": "Ningún agente seleccionado.",
"backToAgents": "Volver a Agentes",
"pageTitle": "Vista previa y prueba de voz",
"scriptSection": "Prueba con tu guión",
"scriptHelp": "Selecciona una voz abajo y haz clic en Reproducir para escuchar este guión.",
"abComparison": "Comparación A/B",
"voiceA": "Voz A",
"voiceB": "Voz B",
"playA": "Reproducir A",
"playB": "Reproducir B",
"pickA": "Elegir A",
"pickB": "Elegir B",
"allVoices": "Todas las voces",
"selected": "Seleccionada",
"select": "Seleccionar",
"applyToAgent": "Aplicar al agente",
"selectVoicePrompt": "Selecciona una voz arriba para aplicar."
```

### fr.json translations:
```json
"noAgent": "Aucun agent sélectionné.",
"backToAgents": "Retour aux Agents",
"pageTitle": "Aperçu et test vocal",
"scriptSection": "Testez avec votre script",
"scriptHelp": "Sélectionnez une voix ci-dessous et cliquez sur Écouter pour entendre ce script.",
"abComparison": "Comparaison A/B",
"voiceA": "Voix A",
"voiceB": "Voix B",
"playA": "Écouter A",
"playB": "Écouter B",
"pickA": "Choisir A",
"pickB": "Choisir B",
"allVoices": "Toutes les voix",
"selected": "Sélectionnée",
"select": "Sélectionner",
"applyToAgent": "Appliquer à l'agent",
"selectVoicePrompt": "Sélectionnez une voix ci-dessus pour l'appliquer."
```

### de.json translations:
```json
"noAgent": "Kein Agent ausgewählt.",
"backToAgents": "Zurück zu Agenten",
"pageTitle": "Sprachvorschau & Test",
"scriptSection": "Mit Ihrem Skript testen",
"scriptHelp": "Wählen Sie unten eine Stimme aus und klicken Sie auf Abspielen, um dieses Skript zu hören.",
"abComparison": "A/B-Vergleich",
"voiceA": "Stimme A",
"voiceB": "Stimme B",
"playA": "A abspielen",
"playB": "B abspielen",
"pickA": "A wählen",
"pickB": "B wählen",
"allVoices": "Alle Stimmen",
"selected": "Ausgewählt",
"select": "Auswählen",
"applyToAgent": "Auf Agent anwenden",
"selectVoicePrompt": "Wählen Sie oben eine Stimme zum Anwenden aus."
```

### pt.json translations:
```json
"noAgent": "Nenhum agente selecionado.",
"backToAgents": "Voltar para Agentes",
"pageTitle": "Pré-visualização e teste de voz",
"scriptSection": "Teste com seu script",
"scriptHelp": "Selecione uma voz abaixo e clique em Reproduzir para ouvir este script.",
"abComparison": "Comparação A/B",
"voiceA": "Voz A",
"voiceB": "Voz B",
"playA": "Reproduzir A",
"playB": "Reproduzir B",
"pickA": "Escolher A",
"pickB": "Escolher B",
"allVoices": "Todas as vozes",
"selected": "Selecionada",
"select": "Selecionar",
"applyToAgent": "Aplicar ao agente",
"selectVoicePrompt": "Selecione uma voz acima para aplicar."
```

### ja.json translations:
```json
"noAgent": "エージェントが選択されていません。",
"backToAgents": "エージェントに戻る",
"pageTitle": "音声プレビュー＆テスト",
"scriptSection": "スクリプトでテスト",
"scriptHelp": "下の音声を選択し、再生をクリックしてこのスクリプトを聞いてください。",
"abComparison": "A/B比較",
"voiceA": "音声A",
"voiceB": "音声B",
"playA": "Aを再生",
"playB": "Bを再生",
"pickA": "Aを選択",
"pickB": "Bを選択",
"allVoices": "すべての音声",
"selected": "選択済み",
"select": "選択",
"applyToAgent": "エージェントに適用",
"selectVoicePrompt": "上から音声を選択して適用してください。"
```

**Then update `voice-test/page.tsx`:** Replace every hardcoded string with the corresponding `t("key")` call.

---

## PART 4 — TRANSLATE HARDCODED STRINGS IN CONTACTS PAGE

**File:** `src/app/app/contacts/page.tsx`

These strings are hardcoded in English:
- Line 587: `>Call {contact.phone}</a>` → use `t("callPhone", { phone: contact.phone })`
- Line 594: `>Email</a>` → use `t("email")`
- Line 613: `<h3>Notes</h3>` → use `t("notes")`
- Line 618: `<h3>Call history</h3>` → use `t("callHistory")`

Add to `contacts` namespace in ALL 6 locale files:
```json
"callPhone": "Call {phone}",
"email": "Email",
"notes": "Notes",
"callHistory": "Call history"
```

**es:** `"callPhone": "Llamar a {phone}", "email": "Correo electrónico", "notes": "Notas", "callHistory": "Historial de llamadas"`
**fr:** `"callPhone": "Appeler {phone}", "email": "E-mail", "notes": "Notes", "callHistory": "Historique des appels"`
**de:** `"callPhone": "{phone} anrufen", "email": "E-Mail", "notes": "Notizen", "callHistory": "Anrufverlauf"`
**pt:** `"callPhone": "Ligar para {phone}", "email": "E-mail", "notes": "Notas", "callHistory": "Histórico de chamadas"`
**ja:** `"callPhone": "{phone}に電話", "email": "メール", "notes": "メモ", "callHistory": "通話履歴"`

---

## PART 5 — TRANSLATE HARDCODED "Loading…" STRINGS

Multiple pages have hardcoded "Loading…":

1. `src/app/app/calls/page.tsx` line 714: `<p>Loading…</p>`
2. `src/app/app/messages/page.tsx` line 226: `<div>Loading…</div>`
3. `src/app/app/HydrationGate.tsx` line 26: `<p>Loading…</p>`

**Fix:** Replace with the common namespace loading key. The `common` namespace already has `"loadingEllipsis": "Loading…"`.

For HydrationGate (which renders before translations load), you can keep the hardcoded "Loading…" since it's a pre-hydration fallback — OR use a simple CSS spinner instead of text.

For calls/page.tsx and messages/page.tsx, replace with `tCommon("loadingEllipsis")` or the page's own translation function accessing common.

---

## PART 6 — TRANSLATE REMAINING HARDCODED STRINGS

### 6A. Agents analytics page
**File:** `src/app/app/agents/[id]/analytics/page.tsx` line 182
- `>Call volume by day</p>` → translate using appropriate key

### 6B. Team page
**File:** `src/app/app/team/page.tsx` line 460
- `<label>Email</label>` → translate

### 6C. Call Intelligence page
**File:** `src/app/app/call-intelligence/page.tsx` line 891
- `<option>Call type (optional)</option>` → translate

### 6D. Webhooks page
**File:** `src/app/app/developer/webhooks/page.tsx` line 226
- `"Secret set"` / `"No secret"` → translate

For each: add the keys to the appropriate namespace in ALL 6 locale files with proper translations, then update the component to use `t("key")`.

---

## PART 7 — ADD CONFIRM DIALOG TO KNOWLEDGE ENTRY DELETION

**File:** `src/app/app/settings/agent/page.tsx` line ~302

**Problem:** Knowledge entries can be removed with a single click (`onClick={() => removeKnowledge(idx)}`) with NO confirmation dialog. Every other destructive action (agent deletion, phone release, account deletion, webhook deletion) has a ConfirmDialog.

**Fix:** Add a ConfirmDialog:
```tsx
const [pendingKnowledgeDelete, setPendingKnowledgeDelete] = useState<number | null>(null);

// Replace direct removeKnowledge(idx) with:
onClick={() => setPendingKnowledgeDelete(idx)}

// Add ConfirmDialog:
<ConfirmDialog
  open={pendingKnowledgeDelete !== null}
  onClose={() => setPendingKnowledgeDelete(null)}
  onConfirm={() => {
    if (pendingKnowledgeDelete !== null) removeKnowledge(pendingKnowledgeDelete);
    setPendingKnowledgeDelete(null);
  }}
  title={t("knowledge.deleteConfirmTitle")}
  message={t("knowledge.deleteConfirmMessage")}
  variant="danger"
/>
```

Add translation keys for the confirm dialog to all 6 locale files under the `settings` namespace (or wherever the page uses translations from):
- en: `"deleteConfirmTitle": "Remove knowledge entry?", "deleteConfirmMessage": "This entry will be permanently removed from the agent's knowledge base."`
- es: `"deleteConfirmTitle": "¿Eliminar entrada de conocimiento?", "deleteConfirmMessage": "Esta entrada se eliminará permanentemente de la base de conocimiento del agente."`
- fr: `"deleteConfirmTitle": "Supprimer l'entrée de connaissances ?", "deleteConfirmMessage": "Cette entrée sera définitivement supprimée de la base de connaissances de l'agent."`
- de: `"deleteConfirmTitle": "Wissenseintrag entfernen?", "deleteConfirmMessage": "Dieser Eintrag wird dauerhaft aus der Wissensbasis des Agenten entfernt."`
- pt: `"deleteConfirmTitle": "Remover entrada de conhecimento?", "deleteConfirmMessage": "Esta entrada será permanentemente removida da base de conhecimento do agente."`
- ja: `"deleteConfirmTitle": "ナレッジエントリを削除しますか？", "deleteConfirmMessage": "このエントリはエージェントのナレッジベースから完全に削除されます。"`

---

## PART 8 — FINAL VALIDATION

After all changes:

1. **`npx tsc --noEmit`** — must produce ZERO errors
2. **Visual check**: Switch to Spanish locale → Agents → click agent → verify "Entrante / Saliente / Ambos" pills show full text on single lines
3. **Voice test page**: Navigate to agents/[id]/voice-test → no raw translation keys visible
4. **Contacts page**: Open a contact → "Notes", "Call history", "Email" should be translated
5. **Knowledge deletion**: Try removing a knowledge entry → confirm dialog must appear
6. **Console check**: No React warnings, no missing translation warnings

---

## PART 9 — GIT COMMIT & PUSH

```bash
git add -A
git commit -m "fix: post-audit hardening — direction pills, voice-test i18n, confirm dialogs

- Fix direction pills clipping by adding min-w-fit (flex-1 alone caused zero-width shrink)
- Remove duplicate voiceTest translation keys from all 6 locales
- Translate 18 hardcoded strings in voice-test page
- Translate hardcoded strings in contacts, calls, team, call-intelligence pages
- Add ConfirmDialog to knowledge entry deletion
- Replace hardcoded 'Loading…' with translation keys"
git push origin HEAD
```

---

## SUMMARY

| # | Issue | Severity | Files |
|---|-------|----------|-------|
| 1 | Direction pills STILL clipping | 🔴 CRITICAL | IdentityStepContent.tsx |
| 2 | Duplicate voiceTest keys (dead code) | 🟡 HIGH (confusing) | 6 locale files |
| 3 | 18 hardcoded strings in voice-test | 🔴 CRITICAL | voice-test/page.tsx + 6 locales |
| 4 | 4 hardcoded strings in contacts | 🟡 HIGH | contacts/page.tsx + 6 locales |
| 5 | Hardcoded "Loading…" in 3 files | 🟢 MEDIUM | calls, messages, HydrationGate |
| 6 | 4 more hardcoded strings scattered | 🟡 HIGH | analytics, team, call-intel, webhooks |
| 7 | Knowledge deletion has no confirm | 🟡 HIGH | settings/agent/page.tsx |
