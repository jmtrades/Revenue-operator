# CURSOR MASTER PROMPT — FUNCTIONALITY, RELIABILITY & COMPETITIVE EDGE

> **Goal**: Make Recall Touch bulletproof. Every page must work perfectly under all conditions.
> No crashes, no silent failures, no blank screens, no missing feedback. Users must feel
> the product is polished, reliable, and premium — better than Bland.ai, Synthflow, Retell, Air.ai.

## TECH CONTEXT

- Next.js App Router, React 19, TypeScript, Tailwind CSS v4
- Supabase (auth + DB + realtime), Vapi (voice AI), Stripe (billing), Twilio (phone)
- CSS variables: `var(--bg-card)`, `var(--border-default)`, `var(--text-primary)`, `var(--accent-primary)`
- 456 API routes, product app under `src/app/app/`

---

## PART 1 — CRITICAL: WRAP ALL JSON.parse IN TRY-CATCH

**Problem**: 12 pages use `JSON.parse()` on localStorage data without try-catch. If localStorage gets corrupted (browser crash, storage quota exceeded, manual tampering), the entire page crashes with a white screen.

Fix ALL of these — wrap each `JSON.parse` in try-catch and return fallback data on failure:

```
src/app/app/calls/[id]/page.tsx:206    — JSON.parse(raw) as CallDetail
src/app/app/calls/page.tsx:82          — JSON.parse(raw) as CallRecord[]
src/app/app/settings/agent/page.tsx:30 — JSON.parse(raw) as AgentConfig
src/app/app/settings/phone/page.tsx:67 — JSON.parse(raw) as PhoneSettingsSnapshot
src/app/app/inbox/page.tsx:53          — JSON.parse(raw) as InboxThread[]
src/app/app/activity/page.tsx:162      — JSON.parse(raw) as ActivityCard[]
src/app/app/leads/page.tsx:159         — JSON.parse(raw) as LeadView[]
src/app/app/contacts/page.tsx:47       — JSON.parse(raw) as Contact[]
src/app/app/knowledge/page.tsx:346     — JSON.parse(raw) as { summary?: string }
src/app/app/campaigns/page.tsx:79      — JSON.parse(raw) as CampaignRow[]
src/app/app/OnboardingChecklist.tsx:24  — JSON.parse(raw) as string[]
src/app/app/analytics/page.tsx:61      — JSON.parse(raw) as T[]
```

**Pattern to apply everywhere:**
```tsx
// BEFORE:
const parsed = raw ? (JSON.parse(raw) as SomeType[]) : [];

// AFTER:
let parsed: SomeType[] = [];
try {
  parsed = raw ? (JSON.parse(raw) as SomeType[]) : [];
} catch {
  // Corrupted localStorage — clear it and use fresh data
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch { /* ignore */ }
}
```

For `contacts/page.tsx:47` which doesn't check for `raw` first:
```tsx
// BEFORE:
const parsed = JSON.parse(raw) as Contact[];

// AFTER:
let parsed: Contact[] = [];
try {
  if (raw) parsed = JSON.parse(raw) as Contact[];
} catch {
  try { localStorage.removeItem(CONTACTS_SNAPSHOT_KEY); } catch { /* ignore */ }
}
```

---

## PART 2 — CRITICAL: ADD AUTH TO UNPROTECTED LEAD API ROUTES

**Problem**: These API routes expose lead data WITHOUT any authentication. Anyone with a lead UUID can read private conversation history, call recordings, and business intelligence:

```
src/app/api/leads/[id]/messages/route.ts     — Returns all conversation messages for a lead
src/app/api/leads/[id]/closing-call/route.ts — Returns call transcripts, consent data, analysis
src/app/api/leads/[id]/forensics/route.ts    — Returns forensic data about lead interactions
src/app/api/leads/[id]/next-action/route.ts  — Returns recommended actions
src/app/api/leads/[id]/inaction-reason/route.ts — Returns why lead is stalled
src/app/api/leads/[id]/closer-packet/route.ts  — Returns full closer packet with all lead intel
src/app/api/leads/[id]/follow-up/route.ts    — Returns follow-up recommendations
src/app/api/calls/[id]/coaching/route.ts     — Returns coaching data for calls
```

