# CURSOR COMPLETION PROMPT — Recall Touch Final Launch Pass

You are completing recall-touch.com for production launch. Do NOT plan. Do NOT phase. Execute every item below until done. Run `npx tsc --noEmit` after every batch of changes. Commit after each logical group.

---

## 1. REMAINING .single() CRASH BUGS (179 remaining)

Run this to find them all:
```bash
grep -rn '\.single()' src/app/api/ --include="*.ts" | grep -v '.maybeSingle' | grep -v 'insert('
```

Every `.single()` on a SELECT/lookup query MUST be changed to `.maybeSingle()`. `.single()` on INSERT...select().single() is fine — leave those.

Priority files (crash on real user traffic):
- `src/app/api/leads/[id]/next-action/route.ts` (line ~21 — deals lookup)
- `src/app/api/leads/[id]/messages/route.ts` (line ~20 — conversations lookup)
- `src/app/api/leads/[id]/proof/route.ts` (lines ~118, 121, 150)
- `src/app/api/leads/[id]/stability/route.ts` (lines ~49, 52, 64)
- `src/app/api/appointments/route.ts` (line ~142 — leads lookup)
- `src/app/api/wrapup/submit/route.ts` (line ~58 — call_analysis lookup)
- `src/app/api/cron/process-queue/route.ts` (lines ~45, 77)
- `src/app/api/contacts/[id]/route.ts` (line ~50)
- `src/app/api/public/shared-transactions/acknowledge/route.ts` (line ~60)
- `src/app/api/integrations/zapier/triggers/new_appointment/route.ts` (line ~27)
- `src/app/api/integrations/zapier/triggers/new_lead/route.ts` (line ~28)
- `src/app/api/integrations/zapier/triggers/new_call/route.ts` (line ~28)
- `src/app/api/integrations/zapier/actions/update_lead/route.ts` (lines ~27, 39)
- `src/app/api/dev/simulate-inbound/route.ts` (line ~76)

Change ALL of them. Do not skip any.

---

## 2. SILENT .catch(() => {}) HANDLERS (140 remaining)

Run:
```bash
grep -rn '\.catch(() => {})' src/app/api/ --include="*.ts"
```

Replace every `.catch(() => {})` with `.catch((err) => { console.error("[context] error:", err instanceof Error ? err.message : err); })` where context is the route name.

Do NOT change `.catch(() => {})` in client-side code (src/app/app/) — only fix API routes.

---

## 3. REMAINING LOCALHOST FALLBACKS

Files:
- `src/app/api/integrations/zoom/connect/route.ts` (line 18)
- `src/app/api/install/demo-seed/route.ts` (line 98)

Replace `"http://localhost:3000"` fallback with proper production check:
```typescript
const base = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL;
if (!base) {
  console.error("[route-name] Cannot determine base URL");
  return NextResponse.json({ error: "Configuration error" }, { status: 500 });
}
```

---

## 4. VAPI CLEANUP

The app no longer uses Vapi (uses ElevenLabs). Remove dead Vapi references:

- `src/app/api/workspace/agent/route.ts` line 3 — Remove comment about syncing to Vapi
- `src/proxy.ts` line 106 — Remove `/api/vapi/demo-config` from public paths (or leave as dead code)
- `src/app/api/agent/create-vapi/route.ts` line 96 — This entire route is dead code. Add a deprecation comment at the top: `/** @deprecated Vapi no longer used. Kept for backwards compatibility. */`
- Do NOT delete any routes — just mark deprecated and ensure they return 503 when VAPI keys are missing (they already do via hasVapiServerKey())

---

## 5. MISSING WORKSPACE/MEMBERS API ENDPOINT

The team settings page now calls `GET /api/workspace/members?workspace_id=...`. Create this endpoint:

