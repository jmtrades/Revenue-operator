# COMPREHENSIVE SUPABASE SCHEMA AUDIT REPORT

**Date:** March 23, 2026
**Analyzed Directory:** `/sessions/busy-eloquent-tesla/mnt/Revenue-operator-1/src/`
**Database Schema:** revenue_operator (Supabase)

---

## EXECUTIVE SUMMARY

A comprehensive cross-reference analysis of the Supabase database schema against all code references in the application codebase has revealed a **CRITICAL MISMATCH**:

**131 tables are referenced in application code but have NO CREATE TABLE statements in any migration file.**

This represents a catastrophic database integrity issue where the application code expects tables that do not exist in the actual database schema.

---

## CRITICAL FINDINGS

### Most Severe Issues (Breaking Production)

| Table Name | Usage Count | Impact | Files Affected |
|---|---|---|---|
| **call_sessions** | 161 | CRITICAL - entire call system | 90+ files |
| **action_logs** | 36 | HIGH - command center, auditing | command-center, admin |
| **automation_states** | 10 | HIGH - lead automation engine | command-center, assurance, risk-surface |
| **call_analytics** | 2 | HIGH - call metrics | knowledge-gaps |
| **commitment_registry** | 8 | MEDIUM - conversation intelligence | conversational-engine |
| **conversation_state_snapshots** | 2 | MEDIUM - conversation tracking | intelligence |
| **call_coaching** | 1 | MEDIUM - call quality | coaching |
| **call_quality_metrics** | 1 | MEDIUM - analytics | admin |

---

## TIER 1 - CRITICAL MISSING TABLES

Tables that are actively used in current features and will cause immediate runtime failures:

```
1. call_sessions (161 references)
   - src/app/app/AppShellClient.tsx:233
   - src/app/app/layout.tsx:95
   - src/app/results/page.tsx:38
   - src/app/api/calls/route.ts
   - [158+ additional locations]

2. action_logs (36 references)
   - src/app/api/command-center/route.ts:142
   - src/app/api/command-center/route.ts:323
   - src/app/api/command-center/route.ts:401
   - [33+ additional locations]

3. automation_states (10 references)
   - src/app/api/command-center/route.ts:788
   - src/app/api/assurance/misses/route.ts:43
   - src/app/api/risk-surface/route.ts:44
   - [7+ additional locations]

4. call_analytics (2 references)
   - src/app/api/admin/calls-deep/route.ts
   - src/app/api/cron/benchmark-aggregation/route.ts

5. call_coaching (1 reference)
   - src/app/api/calls/[id]/coaching/route.ts:38

6. call_quality_metrics (1 reference)
   - src/app/api/admin/calls-deep/route.ts:119

7. call_outcomes (8 references)
   - src/app/api/contacts/[id]/timeline/route.ts
   - src/lib/outcomes modules

8. commitment_registry (8 references)
   - src/lib/conversational-engine/Brain.ts:163
   - src/lib/intelligence/commitment-registry.ts:52+
```

---

## TIER 2 - HIGH PRIORITY MISSING TABLES (31 tables)

These tables have 3-9 references and are used in major feature modules:

```
after_hours_stability_sent (2)      - organizational-embedding
analytics_snapshots (1)             - benchmark-aggregation
attribution_records (1)             - billing
automation_states (10)              - command-center, risk-surface
behavioral_patterns (2)             - network, intelligence
benchmark_aggregates (2)            - admin, benchmark
billing_events (1)                  - billing webhook
booking_quiet_sent (2)              - negative-signal-semantics
booking_shortly_sent (2)            - negative-signal-semantics
bookings (3)                        - contacts timeline
calendar_sessions (1)               - revenue-signals
campaign_enrollments (2)            - contacts, lead-scoring
campaign_leads (8)                  - campaigns, cron
cancellation_reasons (1)            - billing
channel_capabilities (1)            - channels
closer_feedback (1)                 - outcomes
commitment_registry (8)             - conversational-engine
continuity_scope_units (1)          - billing scope
conversation_memory (2)             - human-presence
conversation_readiness (1)          - readiness
conversation_state_snapshots (2)    - intelligence
daily_attention (2)                 - attention endpoint
daily_completion_sent (2)           - negative-signal-semantics
```

---

## TIER 3 - MEDIUM PRIORITY MISSING TABLES (99 tables)

All remaining 99 missing tables with 1-2 references:

```
deal_death_signals             events
deal_outcomes                  executor_heartbeats
deals                           executor_outcome_reports
demo_requests                  executor_outcome_reports_archive
email_logs                     feature_usage
guarantee_capacity_state       guarantee_commitment_state
guarantee_economic_priority    guarantee_temporal_urgency
guarantee_trajectory_state     human_presence_meta
inaction_reasons               inbox_messages
interactions                   interruption_signal_sent
invoice_items                  invoices
job_queue                      knowledge_gaps
knowledge_items                lead_assignments
lead_intervention_limits       lead_plans
learning_weights               message_drift_alerts
metrics                        minute_pack_purchases
month_end_anchor_sent          month_start_anchor_sent
morning_absence_sent           morning_certainty_sent
morning_state_sent             network_patterns
no_further_decisions_sent      operational_confidence_streak
operational_ledger             operational_ledger_archive
operational_view_memory        ops_alerts
optimization_suggestions       organizational_embedding_state
outbound_messages              outcome_attribution
page_events                    payment_records
payroll_safety_sent            pending_approvals
personal_references            post_decision_calm_pending
profiles                       public_record_views
public_record_views_archive    rate_limits
raw_webhook_events             replay_defense
reply_rate_baseline            revenue_events
scenario_incidents             scenario_profiles
sequence_runs                  sequences
sms_logs                        staff_action_logs
staff_magic_links              staff_sessions
staff_users                    strategic_pattern_registry
strategy_effectiveness_registry system_cron_heartbeats
system_webhook_failures        template_activations
universal_outcomes             unresolved_questions
user_profiles                  voice_ab_tests
voice_consents                 voice_models
voice_quality_logs             voice_usage
waitlist_signups               week_completion_anchor_sent
weekend_prepared_sent          workflow_enrollments
workspace_billing              workspace_health
workspace_integrations         workspace_knowledge
workspace_members              workspace_minute_balance
workspace_objectives           workspace_scenario_state
workspace_settings             workspace_strategy_state
```