**Fix**: Add `requireSession` + workspace ownership validation to each:

```tsx
import { requireSession } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  // Verify workspace ownership
  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const accessErr = await requireWorkspaceAccess(req, (lead as { workspace_id: string }).workspace_id);
  if (accessErr) return accessErr;

  // ... rest of the existing logic
}
```

Apply this pattern to ALL 8 routes listed above. For the calls coaching route, check `call_sessions.workspace_id` instead of `leads.workspace_id`.

---

## PART 3 — CRITICAL: FIX NULL SAFETY IN API RESPONSE HANDLING

**Problem**: Multiple pages fetch API data and access properties without null checks, causing crashes when the API returns unexpected shapes.

### 3A. calls/page.tsx — Fix response handling
```tsx
// AROUND LINE 139-145 — BEFORE:
.then((data) => {
  const next = data.calls ?? [];  // crashes if data is null
  setRecords(next);
  persistCallsSnapshot(workspaceId, next);
})

// AFTER:
.then((data) => {
  const next = Array.isArray(data?.calls) ? data.calls : [];
  setRecords(next);
  if (next.length > 0) persistCallsSnapshot(workspaceId, next);
})
.catch((err) => {
  console.error("Failed to load calls:", err);
  setError(t("calls.loadError") ?? "Failed to load calls");
})
```

### 3B. Agents API route — Fix null workspace_id dereference
```tsx
// src/app/api/agents/[id]/route.ts — AROUND LINE 36-38
// BEFORE:
const { data: existing } = await db.from("agents").select("workspace_id").eq("id", id).maybeSingle();
const err = await requireWorkspaceAccess(req, (existing as { workspace_id: string }).workspace_id);

// AFTER:
const { data: existing } = await db.from("agents").select("workspace_id").eq("id", id).maybeSingle();
if (!existing) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
const err = await requireWorkspaceAccess(req, (existing as { workspace_id: string }).workspace_id);
if (err) return err;
```

### 3C. Apply this pattern across ALL API routes
Search for `.maybeSingle()` calls followed by property access without null check. There should be a `if (!data) return 404` before accessing data properties.

```bash
# Find all affected files:
grep -rn "maybeSingle" src/app/api/ --include="*.ts" -A 2 | grep -v "if (!data\|if (!existing\|if (data ==\|if (!result"
```

---

## PART 4 — ADD SEARCH DEBOUNCE TO ALL FILTER INPUTS

**Problem**: Calls, contacts, leads, and inbox pages filter on every keystroke. With 500+ records, this causes visible lag and excessive re-renders.

### 4A. Create a reusable useDebounce hook

Create `src/hooks/useDebounce.ts`:
```tsx
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

### 4B. Apply to all search inputs

In `src/app/app/calls/page.tsx`:
```tsx
import { useDebounce } from "@/hooks/useDebounce";

// In the component:
const [query, setQuery] = useState("");
const debouncedQuery = useDebounce(query, 300);

// In the useMemo dependency array, replace `query` with `debouncedQuery`:
const filtered = useMemo(() => {
  const q = debouncedQuery.trim().toLowerCase();
  // ... existing filter logic
}, [records, debouncedQuery, outcomeFilter, sentimentFilter, sort]);
```

Apply the same pattern to:
- `src/app/app/contacts/page.tsx`
- `src/app/app/leads/page.tsx`
- `src/app/app/inbox/page.tsx`
- `src/app/app/campaigns/page.tsx`
- Any other page with text search filtering

---

## PART 5 — ADD UNSAVED CHANGES WARNING TO ALL SETTINGS FORMS

**Problem**: Users can fill out settings forms, navigate away accidentally, and lose all changes. No warning is shown.

### 5A. Create a reusable useUnsavedChanges hook

Create `src/hooks/useUnsavedChanges.ts`:
```tsx
import { useEffect, useCallback, useState } from "react";

