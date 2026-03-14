You are an implementation engineer. This is the ABSOLUTE FINAL cleanup. Everything else is done. One last bug found during live Spanish locale testing. Fix it. Do NOT stop until done.

---

# ABSOLUTE FINAL FIX — recall-touch.com

**Stack:** Next.js App Router, React 19, TypeScript, next-intl ^4.8.3
**Locales:** en, es, fr, de, pt, ja — files at `src/i18n/messages/{locale}.json`
**Rule:** Every user-visible string MUST use `t()`. Add keys to ALL 6 locale files with proper translations.

---

## BUG: Keyboard shortcuts dialog — 8 hardcoded English strings

**File:** `src/app/app/AppShellClient.tsx`
**Lines ~688-696:** The keyboard shortcuts help panel has ALL labels hardcoded in English:

```tsx
{ keys: ["⌘", "K"], label: "Open command palette" },
{ keys: ["⌘", "1"], label: "Go to Dashboard" },
{ keys: ["⌘", "2"], label: "Go to Agents" },
{ keys: ["⌘", "3"], label: "Go to Calls" },
{ keys: ["⌘", "4"], label: "Go to Leads" },
{ keys: ["⌘", "5"], label: "Go to Campaigns" },
{ keys: ["⌘", "6"], label: "Go to Inbox" },
{ keys: ["?"], label: "Show this help" },
```

**What users see (Spanish):** All 8 shortcut descriptions appear in English inside the keyboard shortcuts modal.

**Fix:** The component already has `const t = useTranslations();` on line 121. Replace each hardcoded label with a `t()` call.

Add these keys to the `nav` object (or a new `shortcuts` object) in ALL 6 locale files:

**en.json** (inside `nav` or new `shortcuts` object):
```json
"shortcutCommandPalette": "Open command palette",
"shortcutDashboard": "Go to Dashboard",
"shortcutAgents": "Go to Agents",
"shortcutCalls": "Go to Calls",
"shortcutLeads": "Go to Leads",
"shortcutCampaigns": "Go to Campaigns",
"shortcutInbox": "Go to Inbox",
"shortcutHelp": "Show this help"
```

**es.json:**
```json
"shortcutCommandPalette": "Abrir paleta de comandos",
"shortcutDashboard": "Ir al Panel",
"shortcutAgents": "Ir a Agentes",
"shortcutCalls": "Ir a Llamadas",
"shortcutLeads": "Ir a Prospectos",
"shortcutCampaigns": "Ir a Campañas",
"shortcutInbox": "Ir a Bandeja",
"shortcutHelp": "Mostrar esta ayuda"
```

**fr.json:**
```json
"shortcutCommandPalette": "Ouvrir la palette de commandes",
"shortcutDashboard": "Aller au Tableau de bord",
"shortcutAgents": "Aller aux Agents",
"shortcutCalls": "Aller aux Appels",
"shortcutLeads": "Aller aux Prospects",
"shortcutCampaigns": "Aller aux Campagnes",
"shortcutInbox": "Aller à la Boîte de réception",
"shortcutHelp": "Afficher cette aide"
```

**de.json:**
```json
"shortcutCommandPalette": "Befehlspalette öffnen",
"shortcutDashboard": "Zum Dashboard",
"shortcutAgents": "Zu Agenten",
"shortcutCalls": "Zu Anrufen",
"shortcutLeads": "Zu Interessenten",
"shortcutCampaigns": "Zu Kampagnen",
"shortcutInbox": "Zum Posteingang",
"shortcutHelp": "Hilfe anzeigen"
```

**pt.json:**
```json
"shortcutCommandPalette": "Abrir paleta de comandos",
"shortcutDashboard": "Ir ao Painel",
"shortcutAgents": "Ir a Agentes",
"shortcutCalls": "Ir a Chamadas",
"shortcutLeads": "Ir a Leads",
"shortcutCampaigns": "Ir a Campanhas",
"shortcutInbox": "Ir à Caixa de entrada",
"shortcutHelp": "Mostrar esta ajuda"
```

**ja.json:**
```json
"shortcutCommandPalette": "コマンドパレットを開く",
"shortcutDashboard": "ダッシュボードへ",
"shortcutAgents": "エージェントへ",
"shortcutCalls": "通話へ",
"shortcutLeads": "リードへ",
"shortcutCampaigns": "キャンペーンへ",
"shortcutInbox": "受信トレイへ",
"shortcutHelp": "ヘルプを表示"
```

Replace in code (use the `nav.` or `shortcuts.` prefix depending on where you placed the keys):

```tsx
{ keys: ["⌘", "K"], label: t("nav.shortcutCommandPalette") },
{ keys: ["⌘", "1"], label: t("nav.shortcutDashboard") },
{ keys: ["⌘", "2"], label: t("nav.shortcutAgents") },
{ keys: ["⌘", "3"], label: t("nav.shortcutCalls") },
{ keys: ["⌘", "4"], label: t("nav.shortcutLeads") },
{ keys: ["⌘", "5"], label: t("nav.shortcutCampaigns") },
{ keys: ["⌘", "6"], label: t("nav.shortcutInbox") },
{ keys: ["?"], label: t("nav.shortcutHelp") },
```

---

## ALSO: Clean up dead code constants (optional but recommended)

**File:** `src/app/app/AppShellClient.tsx`
**Lines 48-99:** The constants `_SIDEBAR_GROUPS`, `_MOBILE_TABS`, and `_MOBILE_MORE_LINKS` contain hardcoded English strings but are NEVER rendered — the actual sidebar uses `sidebarGroups`, `mobileTabs`, and `mobileMoreLinks` from `useMemo` hooks (lines 122-180) which all use `t()` properly.

These dead constants can be safely removed to avoid confusion. If they serve as TypeScript type scaffolding, replace them with a proper type definition instead.

---

## VERIFICATION

```bash
# Keyboard shortcuts still hardcoded?
grep -n '"Open command palette"' src/app/app/AppShellClient.tsx
grep -n '"Go to ' src/app/app/AppShellClient.tsx
grep -n '"Show this help"' src/app/app/AppShellClient.tsx

# Build succeeds
npm run build && npx tsc --noEmit
```
Expected: All greps return empty. Build passes.

```bash
git add -A && git commit -m "fix: i18n keyboard shortcuts dialog — last hardcoded strings" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