File: `src/app/api/workspace/members/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: members } = await db
    .from("workspace_members")
    .select("id, user_id, role, status, created_at, users(email, name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  const formatted = (members ?? []).map((m: any) => ({
    name: m.users?.name || m.users?.email?.split("@")[0] || "Team member",
    email: m.users?.email || "",
    role: m.role || "member",
    status: m.status || "active",
  }));

  // Fallback: if no members found, return current session user
  if (formatted.length === 0 && session?.email) {
    formatted.push({
      name: session.email.split("@")[0],
      email: session.email,
      role: "owner",
      status: "active",
    });
  }

  return NextResponse.json({ members: formatted });
}
```

Adjust the table/column names if they differ from the schema. Check `workspace_members` or `workspace_users` table name.

---

## 6. SETTINGS DATABASE COLUMNS FOR CALL RULES

The call-rules API reads/writes `after_hours_behavior`, `emergency_keywords`, `transfer_phone` from the `settings` table. If these columns don't exist, apply this migration via Supabase:

```sql
ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS after_hours_behavior TEXT DEFAULT 'messages',
  ADD COLUMN IF NOT EXISTS emergency_keywords TEXT DEFAULT 'emergency, urgent',
  ADD COLUMN IF NOT EXISTS transfer_phone TEXT DEFAULT '';
```

---

## 7. I18N MISSING KEYS

Add to ALL 6 locale files (en, es, fr, de, pt, ja) in `src/i18n/messages/`:

Under `callRules`:
```json
"toast": {
  "saved": "Call rules saved",
  "error": "Failed to save call rules"
}
```

Translate for each locale.

---

## 8. UX POLISH

### 8a. Agent settings — "Language" label hardcoded English
File: `src/app/app/settings/agent/page.tsx` ~line 270
Replace hardcoded "Language" with `tSettings("agent.languageLabel")` and add key to all locales.

### 8b. Billing status starts as "trial" before loading
File: `src/app/app/settings/billing/page.tsx`
Change initial `billingStatus` state from `"trial"` to `null` and show skeleton until data loads.

### 8c. Onboarding window.prompt() for Q&A editing
File: `src/app/app/onboarding/page.tsx` ~lines 591-592
Replace `window.prompt()` with an inline editable input field or a small modal.

### 8d. Missing error boundaries around charts
File: `src/app/app/activity/page.tsx`
Wrap AreaChart and PieChart in React Error Boundary components to prevent full page crash on render errors.

### 8e. Timezone default
Files: `src/app/app/settings/business/page.tsx`, `src/app/app/settings/agent/page.tsx`
Replace hardcoded `"America/Los_Angeles"` with `Intl.DateTimeFormat().resolvedOptions().timeZone` as the default.

---

## 9. EMAIL CONFIGURATION

If RESEND_API_KEY is not set in production, email-dependent flows (invite, welcome, password reset) will silently fail. Add a warning log in the email sending function if the key is missing:
```typescript
if (!process.env.RESEND_API_KEY) {
  console.warn("[email] RESEND_API_KEY not configured — email not sent");
  return { ok: false, reason: "email_not_configured" };
}
```

---

## 10. ENV VAR VALIDATION

File: `src/lib/env/validate.ts`
Add these to the production required check:
- `ELEVENLABS_API_KEY` (if VOICE_PROVIDER=elevenlabs)
- `ELEVENLABS_WEBHOOK_SECRET`
- All 3 monthly Stripe prices: `STRIPE_PRICE_SOLO_MONTH`, `STRIPE_PRICE_GROWTH_MONTH`, `STRIPE_PRICE_TEAM_MONTH`

Make the validation warn-only (don't crash the build) but log clearly what's missing.

---

## VERIFICATION CHECKLIST

After completing all items above:
1. Run `npx tsc --noEmit` — must pass with zero errors
2. Run `grep -rn '\.single()' src/app/api/ --include="*.ts" | grep -v '.maybeSingle' | grep -v 'insert(' | wc -l` — should be near zero (only insert-based .single() calls)
3. Run `grep -rn '\.catch(() => {})' src/app/api/ --include="*.ts" | wc -l` — should be zero
4. Run `grep -rn 'localhost:3000' src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l` — should be zero
5. Commit with message: "fix: final completion pass — crash prevention, error logging, UX polish"