export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);
}
```

### 5B. Apply to all settings pages

In each settings page that has a save button, track dirty state:
```tsx
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

// In the component:
const [isDirty, setIsDirty] = useState(false);
useUnsavedChanges(isDirty);

// On any form change:
onChange={(e) => { setFieldValue(e.target.value); setIsDirty(true); }}

// On successful save:
setIsDirty(false);
```

Apply to:
- `src/app/app/settings/agent/page.tsx`
- `src/app/app/settings/business/page.tsx`
- `src/app/app/settings/phone/page.tsx`
- `src/app/app/settings/compliance/page.tsx`
- `src/app/app/settings/notifications/page.tsx`
- `src/app/app/settings/integrations/mapping/page.tsx`
- `src/app/app/settings/lead-scoring/page.tsx`
- `src/app/app/agents/AgentsPageClient.tsx` (agent config panels)
- `src/app/app/agents/new/NewAgentWizardClient.tsx`

---

## PART 6 — ADD DOUBLE-SUBMIT PREVENTION TO ALL FORMS

**Problem**: Most forms disable the submit button during save (good), but some don't. And NO forms prevent rapid double-clicks.

### Pattern to apply:

```tsx
const [submitting, setSubmitting] = useState(false);

const handleSubmit = useCallback(async () => {
  if (submitting) return; // Prevent double-submit
  setSubmitting(true);
  try {
    // ... existing save logic
  } finally {
    setSubmitting(false);
  }
}, [submitting, /* other deps */]);

// Button:
<button disabled={submitting} onClick={handleSubmit}>
  {submitting ? t("saving") : t("save")}
</button>
```

Check ALL forms across the product app and ensure every submit button:
1. Has `disabled={submitting}` or `disabled={saving}` or equivalent
2. Shows loading text during submission
3. Has the `submitting` guard at the top of the handler

---

## PART 7 — ADD PROPER EMPTY STATES WITH CTAs

**Problem**: Several pages show blank space or just a table header when there's no data. Users don't know what to do next.

### Pages that need better empty states:

#### 7A. Knowledge page (`src/app/app/knowledge/page.tsx`)
When `entries.length === 0`, show:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center mb-4">
    <BookOpen className="h-6 w-6 text-zinc-400" />
  </div>
  <h3 className="text-lg font-semibold text-white mb-2">{t("emptyTitle")}</h3>
  <p className="text-sm text-zinc-400 mb-6 max-w-sm">
    {t("emptyDescription")}
  </p>
  <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90">
    {t("addFirstEntry")}
  </button>
</div>
```

Add these keys to ALL 6 locale files under `knowledge`:
```json
"emptyTitle": "No knowledge base entries yet",
"emptyDescription": "Add Q&As, documents, or URLs to help your AI agent answer caller questions accurately.",
"addFirstEntry": "+ Add your first entry"
```

#### 7B. Call Intelligence page (`src/app/app/call-intelligence/page.tsx`)
When no intelligence data exists, show empty state with explanation of what Call Intelligence does and how to trigger analysis.

#### 7C. Agents page — when no agents exist
After deleting the last agent, users should see a prominent empty state encouraging them to create one, not just an empty table.

#### 7D. Messages/Inbox page — when no messages exist
Show empty state: "No messages yet. Messages will appear here when leads respond to your SMS or email campaigns."

For EACH empty state, add the corresponding translation keys to ALL 6 locale files with real translations.

---

## PART 8 — ADD CLIENT-SIDE FORM VALIDATION

**Problem**: Most forms submit to the API and only show errors after the round trip. Users should get instant feedback.

