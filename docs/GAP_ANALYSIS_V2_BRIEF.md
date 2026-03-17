# Gap Analysis: Implementation Brief V2 vs Codebase

Generated from **docs/IMPLEMENTATION-BRIEF-V2.md** and **docs/MASTER-STRATEGY-V2.md**. Execute in phase order.

---

## Surfaces

| Required | Status | Notes |
|----------|--------|------|
| /app/activity | OK | Exists; KPIRow, StatCard, estRevenue |
| /app/agents, /app/agents/[id] | OK | Exists |
| /app/calls, /app/calls/[id] | OK | Exists |
| /app/leads | OK | Exists (brief says Contacts; we use Leads) |
| /app/inbox | OK | Exists |
| /app/campaigns | OK | Exists |
| /app/appointments | OK | Exists |
| /app/analytics | OK | Exists |
| /app/knowledge | OK | Exists |
| /app/settings (phone, billing, team, integrations) | OK | Exists |
| /app/onboarding | OK | Exists |
| /, /product, /pricing, /industries/[slug], /demo, /contact, /blog, /docs, /privacy, /terms | OK | Exist |
| /compare/[competitor] | GAP | Add route + sitemap entry |

---

## Data Model (Brief Section 2)

| Table | Status | Notes |
|-------|--------|------|
| users, workspaces, workspace_members, workspace_invites | OK | Exist (invites schema may differ; launch migration adds revenue_operator.workspace_invites) |
| contacts | Partial | We use **leads**; same concept, different name. Keep leads. |
| conversations, messages | Partial | messages exists (lead_id); conversations may be thread-based elsewhere |
| call_sessions | Partial | call_assets / call_outcomes / call_analysis; align naming if needed |
| agents, campaigns, appointments | OK | v7_app_tables |
| follow_up_sequences, sequence_steps, sequence_enrollments | GAP | No tables; add migration for Phase 2/3 workflow sequences |
| phone_numbers, usage_records, billing_events | OK | phone_numbers, economic_usage_meter / billing_exports; billing_events may be Stripe-only |
| daily_metrics | GAP | No table; add for analytics rollup (Section 6) |
| industry_templates | GAP | No table; optional for industry packs |

---

## Billing / Pricing

| Brief | Code | Action |
|-------|------|--------|
| solo $49, starter $297, growth $497, pro $2997, enterprise custom | solo, growth, team, enterprise (stripe-prices.ts) | Brief uses starter/pro; code uses team. Document mapping: starter→solo or add starter; team→pro for display. No code change required if product uses solo/growth/team. |
| Overage, trial 14d, Stripe webhooks, portal | OK | Implemented |

---

## Backend (Brief Section 3)

| Requirement | Status |
|-------------|--------|
| Workflow engine (event-driven, step executor, channel orchestrator) | Partial (execution plan, state machine, templates) |
| Scheduling engine (calendar, availability, booking, reminders) | Partial (calendar, call_assets) |
| Event processing, webhooks, DLQ | OK (webhook events, connectors) |
| Conversation memory, lead scoring | Partial (lead_memory, readiness) |
| Analytics aggregation (daily rollup) | GAP (no daily_metrics table/job) |
| Billing meter events, RBAC, observability | OK |

---

## Frontend (Brief Section 4)

| Requirement | Status |
|-------------|--------|
| Onboarding wizard (multi-step, industry, phone, test call) | OK (onboarding steps) |
| Mode selector (Business/Sales/Solo) | Partial (use_modes, scenario_profiles) |
| Inbox three-column, contact timeline, workflow builder, campaign builder | OK or partial |
| Analytics dashboard (hero, KPIs, charts, tables, filters) | OK (activity + analytics) |
| Billing/usage UI, team UI, integrations hub | OK |

---

## Rollout Order (Phases 1–6)

- **Phase 1:** Done (auth, Twilio, calls, contacts/leads, Stripe, dashboard, settings).
- **Phase 2:** Workflow execution exists; sequence tables (follow_up_sequences, etc.) missing — add for clarity.
- **Phase 3:** Campaigns + analytics exist; daily_metrics missing for rollup.
- **Phase 4–6:** Integrations, team, billing, multi-number exist; enterprise/white-label partial.

---

## Build Priorities (Brief Section 10)

Items 1–6 (Auth, Twilio, Calls, Contacts, Stripe, SMS): Done.  
Items 7–10 (Workflow engine, Analytics, Campaign builder, Usage metering): Partial; improve incrementally.  
Items 11–20: Follow as needed; dark mode and design already aligned.

---

## Recommended Implementation Order

1. **Add /compare/[competitor]** — Route + sitemap for comparison pages (e.g. vs Smith.ai, Ruby).
2. **Add migration: daily_metrics** — For analytics rollup and Section 6 KPIs.
3. **Add migration: follow_up_sequences, sequence_steps, sequence_enrollments** — For brief Section 2 and Phase 2/3.
4. **Optional: industry_templates table** — If building industry packs per brief.
5. **Document tier mapping** — starter/pro vs solo/team in IMPLEMENTATION-BRIEF-V2.md or PRICING so brief and code are aligned.

After these, continue with Phase 5–6 items (cost breakdown, churn risk, white-label) as needed.
