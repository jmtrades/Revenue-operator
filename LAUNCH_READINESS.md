# Launch Readiness Report

## Baseline (Phase 0)

### Initial Failures
- **Lint**: 9 errors, 66 warnings (Date.now impure, prefer-const, activateAndRedirect order, setState in effect)
- **Test**: Passed (134 tests)
- **Build**: Failed (duplicate `now`/`setNow` in conversations page)

### Changes Made

#### Lint Fixes
1. **conversations/page.tsx**: Moved `Date.now()` to `useState` + `useEffect` interval for purity; prefixed unused `hotMap`/`atRiskMap` with `_`; fixed LeadCard `column` param
2. **leads/[id]/page.tsx**: Same `Date.now()` → `useState` + interval; `router` → `_router`
3. **onboarding/page.tsx**: `activateAndRedirect` moved before `useEffect`, wrapped in `useCallback` with correct deps
4. **wrapup/[token]/page.tsx**: Derive `status` from `!token` instead of `setState` in effect; removed unused `router` import
5. **Auto-fix**: `prefer-const` for delays, _cache, reasons, behW, participantNames
6. **diagnosis/route.ts**: `let delays` → `const delays`

#### Build Fix
- Removed duplicate `[now, setNow]` declaration in conversations page

#### Env
- Extended `src/lib/env.ts` with optional: BASE_URL, ENCRYPTION_KEY, ZOOM_*, TWILIO_*, STRIPE_PRICE_ID, NEXT_PUBLIC_APP_URL, EMAIL_FROM, RESEND_API_KEY

---

## No Silent Failures (Phase 1)

### Exit Paths Audited
Every decision-with-engines return path now schedules `lead_plan.next_action_at`:

| Exit | Schedules |
|------|-----------|
| decision_no_intervention | ✓ recheck |
| coverage_not_enabled | ✓ recheck |
| cooldown_active | ✓ observe (or recheck if no cooldown_until) |
| uncertainty_restraint | ✓ observe + defer message |
| low_confidence | ✓ recheck |
| no_role_for_action | ✓ recheck |
| !convId | ✓ recheck |
| inEscalationHold | ✓ observe |
| escalation_suggest | ✓ observe at hold_until |
| forceSimulate | ✓ observe |
| Successful send | ✓ advanceSequence/completeLeadPlan |

### New Tests
- `__tests__/decision-exit-scheduling.test.ts`: Asserts `computeRevenueState` returns `transition_toward_risk_at` when appropriate and null for REVENUE_LOST

---

## No Duplicate Sends (Phase 2)

- `enqueueDecision` dedupes pending decision jobs per lead (DB path)
- `shouldEnqueueDecision` prevents enqueue when active plan has future `next_action_at`
- `hashMessage` + cooldowns prevent resend loops
- Existing tests: `lead-plan.test.ts`, `burst-drain.test.ts`, `idempotency.test.ts`

---

## Human Safety (Phase 3)

- `applySafetyLayer` runs before every `sendOutbound` in `src/lib/delivery/provider.ts`
- `enforceHumanAcceptability` + `isLowPressureMode` applied
- Templates only via `buildMessageFromIntervention` (no free-form AI)
- Existing tests: `human-safety.test.ts`, `opt-out-enforcement.test.ts`

---

## Final Verification

```
npm run lint   → 0 errors, 63 warnings
npm run test   → 33 files, 136 tests passed
npm run build  → Success
```

### Route Check
- `GET /api/health` → 200, `{"status":"ok"}`
- `GET /api/command-center?workspace_id=...` → 200, valid JSON

---

## Critical Launch Env Vars

| Var | Required | Purpose |
|-----|----------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Yes | DB + auth |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Client auth |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Server/admin |
| CRON_SECRET | Yes (prod) | Cron auth |
| WEBHOOK_SECRET | Recommended | Inbound webhook verification |
| OPENAI_API_KEY | For AI features | Slot fill, deal prediction |
| STRIPE_SECRET_KEY | For billing | Checkout, subscriptions |
| TWILIO_* | For SMS | Delivery |
| ENCRYPTION_KEY | For Zoom OAuth | Token encryption |

---

## Vercel Deployment

- **Build command**: `npm run build`
- **Output**: Next.js standalone (default)
- **Cron auth**: All `/api/cron/*` require `Authorization: Bearer <CRON_SECRET>`
- **/ops**: Protected via middleware (staff auth)
- **Middleware**: Uses `proxy` convention (Next.js 16 deprecation note)
