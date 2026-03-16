# CURSOR-MASTER-PROMPT — Fix Missing i18n Keys (Billing + Phone Settings)

> Fix every item below. Do NOT skip anything.
> After all changes: `npx tsc --noEmit` must produce zero errors. Then commit and push.

---

## Issue 1: Missing `common.activity` (+ agents, title, url) in 5 locales

**Problem:** `tCommon("activity")` is called in `src/app/app/contacts/page.tsx` line 376, but only `en.json` has this key in the `common` section. All other locales are missing it → `MISSING_MESSAGE: common.activity` console errors.

**Reference in en.json** (inside `"common"` object, around line 154-159):
```json
"activity": "Activity",
"agents": "Agents",
"title": "Title",
"url": "URL"
```

**Fix:** Add these 4 keys right before the closing `}` of the `"common"` object in each locale file, after `"items"`:

### es.json — `"common"` section (after `"items": "elementos"`)
```json
"activity": "Actividad",
"agents": "Agentes",
"title": "Título",
"url": "URL"
```

### fr.json — `"common"` section (after `"items"`)
```json
"activity": "Activité",
"agents": "Agents",
"title": "Titre",
"url": "URL"
```

### de.json — `"common"` section (after `"items"`)
```json
"activity": "Aktivität",
"agents": "Agenten",
"title": "Titel",
"url": "URL"
```

### pt.json — `"common"` section (after `"items"`)
```json
"activity": "Atividade",
"agents": "Agentes",
"title": "Título",
"url": "URL"
```

### ja.json — `"common"` section (after `"items"`)
```json
"activity": "アクティビティ",
"agents": "エージェント",
"title": "タイトル",
"url": "URL"
```

---

## Issue 2: `settings.integrations.breadcrumbSettings` not found in non-en locales

**Problem:** 6 components call `tSettings("integrations.breadcrumbSettings")`:
- `src/app/app/settings/phone/page.tsx:345`
- `src/app/app/settings/phone/marketplace/page.tsx:108`
- `src/app/app/settings/notifications/page.tsx:105`
- `src/app/app/settings/activity/page.tsx:36`
- `src/app/app/settings/integrations/sync-log/page.tsx:71`
- `src/app/app/settings/integrations/mapping/page.tsx:144`

In `en.json`, `settings` has a nested `"integrations"` object containing `"breadcrumbSettings": "Settings"` (line ~3243). This works.

In **es/fr/de/pt/ja**, the `"integrations"` object inside `settings` does NOT contain `breadcrumbSettings`. Instead, there are FLAT dotted keys like `"integrations.breadcrumbSettings": "Ajustes"` at the root level of the `settings` object. Because `next-intl` finds the nested `integrations` object first, it never finds these flat keys.

**Fix for each non-en locale:** Convert all flat `"integrations.xxx"` keys inside the `settings` namespace into a properly nested `"integrations"` object.

### es.json fix:

Find all flat dotted keys inside `"settings"` that start with `"integrations."` (around lines 3126-3155). They look like:
```json
"integrations.defaultsLoaded": "Valores predeterminados cargados.",
"integrations.testSuccess": "Prueba completada. Consulta el resultado abajo.",
"integrations.saveFailed": "No se pudo guardar el mapeo. Inténtalo de nuevo.",
"integrations.saved": "Mapeo guardado.",
"integrations.breadcrumbSettings": "Ajustes",
"integrations.breadcrumbIntegrations": "Integraciones",
...
```

**DELETE** all of these flat keys and **REPLACE** them with a single nested object:

```json
"integrations": {
  "defaultsLoaded": "Valores predeterminados cargados.",
  "testSuccess": "Prueba completada. Consulta el resultado abajo.",
  "saveFailed": "No se pudo guardar el mapeo. Inténtalo de nuevo.",
  "saved": "Mapeo guardado.",
  "breadcrumbSettings": "Ajustes",
  "breadcrumbIntegrations": "Integraciones",
  "mappingTitle": "Mapeo de campos — {name}",
  "mappingBreadcrumb": "Mapeo de {name}",
  "mappingDescription": "Mapea los campos de contacto/lead de Recall Touch a los campos de {name}. Usa transformaciones para formato de teléfono o valores de estado.",
  "recallTouch": "Recall Touch",
  "crmField": "Campo CRM ({name})",
  "transform": "Transformar",
  "addMapping": "Añadir mapeo",
  "loadDefaults": "Cargar predeterminados",
  "backToIntegrations": "← Volver a Integraciones",
  "title": "Integraciones",
  "syncLogTitle": "Log de sincronización — {name}",
  "syncLogBreadcrumb": "Log de sincronización",
  "syncLogDescription": "Historial de eventos de sincronización entre Recall Touch y {name}.",
  "syncLogEmpty": "Sin eventos de sincronización.",
  "colTimestamp": "Fecha",
  "colDirection": "Dirección",
  "colEntity": "Entidad",
  "colStatus": "Estado",
  "colDetails": "Detalles",
  "dirInbound": "Entrante",
  "dirOutbound": "Saliente",
  "noIntegrations": "Aún no hay integraciones conectadas.",
  "connectFirst": "Conecta tu primer CRM o calendario."
},
```

**IMPORTANT:** If there is ALREADY a nested `"integrations"` object inside `settings` (not under `settings.links`), MERGE into it. Do NOT create a duplicate key. The one under `settings.links.integrations` (with `label` and `desc`) is DIFFERENT and should be left alone.

### Repeat the same pattern for fr.json, de.json, pt.json, ja.json

Each has the same problem: flat dotted `"integrations.xxx"` keys that need to become a nested `"integrations"` object inside `settings`. Use the same approach: find all flat `"integrations.*"` keys, extract the part after the dot as the nested key, collect them into one object, delete the flat keys.

---

## Verification

```bash
npm run build
```

Then check in browser:
1. Go to `/app/settings/phone` — breadcrumb should show "Ajustes" (not raw key `settings.integrations.breadcrumbSettings`)
2. Go to `/app/contacts` — click a contact — console should NOT show `MISSING_MESSAGE: common.activity`
3. Switch to each locale (es, fr, de, pt, ja) and verify the same pages
