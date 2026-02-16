# Launch Readiness

This document describes the operational guarantees that ensure the system is ready for companies to rely on it.

## Core Guarantees

### 1. Completion Requires External Confirmation

**Guarantee:** No internal action alone may finalize an outcome.

**Implementation:**
- `acknowledgeSharedTransaction` requires `state === "pending_acknowledgement"`
- Idempotency check: if already acknowledged, returns success without duplicate processing
- State transitions: `pending_acknowledgement` → `acknowledged` only via counterparty action
- No timeout mechanisms that auto-complete records

**Verification:** Onboarding remains in valid incomplete state forever if counterparty never confirms.

### 2. Removal Creates Uncertainty

**Guarantee:** Absence endpoints must always produce meaningful consequence statements.

**Implementation:**
- `/api/operational/absence-statements` returns `what_will_fail`, `what_becomes_uncertain`, `what_moves_outside`
- Always returns arrays (never errors) even with minimal data
- Derived from `disable-impact` and `retention-intercept` signals
- Empty arrays indicate no operational dependency (truthful emptiness)

**Verification:** Removal safety test script simulates full lifecycle and verifies uncertainty detection.

### 3. Records Persist Across Time

**Guarantee:** Reference memory must attach later work deterministically.

**Implementation:**
- `thread_reference_memory` table links threads to contexts
- `detectAndAttachReference` runs on new commitments, payments, conversations
- Deterministic matching: same subject, same lead, same conversation
- No user choice required; system observes and attaches

**Verification:** `workspaceHasMultiDayReferences` detects cross-day references.

### 4. Multi-Party Reliance Detectable

**Guarantee:** Presence must show reliance when third parties act.

**Implementation:**
- `hasThirdPartyReliance` checks for observer events, downstream resolution, cross-participant references
- Presence lines include: "Work now depends on this record beyond its origin."
- `reciprocal_events` records actor_role and operational_action
- Authority transfer detection: downstream resolves originator/counterparty responsibilities

**Verification:** Presence surface shows reliance lines when third parties act.

### 5. Exportable History Exists

**Guarantee:** `export-record` must always produce a defensible chronological document.

**Implementation:**
- `/api/operational/export-record` returns: orientation, continuation, responsibilities, amendments, proof
- Performance caps: MAX_THREADS=1000, MAX_CONTINUATION_PER_THREAD=500, MAX_RESPONSIBILITIES_PER_THREAD=200, MAX_AMENDMENTS_PER_THREAD=200
- Always returns valid JSON structure (never errors)
- Empty arrays indicate no data (truthful emptiness)

**Verification:** Export endpoint tested with minimal data, returns valid structure.

### 6. Payment Justification Exists

**Guarantee:** `why-pay` must always produce factual reliance lines.

**Implementation:**
- `/api/operational/why-pay` returns up to 6 factual lines
- Checks: acknowledged threads, third-party reliance, multi-day references, parallel reality, historical clarity, cascade uncertainty
- Always returns `{ lines: string[] }` (never errors)
- Empty array indicates no operational dependency (truthful emptiness)

**Verification:** Endpoint tested with minimal data, returns valid structure.

## Data Integrity Locks

### Append-Only Tables

- `orientation_records`: Duplicate prevention (1-hour window check)
- `thread_amendments`: Immutable once recorded
- `reciprocal_events`: Immutable once recorded
- `proof_capsules`: Reproducible from deterministic inputs
- `outcome_dependencies`: Never deleted, only resolved

### Idempotency

- `acknowledgeSharedTransaction`: Returns success if already acknowledged
- `recordOrientationStatement`: Prevents duplicates within 1-hour window
- All critical endpoints: Return neutral responses on failure

## Performance Containment

### Safe Caps

- Record log: LIMIT=80 entries
- Export: MAX_THREADS=1000, MAX_CONTINUATION_PER_THREAD=500
- Record log thread check: MAX_THREADS_CHECK=100
- Continuation entries: Bounded per thread
- Dependency traversal: Bounded queries

### Deterministic Ordering

- All queries use explicit `ORDER BY created_at ASC` or `ORDER BY recorded_at ASC`
- No dependency on UI timing or race conditions
- Database-level ordering guarantees consistency

## Endpoint Reliability

### Critical Endpoints (Never Fail)

- `/api/operational/why-pay`: Returns `{ lines: [] }` on error
- `/api/operational/absence-statements`: Returns empty arrays on error
- `/api/operational/export-record`: Returns empty structure on error
- `/api/system/core-status`: Returns default booleans on error

### Neutral Responses

- No partial writes
- No error messages exposing internal state
- Truthful emptiness: empty arrays/objects indicate no data, not failure

## Onboarding Stability

### Incomplete State Forever

- If counterparty never confirms: system remains in `pending_acknowledgement` state
- No timeout mechanisms
- No auto-completion
- Valid incomplete state persists indefinitely

### Installation Confirmation

- Triggers when: first acknowledged thread exists, proof capsule exists, absence moment shown
- Records: "Operational recording is now active."
- One-time state: `workspace_installation_confirmed_at`

## Doctrine Compliance

### Text Constraints

- All user-visible text: ≤90 characters
- Factual statements only
- No metrics, percentages, or persuasion
- No internal identifiers exposed

### Surface Limits

- Situation: Answers "What currently requires reality to align?"
- Record: Answers "What actually happened?"
- Activity: Answers "What is waiting on the world?"
- Presence: Answers "How much the organization now depends on the record"
- Continuation: Appears only when reciprocal chain exists

## Verification

Run removal safety test:

```bash
npx tsx scripts/removal-safety-test.ts
```

Expected: All stages pass, uncertainty detected at removal stage.
