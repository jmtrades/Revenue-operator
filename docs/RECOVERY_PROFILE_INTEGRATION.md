# Recovery Profile Integration with Adaptive Follow-Up

## Overview

The Recovery Profile selector now drives actual execution behavior in the adaptive follow-up system. Users can select from three profiles (Conservative, Standard, Assertive) in the settings UI, and these profiles influence how aggressively the system pursues leads.

## Architecture

### Component Stack

1. **RecoveryProfileSelector** (`src/components/settings/RecoveryProfileSelector.tsx`)
   - User-facing UI component
   - Saves selection via PATCH to `/api/workspace/settings`
   - Stores as `recovery_profile` field in `settings` table

2. **Recovery Profile Library** (`src/lib/recovery-profile/index.ts`)
   - Type: `RecoveryProfile = "conservative" | "standard" | "assertive"`
   - `getRecoveryProfile(workspaceId)`: Async function to fetch from DB
   - `getRecoveryTimings(profile)`: Static timing constants per profile

3. **Adaptive Follow-Up Intelligence** (`src/lib/intelligence/adaptive-followup.ts`)
   - **NEW** `selectAdaptiveStrategy(intelligence, recoveryProfile?)`: Strategy selection with profile bias
   - **NEW** `buildAdaptiveFollowUpPlan(strategy, intelligence, recoveryProfile?)`: Plan building with delay multipliers
   - **NEW** `getDelayMultiplierForProfile(recoveryProfile?)`: Helper for profile-based delay adjustments

4. **Autonomous Executor** (`src/lib/intelligence/autonomous-executor.ts`)
   - **UPDATED** `scheduleFollowupAction()`: Now fetches recovery profile and passes to strategy functions

## How It Works

### Profile-Based Strategy Selection

The `selectAdaptiveStrategy()` function accepts an optional `recoveryProfile` parameter that biases strategy selection:

| Profile | Hot Lead (≥0.7 prob, ≥60 urgency) | Warm Lead (≥0.4 prob) | Cold Lead |
|---------|-----------------------------------|----------------------|-----------|
| **Conservative** | Scales down to `gentle_nurture` | Only proceeds if ≥0.6 prob | `value_drip` |
| **Standard** | `aggressive_nurture` (default) | `gentle_nurture` | `value_drip` |
| **Assertive** | `aggressive_nurture` | `gentle_nurture` | `value_drip` |

Safety rules (opt-out, anger, lifecycle phases) take absolute precedence over profile.

### Profile-Based Delay Multipliers

The `buildAdaptiveFollowUpPlan()` function adjusts step delays based on profile:

- **Conservative (1.5x)**: Stretches all delays by 50% for gentle pacing
  - Example: 60-min email becomes 90 minutes
  - 12-hour cooldown becomes 18 hours

- **Standard (1.0x)**: No adjustment (baseline behavior)
  - All delays remain unchanged

- **Assertive (0.7x)**: Compresses delays by 30% for faster cadence
  - Example: 60-min email becomes 42 minutes
  - 24-hour cooldown becomes 17 hours

**Applied to all strategies:**
- aggressive_nurture, gentle_nurture, value_drip
- reactivation_sequence, win_back, retention_loop
- appointment_protect (except hardcoded 1h_before condition)

## Usage Flow

### 1. User Selects Profile
```
UI: RecoveryProfileSelector
  ↓
POST /api/workspace/settings { recovery_profile: "assertive" }
  ↓
Database: settings.recovery_profile = "assertive"
```

### 2. Autonomous Executor Fetches Profile
```typescript
const recoveryProfile = await getRecoveryProfile(lead.workspace_id);
// Returns: "assertive" (or "standard" as default)
```

### 3. Profile Biases Strategy Selection
```typescript
const strategy = selectAdaptiveStrategy(intelligence, recoveryProfile);
// With assertive profile:
// - Hot leads → aggressive_nurture (same as standard)
// - Warm leads → gentle_nurture (same as standard)
// But delays will be compressed
```

### 4. Profile Adjusts Delays in Plan
```typescript
const plan = buildAdaptiveFollowUpPlan(strategy, intelligence, recoveryProfile);
// With aggressive_nurture + assertive profile:
// Steps have compressed delays (0.7x multiplier)
// Cooldown: 24h * 0.7 = 17h
```

## Backward Compatibility

Both functions accept optional `recoveryProfile` parameter:

```typescript
// Old code (no profile) still works:
selectAdaptiveStrategy(intelligence);                    // ✓ Works
buildAdaptiveFollowUpPlan("gentle_nurture", intelligence); // ✓ Works

// New code with profile:
selectAdaptiveStrategy(intelligence, "conservative");                    // ✓ Works
buildAdaptiveFollowUpPlan("gentle_nurture", intelligence, "conservative"); // ✓ Works
```

When profile is not provided, functions default to standard behavior (1.0x multiplier, no strategy bias).

## Real-World Examples

### Example 1: Conservative SaaS B2B

User Profile: Professional services firm selling to enterprises

**Settings:**
- Recovery Profile: Conservative
- Hot lead detected: conversion_probability = 0.75, urgency = 65