### 8A. Agent creation wizard (`src/app/app/agents/new/NewAgentWizardClient.tsx`)

The wizard already has a `validateStep` function — make sure it:
- Shows inline red error text below the specific invalid field (not just a toast)
- Validates agent name is 2-50 chars
- Validates greeting is 10-500 chars
- Validates business hours format
- Prevents advancing to next step if invalid

### 8B. Settings pages

Add inline validation to:
- **Business name**: Required, 2-100 chars
- **Agent name**: Required, 2-50 chars
- **Greeting message**: Required, 10-500 chars
- **Phone number**: Valid format check
- **Email**: Valid format check
- **Webhook URL**: Valid URL format

Pattern for inline validation:
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validateField = (name: string, value: string) => {
  let error = "";
  if (name === "agentName" && value.trim().length < 2) error = t("validation.nameTooShort");
  if (name === "agentName" && value.trim().length > 50) error = t("validation.nameTooLong");
  if (name === "greeting" && value.trim().length < 10) error = t("validation.greetingTooShort");
  setErrors(prev => ({ ...prev, [name]: error }));
};

// Under input:
{errors.agentName && (
  <p className="text-xs text-red-400 mt-1">{errors.agentName}</p>
)}
```

Add validation translation keys to ALL 6 locale files under `validation`:
```json
"validation": {
  "nameTooShort": "Name must be at least 2 characters",
  "nameTooLong": "Name must be 50 characters or less",
  "greetingTooShort": "Greeting must be at least 10 characters",
  "greetingTooLong": "Greeting must be 500 characters or less",
  "required": "This field is required",
  "invalidEmail": "Please enter a valid email address",
  "invalidUrl": "Please enter a valid URL",
  "invalidPhone": "Please enter a valid phone number"
}
```

---

## PART 9 — ADD CONFIRM DIALOGS FOR ALL DESTRUCTIVE ACTIONS

**Problem**: Agent deletion has a confirm dialog, but many other destructive operations do not.

Add `ConfirmDialog` to these actions:

1. **Campaign deletion** (`src/app/app/campaigns/page.tsx`)
2. **Knowledge base entry deletion** (`src/app/app/knowledge/page.tsx`)
3. **Lead deletion** (`src/app/app/leads/page.tsx`)
4. **Contact deletion** (`src/app/app/contacts/page.tsx`)
5. **Integration mapping removal** (`src/app/app/settings/integrations/mapping/page.tsx`)
6. **Phone number release** (`src/app/app/settings/phone/page.tsx`)
7. **Calendar event cancellation** (`src/app/app/calendar/page.tsx`)

Pattern:
```tsx
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

// In JSX:
{confirmDelete && (
  <ConfirmDialog
    title={t("deleteConfirmTitle")}
    description={t("deleteConfirmDescription")}
    confirmLabel={t("deleteConfirmButton")}
    onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null); }}
    onCancel={() => setConfirmDelete(null)}
    destructive
  />
)}

// On delete button click:
onClick={() => setConfirmDelete(item.id)}
```

Add delete confirmation translation keys for each page to ALL 6 locale files.

---

## PART 10 — IMPROVE ERROR RECOVERY ON ALL PAGES

**Problem**: When API calls fail, most pages show a toast error but leave the user stuck. There's no retry mechanism on the page itself.

### 10A. Add inline error + retry for data-loading pages

For every page that fetches data on mount (calls, leads, contacts, campaigns, analytics, knowledge, inbox, messages, call-intelligence), add an error state with retry:

```tsx
const [error, setError] = useState<string | null>(null);

// In the fetch .catch:
.catch((err) => {
  console.error("Load failed:", err);
  setError(t("loadError"));
})

