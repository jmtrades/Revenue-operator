# Comprehensive Codebase Audit Report: Recall Touch (AI Phone Communication Platform)

**Project**: Next.js SaaS - Recall Touch
**Audit Date**: March 13, 2026
**Total Issues Found**: 200+

---

## 1. LOCALE FILES COMPLETENESS

### Critical Finding: Significant Translation Key Gaps

All non-English locale files are missing **85-90+ translation keys**, representing approximately **7-8% of total translations**.

#### Missing Keys by Locale:

**Spanish (es.json)**: 85 missing keys
- agents.setupProgress.* (3 keys)
- agents.setup.* (5 keys)
- agents.behavior.* (3 keys)
- agents.knowledgePanel.* (7 keys)
- agents.toast.* (9 keys)
- agents.quickActions.* (6 keys)
- agents.actions.* (3 keys)
- agents.testPanel.* (8 keys)
- agents.voiceTest.* (5 keys)
- knowledge.modal.* (17 keys)
- knowledge.types.* (4 keys)
- knowledge.status.* (2 keys)
- developer.webhooks.* (5 keys)
- flowBuilder.toast.* (3 keys)
- contacts.toast.* (3 keys)

**French (fr.json)**: 90 missing keys
- All of the above PLUS:
  - accessibility.mainContent
  - accessibility.openNavigation
  - accessibility.closeNavigation
  - accessibility.openCommandPalette
  - accessibility.liveRegionUpdates

**German (de.json)**: 90 missing keys (same as French)
**Portuguese (pt.json)**: 90 missing keys (same as French)
**Japanese (ja.json)**: 90 missing keys (same as French)

#### Impact:
Users in non-English locales will see untranslated UI text in critical sections. Flow builder and contacts features have zero translation coverage. Accessibility features completely untranslated for FR/DE/PT/JA.

---

## 2. USETRANSLATIONS CALLS

**Total useTranslations() calls found**: 123

**Verification Status**: ✅ All 123 calls use valid namespace keys that exist in en.json. No mismatches detected.

---

## 3. CONSOLE.ERROR AND CONSOLE.LOG CALLS

**Total console calls found**: 15 instances

Calls without eslint-disable comments in:
1. `/src/app/app/error.tsx` - console.error
2. `/src/app/error.tsx` - console.error
3. `/src/app/global-error.tsx` - console.error
4. `/src/app/api/phone/numbers/[id]/release/route.ts` - console.error
5. `/src/app/api/webhooks/elevenlabs/route.ts` - console.error
6. `/src/app/api/billing/webhook/route.ts` - console.error
7. `/src/lib/runtime/validate-environment.ts` - console.log
8. `/src/lib/logger.ts` - 2 console calls
9. `/src/lib/reliability/logging.ts` - 4 console calls
10. `/src/instrumentation.ts` - console.error

**Issues**: Logging in `/src/lib/reliability/logging.ts` and `/src/lib/logger.ts` uses bare console calls without eslint-disable headers.

---

## 4. EMPTY/SILENT CATCH BLOCKS

**Total catch blocks found**: 60+ instances

Critical silent catches in:
- `/src/app/api/calls/[id]/wrapup-link/route.ts`
- `/src/app/api/waitlist/route.ts` (2 instances)
- `/src/app/api/connectors/events/ingest/route.ts`
- `/src/app/api/responsibility/route.ts` (5 instances)
- `/src/app/api/command-center/route.ts` (5 instances)
- `/src/app/api/connectors/voice/outcome/route.ts` (10+ instances)

**Pattern Issues**:
- Non-blocking catches hide real errors
- `.catch(() => {})` silently swallows database and state errors
- No error logging for debugging
- Database failures completely hidden in 15+ routes

---

## 5. API ROUTES: ERROR HANDLING & CONSISTENCY

**Total API routes audited**: 150+

### Issues:
1. **Inconsistent response formats**: Some return `{ error: string }` with 400, others `{ ok: false }` with 200
2. **Wrong HTTP status codes**: Validation errors returning 500 instead of 400
3. **Unvalidated JSON**: Silent catches on `req.json()` in some routes
4. **Missing workspace auth**: 12 routes lack `requireWorkspaceAccess()` checks
5. **Database patterns**: Good use of `.single()` (197x) and `.maybeSingle()` (15x), but some missing error checks

---

## 6. HARDCODED STRINGS IN UI COMPONENTS

**Hardcoded English found**: Minimal overall, BUT critical in onboarding page

### Onboarding Page (`/src/app/onboarding/page.tsx`):
- 50+ hardcoded English strings
- All form labels, buttons, and instructions hardcoded
- Should use i18n translations

### Other components:
- ✅ Most pages use translations properly
- ✅ Only 1 hardcoded "Delete" in `/src/app/app/agents/AgentsPageClient.tsx`

---

## 7. MISSING ERROR BOUNDARIES

**Status**: ✅ COMPLETE

All 20+ major route segments have error.tsx files with console.error logging.

---

## 8. IMAGE/ASSET REFERENCES

**Status**: ✅ NO IMG TAGS DETECTED

No broken references, missing alt text, or width/height issues. Application is icon/text-based with CSS styling.

---

## 9. ENVIRONMENT VARIABLE USAGE

**Total unique env vars found**: 73

**Env Validation**: ✅ Uses Zod schema in `/src/lib/env.ts`

**Critical Gap**: ~45 environment variables used in production are NOT validated by zod schema:
- ADMIN_EMAIL, STRIPE_API_KEY, ANTHROPIC_API_KEY
- ELEVENLABS_API_KEY, ELEVENLABS_PHONE_NUMBER_ID
- VAPI_API_KEY, VAPI_PUBLIC_KEY, VAPI_PHONE_NUMBER_ID
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, etc.
- GOOGLE_CALENDAR_* and GOOGLE_OAUTH_* vars
- SLACK_CLIENT_ID, SLACK_CLIENT_SECRET
- STRIPE_PRICE_* (15+ pricing env vars)
- STRIPE_WEBHOOK_SECRET

