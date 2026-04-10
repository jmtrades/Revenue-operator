# Test Coverage Analysis

**Date:** 2026-04-10
**Scope:** Full codebase audit of `__tests__/`, `e2e/`, `src/`

---

## Summary

| Metric | Count |
|---|---|
| Source files (`src/`) | 1,971 |
| Test files (`__tests__/`) | 288 |
| E2E specs (`e2e/`) | 12 |
| API route files | 641 |
| `src/lib/` modules (directories) | ~150 |
| Lib modules with **zero** test references | 76 (~50%) |
| Component files (`src/components/`) | 208 |
| Component test files | 0 |
| Hook files (`src/hooks/`) | 4 |
| Hook test files | 0 |

## Test Quality Breakdown

The 288 test files fall into three categories:

| Category | Count | % | Description |
|---|---|---|---|
| Static analysis tests | 161 | 56% | Use `readFileSync` to verify source code structure, not runtime behavior |
| Placeholder/stub tests | 41 | 14% | Contain `expect(true).toBe(true)` — pass unconditionally |
| Actual unit/integration tests | ~86 | 30% | Import and execute source code, verifying real behavior |

Only ~30% of the test suite verifies actual runtime behavior.

---

## Recommendations

### 1. Replace Placeholder Tests with Real Tests (HIGH)

41 test files contain `expect(true).toBe(true)`. These provide false confidence.

Priority targets:
- `billing.test.ts` — Stripe webhook verification, trial creation, and reminder idempotency are all stubs
- `stripe-webhook-settlement.test.ts` — Tests metadata parsing with inline literals instead of calling route handlers
- `cooldowns.test.ts`, `dispute.test.ts` — Revenue-critical logic with zero real assertions

### 2. Add Component Tests (HIGH)

208 component files with zero component tests.

Priority targets:
- `WorkspaceGate.tsx` — Auth gate, affects every protected page
- `BillingFailureBanner.tsx`, `TrialBanner.tsx` — Revenue-impacting UI
- `Shell.tsx` — Layout wrapper used everywhere
- `ErrorBoundary.tsx` — Should verify fallback rendering
- `UnifiedDashboard.tsx` — Core user-facing surface

Requires adding `@testing-library/react` + `jsdom` vitest environment.

### 3. Test Untested Critical Library Modules (HIGH)

76 `src/lib/` modules have no test coverage. Most critical:

| Module | Files | Why it matters |
|---|---|---|
| `telephony/` | 9 | Core phone/SMS integration (Telnyx) |
| `conversational-engine/` | 6 | AI conversation Brain, RecallAgent, ResiliencyLayer |
| `human-presence/` | 9 | Bot detection, behavioral validation |
| `channel-orchestration/` | 3 | Multi-channel message routing |
| `lead-memory/` | 3 | Lead state persistence |
| `revenue-lifecycle/` | 4 | Revenue state tracking |
| `observability/` | 3 | Alerts, metrics, logging |
| `call-outcomes/` | 3 | Post-call outcome ingestion |
| `lead-opt-out/` | 1 | Compliance — opt-out handling |
| `attribution/` | 1 | Revenue attribution (counterfactual) |

Full list of untested modules: `adaptive-conversation`, `agents`, `assumption-engine`, `attribution`, `awareness-timing`, `bootstrap`, `business-brain`, `business-memory`, `calendar-optimization`, `call-outcomes`, `channel-escalation`, `channel-orchestration`, `confidence-ceiling`, `continuity-connectors`, `continuity-load`, `conversation-state`, `conversational-engine`, `coordination-semantics`, `counterparty-participation`, `decision-assumption`, `economic-gravity`, `economic-participation`, `environment-recognition`, `environmental-presence`, `event-engine`, `execution-ux`, `exposure-engine`, `goals`, `handled-imprints`, `human-override`, `human-presence`, `institutional-auditability`, `lead-memory`, `lead-opt-out`, `message-compiler`, `negative-signal-semantics`, `network-formation`, `network-intelligence`, `normalization-engine`, `observability`, `operational-ambiguity`, `operational-dependency-memory`, `operational-engines`, `operational-expectations`, `operational-identity`, `operational-memory`, `operational-presence`, `operational-realization`, `operational-responsibilities`, `operational-timeline-memory`, `opportunity-recovery`, `organizational-embedding`, `outbound-events`, `outbound-suppression`, `outcome-dependencies`, `playbooks`, `proof-capsules`, `public-corridor`, `reality-signals`, `receptionist`, `relationship-continuity`, `revenue-lifecycle`, `revenue-product`, `risk-surface`, `ritual-cycles`, `safe-responses`, `seo`, `shared-environment-density`, `telemetry`, `telephony`, `temporal-anchoring`, `temporal-stability`, `third-party-reliance`, `thread-assignments`, `thread-evidence`, `thread-reference-memory`, `universal-model`.

### 4. Convert Static Analysis Tests to Behavioral Tests (MEDIUM)

161 tests use `readFileSync` to verify source code structure (e.g. "function X appears before function Y"). While useful as architectural guardrails, they don't verify runtime behavior.

Priority conversions:
- `execution_atomicity.test.ts` — Should test that a failed `buildExecutionPlan` produces zero side effects by calling the actual function
- `voice_state_machine_integrity.test.ts` — Should test state transitions, not scan for string presence
- `connector_idempotency.test.ts` — Should verify idempotency by calling the connector twice

### 5. Add Hook Tests (MEDIUM)

4 custom hooks with zero tests:
- `useDashboardFetch` — data fetching logic
- `useDebounce` — timing behavior (easy to unit test)
- `useResolvedWorkspaceId` — workspace resolution logic
- `useUnsavedChanges` — navigation guard

### 6. Expand E2E Coverage (LOW)

The 12 Playwright specs cover core flows. Missing scenarios:
- Settings/configuration changes
- Integration management (connect/disconnect)
- Admin panel operations
- Voice agent testing flow
- Error states and offline behavior

### 7. Fix Test Infrastructure (PREREQUISITE)

`vitest` is listed as a devDependency (`^4.0.18`) but `npx vitest run --coverage` fails because the module can't resolve from `node_modules`. Coverage reports cannot currently be generated.

Fix: ensure `npm install` installs vitest correctly, and add a script:

```json
"test:coverage": "vitest run --coverage"
```

---

## Recommended Priority Order

1. Fix test infrastructure so coverage reports work
2. Replace the 41 placeholder tests with real assertions
3. Add tests for `telephony`, `conversational-engine`, `lead-opt-out`, and `revenue-lifecycle`
4. Add component tests for auth gates, billing UI, and error boundaries
5. Convert high-value static analysis tests to behavioral tests
6. Add hook tests (`useDebounce` is a quick win)