// In the JSX, when error is set and no data:
{error && records.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
      <AlertCircle className="h-6 w-6 text-red-400" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{t("errorTitle")}</h3>
    <p className="text-sm text-zinc-400 mb-6">{error}</p>
    <button
      onClick={() => { setError(null); fetchData(); }}
      className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90"
    >
      {t("retry")}
    </button>
  </div>
)}
```

Add `errorTitle`, `loadError`, and `retry` translation keys for each relevant namespace in ALL 6 locale files.

### 10B. Add retry to the global error boundary

In `src/app/app/error.tsx`, add an auto-retry mechanism:
```tsx
// Add retry count to prevent infinite loops:
const [retryCount, setRetryCount] = useState(0);

// Show "Try again" button that calls reset():
<button onClick={() => { setRetryCount(prev => prev + 1); reset(); }}>
  {t("tryAgain")} {retryCount > 0 && `(${retryCount})`}
</button>

// If retried 3+ times, show "Contact support" link instead:
{retryCount >= 3 && (
  <a href="mailto:support@recall-touch.com" className="text-sm text-[var(--accent-primary)]">
    {t("contactSupport")}
  </a>
)}
```

---

## PART 11 — ADD LOADING SKELETONS TO DRILL-DOWN PAGES

**Problem**: Pages like call details, agent details, and settings sub-pages show a blank screen while data loads.

### 11A. Call detail page (`src/app/app/calls/[id]/page.tsx`)

Add a loading skeleton that shows while `loading` is true:
```tsx
if (loading) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-zinc-800 rounded" />
      <div className="h-8 w-64 bg-zinc-800 rounded" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 bg-zinc-800 rounded-xl" />
        <div className="h-20 bg-zinc-800 rounded-xl" />
        <div className="h-20 bg-zinc-800 rounded-xl" />
      </div>
      <div className="h-40 bg-zinc-800 rounded-xl" />
      <div className="h-60 bg-zinc-800 rounded-xl" />
    </div>
  );
}
```

### 11B. Settings sub-pages

Add similar loading skeletons to:
- `src/app/app/settings/agent/page.tsx`
- `src/app/app/settings/integrations/mapping/page.tsx`
- `src/app/app/settings/integrations/sync-log/page.tsx`
- `src/app/app/settings/phone/marketplace/page.tsx`

---

## PART 12 — ADD USEEFFECT CLEANUP FOR FETCH REQUESTS

**Problem**: When a user navigates away from a page while data is loading, the fetch response tries to update state on an unmounted component. This causes React warnings and potential memory leaks.

### Pattern to apply on ALL pages with fetch in useEffect:

```tsx
useEffect(() => {
  let cancelled = false;

  async function load() {
    try {
      const res = await fetch(`/api/...`);
      if (cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setRecords(data);
    } catch (err) {
      if (cancelled) return;
      setError("Failed to load");
    }
  }

  load();
  return () => { cancelled = true; };
}, [deps]);
```

Apply to EVERY `useEffect` that calls `fetch()` in:
- `src/app/app/calls/page.tsx`
- `src/app/app/calls/[id]/page.tsx`
- `src/app/app/contacts/page.tsx`
- `src/app/app/leads/page.tsx`
- `src/app/app/campaigns/page.tsx`
- `src/app/app/inbox/page.tsx`
- `src/app/app/knowledge/page.tsx`
- `src/app/app/analytics/page.tsx`
- `src/app/app/call-intelligence/page.tsx`
- `src/app/app/activity/page.tsx`
- `src/app/app/agents/AgentsPageClient.tsx`
- `src/app/app/settings/agent/page.tsx`
- `src/app/app/settings/billing/page.tsx`
- `src/app/app/settings/phone/page.tsx`
- `src/app/app/settings/notifications/page.tsx`
- `src/app/app/settings/integrations/page.tsx`

Check each file: if it already has `cancelled` flag with cleanup, leave it alone. If it doesn't, add it.

---

## PART 13 — ADD LOCALSTORAGE SIZE MANAGEMENT

**Problem**: Every page persists data to localStorage without size limits. A user with thousands of calls/leads can exceed the 5-10MB localStorage limit, causing all snapshot persistence to silently fail.

### Create a safe persistence utility

Create `src/lib/client/safe-storage.ts`:
```tsx
const MAX_ITEM_SIZE = 500_000; // 500KB per item
const STORAGE_PREFIX = "rt_";

export function safeSetItem(key: string, value: string): boolean {
  try {
    if (value.length > MAX_ITEM_SIZE) {
      console.warn(`Storage item ${key} exceeds ${MAX_ITEM_SIZE} chars, skipping`);
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // QuotaExceededError — try to free space
    console.warn("localStorage quota exceeded, clearing old snapshots");
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX) && k !== key) keysToRemove.push(k);
      }
      // Remove oldest first (or just clear all snapshots)
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}
```

Then replace ALL direct `localStorage.setItem/getItem/removeItem` calls in product pages with `safeSetItem/safeGetItem/safeRemoveItem`.

---

## PART 14 — ADD INPUT SANITIZATION TO API ROUTES

**Problem**: Agent updates accept arbitrary nested objects without validation. A malicious user could send massive payloads.

### 14A. Add payload size check to agent routes

In `src/app/api/agents/[id]/route.ts` (PUT handler):
```tsx
// At the top of the handler:
const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
if (contentLength > 50_000) {
  return NextResponse.json({ error: "Payload too large" }, { status: 413 });
}
```

### 14B. Add array length limits to knowledge_base and rules

```tsx
if (Array.isArray(body.knowledge_base?.faq) && body.knowledge_base.faq.length > 200) {
  return NextResponse.json({ error: "FAQ limit exceeded (max 200)" }, { status: 400 });
}
if (typeof body.greeting === "string" && body.greeting.length > 2000) {
  return NextResponse.json({ error: "Greeting too long (max 2000 chars)" }, { status: 400 });
}
```

Apply similar limits to ALL API routes that accept user content.

---

## PART 15 — COMPETITIVE EDGE: TOAST SUCCESS FEEDBACK IMPROVEMENTS

**Problem**: After important actions, users only see a brief toast. Competitors show richer feedback.

### Replace plain toasts with rich feedback for key actions:

#### 15A. After agent creation
Instead of just `toast.success("Agent created")`, show:
```tsx
toast.success(
  <div className="flex flex-col gap-1">
    <span className="font-semibold">{t("agents.toast.createdTitle")}</span>
    <span className="text-xs text-zinc-400">{t("agents.toast.createdDesc")}</span>
  </div>
);
```

Add translation keys:
```json
"agents.toast.createdTitle": "Agent created successfully",
"agents.toast.createdDesc": "Your AI agent is ready to take calls. Assign a phone number to go live."
```

#### 15B. After settings saved
Show what was saved + any next steps:
```json
"settings.agent.toast.updatedDesc": "Changes are live — your agent will use the new settings on the next call."
```

#### 15C. After phone number provisioned
```json
"settings.phone.toast.provisionedDesc": "Your new number is active. Assign it to an agent to start receiving calls."
```

Translate ALL new toast keys to all 6 locales.

---

## PART 16 — FIX STRIPE WEBHOOK RACE CONDITION

**Problem**: Stripe can send duplicate webhook events simultaneously. The current dedup logic has a TOCTOU race condition.

In `src/app/api/billing/webhook/route.ts`, replace the insert-then-check pattern with a single atomic operation:

```tsx
// BEFORE (race condition):
const { error: insertError } = await db.from("webhook_events").insert({ event_id: eventId, ... });
if (insertError?.code === "23505") return ... // duplicate