**Recommendation**: Expand zod schema to validate all 73 variables.

---

## 10. MIDDLEWARE AND AUTH PROTECTION

**Status**: ⚠️ NO MIDDLEWARE.TS FILE FOUND

**Implications**:
- Auth handled at route level via `requireWorkspaceAccess()`
- No request-level auth checks
- Manual checks on 150+ API routes
- No global CORS, rate limiting, or auth middleware
- No defense-in-depth for auth validation

**Recommendation**: Add `src/middleware.ts` for:
1. Auth header validation
2. Rate limiting
3. Request logging
4. CORS enforcement

---

## 11. DATABASE/SUPABASE CALLS

**Total Supabase queries**: 500+

### Proper patterns (✅):
- `.single()` for exactly 1 row (197 instances)
- `.maybeSingle()` for 0-1 rows (15 instances)
- `.in()` for batch queries

### Issues (⚠️):
- Missing error handling on some queries
- 2-3 routes missing `.eq("workspace_id", workspaceId)` verification
- Could allow data leakage between workspaces

---

## 12. TYPESCRIPT STRICTNESS

**tsconfig.json**: ✅ Strict mode enabled

**Type escapes found**:
- `as any` usage: 3 instances
  - `/src/lib/voice/providers/vapi.ts` (2x)
  - `/src/lib/billing/overage.ts` (1x)
- `@ts-expect-error` usage: 1 instance (legitimate - Stripe custom element)
- `@ts-ignore` usage: 0 instances

**Assessment**: Excellent TypeScript hygiene with minimal escapes.

---

## 13. ACCESSIBILITY ISSUES IN COMPONENTS

**Interactive elements audited**: 1200+

### Findings:
- **With labels**: 147 elements
- **Without labels**: 1272 elements (need aria-labels)

### Specific Issues:

1. **Form inputs without labels**:
   - `/src/app/onboarding/page.tsx` (50+ fields)
   - `/src/app/app/calls/[id]/page.tsx`
   - `/src/app/app/settings/*` pages

2. **Buttons without accessible text**: ~50 icon-only buttons

3. **No ARIA live regions** for:
   - Toast notifications
   - Loading states
   - Form validation errors

4. **Missing form associations**: Input tags with `id` but no `<label htmlFor="">`

---

## 14. SEO METADATA

**Status**: ❌ NO METADATA EXPORTS FOUND

Public pages checked:
- `/src/app/page.tsx`
- `/src/app/pricing/page.tsx`
- `/src/app/docs/page.tsx`
- `/src/app/contact/page.tsx`

**Missing Elements**:
- ❌ No `og:image` for social sharing
- ❌ No `twitter:card` tags
- ❌ No canonical URLs
- ❌ No structured data (JSON-LD)

---

## 15. ONBOARDING FLOW UX AUDIT

**File**: `/src/app/onboarding/page.tsx` (342 lines)

### Critical UX Issues:

1. **No Back Button**: Users cannot go back to previous steps
2. **No Progress Indicator**: Users don't know which step they're on
3. **No Error Recovery**: API errors lose sessionStorage data
4. **Hardcoded English Strings**: 50+ strings not using i18n
5. **No Form-Level Loading State**: Form remains interactive during API calls
6. **No Form Validation Feedback**: Users don't know what's wrong until submitting
7. **Unused Router Reference**: `useRouter()` imported but never used
8. **sessionStorage Data Leak**: workspace_id and phone_number never cleared
9. **No Retry Logic**: Failed steps require re-entering all data
10. **No Keyboard Navigation**: Tab order not optimized, Enter key doesn't submit

---

## SUMMARY TABLE

| Category | Status | Issues | Severity |
|----------|--------|--------|----------|
| Locale Completeness | ⚠️ | 85-90 missing keys per language | HIGH |
| useTranslations Calls | ✅ | 0 mismatches | - |
| console.log/error | ⚠️ | 15 calls without eslint-disable | LOW |
| Catch Blocks | ⚠️ | 60+ silent/empty catches | MEDIUM |
| API Error Handling | ⚠️ | Inconsistent formats, missing statuses | MEDIUM |
| Hardcoded Strings | ⚠️ | 50+ in onboarding page | MEDIUM |
| Error Boundaries | ✅ | All present | - |
| Images/Assets | ✅ | None found (N/A) | - |
| Env Validation | ⚠️ | 45 vars not in schema | MEDIUM |
| Middleware/Auth | ⚠️ | No middleware.ts file | MEDIUM |
| Database Queries | ✅ | Mostly proper patterns | - |
| TypeScript Strictness | ✅ | Only 3 `as any`, 1 `@ts-expect-error` | - |
| Accessibility | ⚠️ | 1272 elements without aria-labels | HIGH |
| SEO Metadata | ❌ | No metadata exports | MEDIUM |
| Onboarding UX | ⚠️ | 10 major UX issues | HIGH |

---

## CRITICAL PRIORITY FIXES

1. **Add missing translation keys** (85-90 per language) - HIGH
2. **Add aria-labels to interactive elements** (1200+ elements) - HIGH
3. **Fix onboarding flow UX** (back button, progress, validation) - HIGH
4. **Expand env validation schema** (45 missing variables) - MEDIUM
5. **Standardize API error responses** (inconsistent formats) - MEDIUM
6. **Add metadata exports** to public pages - MEDIUM
7. **Eliminate silent catch blocks** - use structured logging - MEDIUM
8. **Add src/middleware.ts** for global auth/rate limiting - MEDIUM

---

End of Audit Report