**Behavior:**
```
selectAdaptiveStrategy(intel, "conservative")
  → Returns "gentle_nurture" (scales down from aggressive_nurture)

buildAdaptiveFollowUpPlan("gentle_nurture", intel, "conservative")
  → Step 1: SMS immediately
  → Step 2: Email after 2160 minutes (36 hours, 1440 * 1.5)
  → Step 3: SMS after 6480 minutes (4.5 days, 4320 * 1.5)
  → Cooldown: 72 hours (48 * 1.5)
```

Result: Gentle, spaced-out follow-ups suitable for B2B environments where aggressive contact can backfire.

### Example 2: Assertive Inside Sales

User Profile: High-volume SaaS sales team

**Settings:**
- Recovery Profile: Assertive
- Warm lead detected: conversion_probability = 0.55, urgency = 40

**Behavior:**
```
selectAdaptiveStrategy(intel, "assertive")
  → Returns "gentle_nurture" (same as standard)

buildAdaptiveFollowUpPlan("gentle_nurture", intel, "assertive")
  → Step 1: SMS immediately
  → Step 2: Email after 1008 minutes (16.8 hours, 1440 * 0.7)
  → Step 3: SMS after 3024 minutes (2 days, 4320 * 0.7)
  → Cooldown: 34 hours (48 * 0.7)
```

Result: Fast cadence suitable for high-velocity inside sales where quick follow-ups drive conversions.

### Example 3: Standard (Default)

User Profile: Balanced approach

**Settings:**
- Recovery Profile: Standard (default)
- Same lead as Example 2: conversion_probability = 0.55

**Behavior:**
```
selectAdaptiveStrategy(intel, "standard")
  → Returns "gentle_nurture" (default behavior)

buildAdaptiveFollowUpPlan("gentle_nurture", intel, "standard")
  → Step 1: SMS immediately
  → Step 2: Email after 1440 minutes (24 hours, no multiplier)
  → Step 3: SMS after 4320 minutes (3 days, no multiplier)
  → Cooldown: 48 hours (no adjustment)
```

Result: Balanced follow-up rhythm suitable for most businesses.

## Testing

Comprehensive test suite in `__tests__/adaptive-followup-recovery-integration.test.ts` covers:

- ✓ Strategy selection bias per profile
- ✓ Delay multiplier calculation
- ✓ All strategies apply delays consistently
- ✓ Backward compatibility (optional parameter)
- ✓ Safety rules precedence
- ✓ Realistic business scenarios

**Run tests:**
```bash
npm test -- adaptive-followup-recovery-integration
```

## Database Schema

Existing field in `settings` table:
```sql
recovery_profile varchar(20) DEFAULT 'standard'
  -- Possible values: 'conservative', 'standard', 'assertive'
```

No migrations required; field already exists in schema.

## API Endpoints

### Update Recovery Profile
```http
PATCH /api/workspace/settings
Content-Type: application/json

{
  "recovery_profile": "assertive"
}
```

Response:
```json
{
  "workspace_id": "ws-123",
  "recovery_profile": "assertive",
  "updated_at": "2026-03-31T00:35:00Z"
}
```

### Fetch Current Profile
```http
GET /api/workspaces/[id]/settings
```

Response includes:
```json
{
  "recovery_profile": "assertive",
  ...
}
```

## Code Locations

| File | Change | Type |
|------|--------|------|
| `src/lib/intelligence/adaptive-followup.ts` | Added recovery profile parameter to strategy functions | Core logic |
| `src/lib/intelligence/autonomous-executor.ts` | Fetch and pass recovery profile to strategy functions | Integration |
| `__tests__/adaptive-followup-recovery-integration.test.ts` | Comprehensive test suite | Tests |
| `src/components/settings/RecoveryProfileSelector.tsx` | Already saves profile to settings API | UI (no changes) |
| `src/app/api/workspaces/[id]/settings/route.ts` | Already handles recovery_profile field | API (no changes) |

## Migration Notes

This is a **non-breaking, backward-compatible** implementation:

1. Existing calls to `selectAdaptiveStrategy()` and `buildAdaptiveFollowUpPlan()` continue to work unchanged
2. When recovery profile is not provided, functions default to standard behavior
3. No database migrations needed; `recovery_profile` field already exists
4. No API changes; existing `/api/workspace/settings` endpoint already accepts recovery_profile

## Future Enhancements

Potential areas for expansion:

1. **Profile Templates**: Save custom delay configurations per industry
2. **A/B Testing**: Compare effectiveness of profiles by conversion rate
3. **Dynamic Adjustment**: Auto-suggest profile based on team's conversion metrics
4. **Fine-Tuning**: Allow per-strategy multipliers instead of global multiplier
5. **Analytics Dashboard**: Show impact of profile selection on outcomes

## Troubleshooting

### Profile Not Applied
- Verify `recovery_profile` was saved in settings table
- Check workspace ID in autonomous executor
- Ensure `getRecoveryProfile()` is awaited properly

### Unexpected Delays
- Confirm multiplier: conservative = 1.5x, assertive = 0.7x
- Check for hardcoded conditions (e.g., appointment_protect's 1h_before)
- Verify `Math.round()` is applied to all delay_minutes values

### Tests Failing
- Run: `npm test -- adaptive-followup-recovery-integration`
- Ensure all 30 tests pass
- Check for profile parameter omission in function calls