// AFTER (atomic):
const { data: inserted, error: insertError } = await db
  .from("webhook_events")
  .insert({ event_id: eventId, event_type: event.type, processed: false })
  .select("id")
  .single();

if (insertError) {
  // 23505 = unique violation = duplicate event
  if ((insertError as { code?: string }).code === "23505") {
    return NextResponse.json({ received: true, skipped: "duplicate" }, { status: 200 });
  }
  console.error("Webhook event insert failed:", insertError);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// Process the event...

// Mark as processed when done:
await db.from("webhook_events").update({ processed: true }).eq("event_id", eventId);
```

---

## PART 17 — ADD ENV VAR VALIDATION ON STARTUP

**Problem**: If required environment variables are missing, the app starts but fails at runtime with cryptic errors.

Create `src/lib/env-check.ts`:
```tsx
const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VAPI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "SESSION_SECRET",
] as const;

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables:\n${missing.map(k => `   - ${k}`).join("\n")}\n`
    );
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
  }
}
```

Call it from `src/app/layout.tsx` or a top-level server component.

---

## PART 18 — VALIDATION CHECKLIST

After ALL changes:

1. `npx tsc --noEmit` — ZERO errors
2. Test every page with empty localStorage (clear all `rt_*` keys)
3. Test every page with corrupted localStorage (set `rt_*` keys to `"INVALID"`)
4. Test every form with rapid double-clicks
5. Test every settings page: make changes, navigate away, come back
6. Test every delete action — should show confirmation dialog
7. Test every page with API failure (temporarily break API route) — should show error + retry
8. Verify all new translation keys exist in ALL 6 locale files
9. Check browser console for React warnings about state updates on unmounted components

