# Removal Test Checklist

Internal verification checklist for removal safety. DO NOT expose to users.

## Test Procedure

### Prerequisites

1. Test workspace ID: `00000000-0000-0000-0000-000000000000`
2. Database access configured
3. All migrations applied

### Stage 1: Create Record

- [ ] Create `shared_transaction` with `state = "pending_acknowledgement"`
- [ ] Verify thread exists in database
- [ ] Verify `external_ref` generated
- [ ] **Check:** No uncertainty statements yet

**Expected:** Thread created, pending acknowledgement.

### Stage 2: Confirm

- [ ] Call `acknowledgeSharedTransaction(threadId, "confirm")`
- [ ] Verify `state` changed to `"acknowledged"`
- [ ] Verify `acknowledged_at` timestamp set
- [ ] Verify orientation records created:
  - [ ] "Another party confirmed the outcome."
  - [ ] "The record is now complete."
  - [ ] "The outcome now exists independently of this conversation."
- [ ] **Check:** Completion confirmed, no uncertainty

**Expected:** Thread acknowledged, completion statements recorded.

### Stage 3: Create Dependency

- [ ] Create second `shared_transaction` (dependent thread)
- [ ] Call `recordOutcomeDependency` linking dependent → source
- [ ] Verify `outcome_dependencies` row created
- [ ] **Check:** Dependency recorded, no uncertainty yet

**Expected:** Dependency created, link established.

### Stage 4: Add Third Party

- [ ] Call `recordReciprocalEvent` with `actor_role = "downstream"`
- [ ] Verify `reciprocal_events` row created
- [ ] Verify orientation record: "Another party acted based on this record."
- [ ] **Check:** Third-party action recorded

**Expected:** Third-party event recorded, reliance detected.

### Stage 5: Add Amendment

- [ ] Call `recordThreadAmendment` with `amendment_type = "evidence_change"`
- [ ] Verify `thread_amendments` row created
- [ ] **Check:** Amendment recorded

**Expected:** Amendment recorded, auditability preserved.

### Stage 6: Export

- [ ] Call `/api/operational/export-record`
- [ ] Verify response structure:
  - [ ] `orientation`: array of statements
  - [ ] `continuation`: array of entries
  - [ ] `responsibilities`: array of responsibilities
  - [ ] `amendments`: array of amendments
  - [ ] `proof`: proof capsule or null
- [ ] **Check:** Export produces valid document

**Expected:** Valid export structure, all data present.

### Stage 7: Remove Record (Simulate)

- [ ] Query `orientation_records` for removal/absence statements
- [ ] Query for dependency/reliance statements
- [ ] Call `/api/operational/absence-statements`
- [ ] Verify `what_will_fail` contains statements
- [ ] Verify `what_becomes_uncertain` contains statements
- [ ] **Check:** Uncertainty detected

**Expected:** Uncertainty statements present, removal consequences visible.

## Verification Points

### Completion Requires External Confirmation

- [ ] No auto-completion mechanisms
- [ ] State remains `pending_acknowledgement` until counterparty confirms
- [ ] Idempotency: duplicate acknowledgement returns success without error

### Removal Creates Uncertainty

- [ ] `/api/operational/absence-statements` returns meaningful statements
- [ ] Statements reference actual dependencies
- [ ] Empty arrays only when no operational dependency exists

### Records Persist Across Time

- [ ] `thread_reference_memory` links created deterministically
- [ ] Later work attaches to existing threads
- [ ] Cross-day references detected

### Multi-Party Reliance Detectable

- [ ] Third-party events recorded
- [ ] Presence shows reliance lines
- [ ] Authority transfer detected

### Exportable History Exists

- [ ] Export endpoint never errors
- [ ] Valid JSON structure always returned
- [ ] Performance caps prevent runaway queries

### Payment Justification Exists

- [ ] `/api/operational/why-pay` returns factual lines
- [ ] Lines reference actual operational dependencies
- [ ] Empty array only when no dependency exists

## Data Integrity Checks

- [ ] Orientation records: No duplicates within 1-hour window
- [ ] Reciprocal events: Immutable once recorded
- [ ] Amendments: Append-only
- [ ] Dependencies: Never deleted, only resolved

## Performance Checks

- [ ] Record log: Limited to 80 entries
- [ ] Export: Threads capped at 1000
- [ ] Continuation: Capped per thread
- [ ] Queries: Deterministic ordering

## Error Handling

- [ ] All critical endpoints return neutral responses on error
- [ ] No partial writes
- [ ] No internal identifiers exposed
- [ ] Truthful emptiness (empty arrays, not errors)

## Success Criteria

All stages must pass AND uncertainty must be detected at removal stage.

If uncertainty is not detected, the system is not ready for launch.