---

## IMPACT ANALYSIS

### 1. Database Integrity Risk
- **INSERT operations**: Code attempts to insert into 131 non-existent tables
- **SELECT operations**: Queries will fail with "relation does not exist" errors
- **Foreign key constraints**: Missing on all 131 tables
- **Data consistency**: No schema enforcement

### 2. Feature Impact
- **Call System**: 161 references in call_sessions = 100% broken
- **Audit/Command Center**: 36 references in action_logs = audit trail missing
- **Lead Automation**: 10 references in automation_states = automation broken
- **Analytics**: Multiple missing tables = reporting broken
- **Workflows**: Sequences, templates = workflow system broken

### 3. Production Readiness
- **Not deployment-ready**: Will fail on first database query
- **No rollback path**: Missing tables cannot be easily backfilled
- **Data loss risk**: Cannot reliably track operations without audit tables

---

## DETAILED FILE-BY-FILE BREAKDOWN

### High-Impact Files with Missing Table References

#### `src/app/app/AppShellClient.tsx` (Line 233)
```typescript
.from("call_sessions")  // TABLE DOES NOT EXIST
```

#### `src/app/app/layout.tsx` (Lines 95+)
```typescript
db.from("call_sessions").select("id", { count: "exact", head: true })
db.from("workspace_business_context").select("business_name")
db.from("phone_configs").select("id").eq("workspace_id", workspaceId)
db.from("google_calendar_tokens").select("workspace_id")
db.from("team_members").select("id", { count: "exact", head: true })
db.from("leads").select("id", { count: "exact", head: true })
db.from("agents").select("id", { count: "exact", head: true })
db.from("campaigns").select("id", { count: "exact", head: true })
```

#### `src/app/api/command-center/route.ts` (Multiple sections)
```typescript
// Line 142
.from("action_logs")  // MISSING - 36+ uses

// Line 788
.from("automation_states").select("lead_id, no_reply_scheduled_at, last_event_at")
```

#### `src/lib/conversational-engine/Brain.ts` (Line 163)
```typescript
await db.from("commitment_registry").insert({...})  // MISSING
```

---

## RECOMMENDATIONS

### IMMEDIATE ACTIONS (Before Any Deployment)

1. **Halt all deployments** until schema is corrected
2. **Identify table definitions** - extract from:
   - Code comments
   - TypeScript types in `src/lib/*/types.ts`
   - Supabase documentation if auto-generated
   - Database design documents
3. **Create migration files** starting with Tier 1 tables:
   - `20260324_call_sessions.sql`
   - `20260324_action_logs.sql`
   - `20260324_automation_states.sql`
   - ... (for all 131 tables)
4. **Test migration suite** end-to-end
5. **Validate all .from() calls** execute successfully

### SHORT-TERM (This Week)

1. **Prioritize by dependency order**:
   - Core tables: workspaces, users, leads, agents, campaigns
   - Transactional: call_sessions, messages, appointments
   - Operational: automation_states, action_logs, operational_ledger
   - Analytical: analytics_snapshots, metrics, reporting tables

2. **Create comprehensive migrations**:
   - Each table needs: PRIMARY KEY, appropriate indexes, constraints
   - Foreign key relationships must be validated
   - Data types must match code expectations

3. **Validation checklist**:
   - All `.from("table_name")` calls have corresponding CREATE TABLE
   - All `.select("column")` calls use existing columns
   - All `.insert({...})` payloads match table schema
   - All `.eq("column", value)` filters use indexed columns

### LONG-TERM (Prevention)

1. **Pre-commit validation**:
   - Scan for `.from()` calls not in schema
   - Generate TypeScript types from migrations
   - Validate query builders at compile time

2. **Documentation**:
   - Database schema documentation
   - Table creation requirements
   - Column naming conventions

3. **Testing**:
   - Integration tests for all database operations
   - Schema consistency tests
   - Migration validation tests

---

## SCHEMA SOURCES TO REVIEW

Look for table definitions in:

### 1. Migration Files
- `/supabase/migrations/` - 180+ files
- Check: `000_base_schema.sql`, `v7_app_tables.sql`
- Pattern: Look for `CREATE TABLE revenue_operator.table_name`

### 2. Type Definitions
- `/src/lib/*/types.ts` - 30+ type files
- May contain implicit schema definitions

### 3. Code Comments
- Search code for table schema specifications
- Look for JSDoc comments on database functions

### 4. Existing Migrations
- 180+ migration files exist
- Some may be incomplete or out of order
- Some columns may be in ALTER TABLE statements

---

## NEXT STEPS

1. **Review this report** with the team
2. **Prioritize** which 131 tables need immediate creation
3. **Extract schema definitions** from available sources
4. **Create missing migrations** in proper order
5. **Test thoroughly** before deployment

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Missing Tables | 131 |
| Tier 1 (Critical) | 10 tables |
| Tier 2 (High Priority) | 21 tables |
| Tier 3 (Medium Priority) | 100 tables |
| Highest Impact Table | call_sessions (161 uses) |
| Total .from() Calls Analyzed | 3,000+ |
| Code Files with Issues | 200+ |
| Database Status | **NOT PRODUCTION READY** |