---

## PART 19 — GIT COMMIT & PUSH

```bash
git add -A
git commit -m "fix: bulletproof reliability, security & UX across entire product

- Wrap all JSON.parse calls in try-catch with graceful fallback
- Add auth validation to 8 unprotected lead/call API routes
- Fix null safety in API response handling and .maybeSingle() chains
- Add useDebounce hook + apply to all search/filter inputs
- Add useUnsavedChanges hook to all settings forms
- Add double-submit prevention to all form handlers
- Add empty states with CTAs to knowledge, call-intelligence, messages pages
- Add client-side form validation with inline error messages
- Add ConfirmDialog to 7 additional destructive operations
- Add inline error + retry UI to all data-loading pages
- Add loading skeletons to drill-down pages
- Add useEffect cleanup (cancelled flag) to all fetch-based effects
- Add safe-storage utility with quota management
- Add payload size validation to API routes
- Improve toast feedback with richer success messages
- Fix Stripe webhook race condition with atomic dedup
- Add env var validation on startup
- Add all new translation keys to 6 locale files"
git push origin HEAD
```

---

## SUMMARY

| Priority | Category | Items | Impact |
|----------|----------|-------|--------|
| 🔴 CRITICAL | JSON.parse crashes | 12 files | Prevents white-screen crashes |
| 🔴 CRITICAL | Unauthed API routes | 8 routes | Prevents data exposure |
| 🔴 CRITICAL | Null safety in APIs | ~10 routes | Prevents 500 errors |
| 🔴 CRITICAL | Stripe webhook race | 1 file | Prevents double-billing |
| 🟡 HIGH | Search debounce | 5 pages | Smooth filtering UX |
| 🟡 HIGH | Unsaved changes | 9 pages | Prevents data loss |
| 🟡 HIGH | Double-submit guard | All forms | Prevents duplicates |
| 🟡 HIGH | Confirm dialogs | 7 actions | Prevents accidents |
| 🟡 HIGH | Error + retry UI | 12 pages | Users can self-recover |
| 🟢 MEDIUM | Empty states | 4 pages | Better onboarding UX |
| 🟢 MEDIUM | Form validation | 6 pages | Faster error feedback |
| 🟢 MEDIUM | Loading skeletons | 5 pages | Perceived performance |
| 🟢 MEDIUM | useEffect cleanup | 16 pages | No React warnings |
| 🟢 MEDIUM | Safe storage | All pages | Handles quota limits |
| 🟢 MEDIUM | Rich toasts | 3 flows | Premium feel |
| 🟢 MEDIUM | Env validation | 1 file | Fail-fast startup |
