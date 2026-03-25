# Recall Touch — Implementation Brief V2 (for Cursor)

This document is the single source of truth for build order, data model, surfaces, and priorities. Follow it when adding or changing features.

---

## 1. PRODUCT SURFACES

### App Areas Required
- **Dashboard** (`/app/activity`) — Hero revenue metric, KPI cards, activity feed, minutes usage, quick actions
- **Agents** (`/app/agents`) — List, create, configure AI agents with industry templates
- **Agent Detail** (`/app/agents/[id]`) — Settings, voice, scripts, knowledge base, test call, performance stats
- **Calls** (`/app/calls`) — Call log with recordings, transcripts, AI summaries, disposition tracking
- **Leads/Contacts** (`/app/leads`) — Contact list, individual contact timeline, AI memory, tags, lifecycle stage
- **Inbox** (`/app/inbox`) — Unified omnichannel inbox (voice transcripts, SMS threads, email)
- **Campaigns** (`/app/campaigns`) — Create/manage follow-up sequences and outbound campaigns
- **Appointments** (`/app/appointments`) — Calendar view, upcoming appointments, no-show tracking, reminders
- **Analytics** (`/app/analytics`) — Revenue attribution, call metrics, follow-up performance, booking rates, response times
- **Knowledge Base** (`/app/knowledge`) — Business info, FAQ, scripts, guardrails, "never say" rules
- **Settings Hub** (`/app/settings`) — Phone, billing, team, integrations, compliance, general
- **Phone Settings** (`/app/settings/phone`) — Number management, marketplace, forwarding, test calls
- **Billing** (`/app/settings/billing`) — Plan management, usage, invoices, upgrade/downgrade
- **Team** (`/app/settings/team`) — Members, roles, invitations, permissions
- **Integrations** (`/app/settings/integrations`) — CRM connections, calendar sync, webhooks, Zapier
- **Onboarding** (`/app/onboarding`) — Multi-step wizard: industry → business info → agent setup → phone → test call → live

### Public Pages Required
- Homepage (`/`), Product (`/product`), Pricing (`/pricing`)
- Industry pages (`/industries/[slug]`) — dental, hvac, legal, med-spa, real-estate, roofing
- Demo (`/demo`), Contact (`/contact`), Blog (`/blog`), Documentation (`/docs`)
- Privacy (`/privacy`), Terms (`/terms`)
- Comparison pages (`/compare/[competitor]`)

---

## 2. CORE DATA MODEL (Target)

- **users** — id, email, name, avatar_url, auth_provider, created_at, updated_at
- **workspaces** — id, name, slug, owner_id, billing_status, billing_tier, stripe_customer_id, stripe_subscription_id, onboarding_completed_at, industry, mode (business|sales|solo)
- **workspace_members** — id, workspace_id, user_id, role (owner|admin|member), invited_at, joined_at
- **workspace_invites** — id, workspace_id, email, role, invited_by, created_at, accepted_at
- **contacts** — id, workspace_id, name, phone, email, tags[], lifecycle_stage, source, external_id, total_value_cents, first_contact_at, last_contact_at, ai_summary, metadata
- **conversations** — id, workspace_id, contact_id, channel (voice|sms|email|webchat), status, assigned_to, created_at, updated_at, ai_summary
- **messages** — id, conversation_id, direction, channel, content, media_url, sent_at, delivered_at, read_at, ai_generated
- **call_sessions** — id, workspace_id, agent_id, contact_id, lead_id, direction, provider, phone_from, phone_to, call_started_at, call_ended_at, duration_seconds, recording_url, transcript, ai_summary, disposition, sentiment, cost_cents, metadata
- **agents** — id, workspace_id, name, template, purpose, personality, voice_id, greeting, knowledge_base, rules, conversation_flow, is_active, vapi_agent_id, tested_at, created_at, updated_at
- **follow_up_sequences** — id, workspace_id, name, trigger_type (missed_call|new_lead|no_show|quote_sent|dormant_contact), is_active, created_at
- **sequence_steps** — id, sequence_id, step_order, channel, delay_minutes, template_content, conditions
- **sequence_enrollments** — id, sequence_id, contact_id, status, current_step, enrolled_at, completed_at
- **appointments** — id, workspace_id, contact_id, agent_id, service_type, scheduled_at, duration_minutes, status, reminder_sent_at, confirmation_sent_at, calendar_event_id, notes, created_at
- **campaigns** — id, workspace_id, name, type, target_segment, status, started_at, completed_at, stats
- **campaign_contacts** — id, campaign_id, contact_id, status, contacted_at
- **phone_numbers** — id, workspace_id, phone_number, friendly_name, number_type, status, provider_sid, monthly_cost_cents, setup_fee_cents, capabilities, assigned_agent_id, last_billed_at, created_at
- **usage_records** — id, workspace_id, type, quantity, unit_cost_cents, total_cost_cents, recorded_at, billing_period
- **billing_events** — id, workspace_id, event_type, stripe_event_id, amount_cents, metadata, created_at
- **daily_metrics** — id, workspace_id, date, calls_answered, calls_missed, appointments_booked, no_shows, no_shows_recovered, follow_ups_sent, leads_captured, revenue_estimated_cents, response_time_avg_seconds
- **industry_templates** — id, industry_slug, name, description, default_greeting, default_scripts, default_faq, default_follow_up_cadence, recommended_features, created_at

---

## 3. BACKEND REQUIREMENTS

- Workflow engine: event-driven (missed_call, new_lead, no_show, quote_sent, appointment_created, contact_dormant); step executor with delay scheduling; channel orchestrator (Twilio voice/SMS, SendGrid email); enrollment manager with deduplication, opt-outs, max frequency.
- Scheduling engine: calendar sync (Google, Outlook), availability calculator, booking handler, reminder chain (24h → 2h → 30min).
- Event processing: real-time event bus, webhook delivery, event replay, dead letter queue.
- Conversation memory: per-contact memory, AI summaries after interactions, memory retrieval during calls.
- Lead scoring / priority layer: rule-based then ML-based; priority queue for follow-up.
- Analytics aggregation: daily rollup, revenue estimation, real-time dashboard counters.
- Billing meter events: track voice minutes, SMS, outbound calls; threshold alerts 80%/100%; overage and Stripe invoice items.
- RBAC: workspace roles owner/admin/member; permission matrix; audit log for sensitive actions.
- Observability: structured logging, error context, performance metrics, per-workspace cost attribution.

---

## 4. FRONTEND REQUIREMENTS

- Onboarding wizard: progressive multi-step (7 steps), industry selection loads template, phone provisioning inline, live test call, completion = "first AI employee" feel.
- Mode selector: Business / Sales Team / Solo during onboarding; affects dashboard, metrics, prompts.
- Inbox: three-column (conversation list | thread | contact card), channel indicators, AI summary per conversation, quick actions (reply, call, book, add to sequence, assign).
- Contact timeline: chronological feed, event-type icons, expandable recordings, AI "What we know" card.
- Workflow builder (Growth+): visual canvas, trigger/delay/SMS/email/call/condition/webhook nodes, branching, preview, templates.
- Campaign builder: name + type → audience (filter by tags, lifecycle, last contact) → message sequence → review and launch; dashboard for sent/delivered/responded/converted/opted out.
- Analytics dashboard: hero Revenue Impact, KPI cards (Calls Answered, Appointments Booked, Follow-Ups Executed, No-Shows Recovered, Response Time), charts (volume, booking rate, revenue trend), tables (top leads, recent calls, campaign performance), filters (date, agent, channel, campaign).
- Billing/usage UI: current plan + usage bar, upgrade prompt, usage breakdown, invoice history, Stripe portal, plan comparison.
- Team UI: member list with roles, invite flow (email → role → send), role management, remove with confirmation.
- Integrations hub: cards per integration (Google Calendar, HubSpot, Salesforce, webhooks), status, OAuth connect, webhook URL + signing + test.

---

## 5. BILLING / PRICING LOGIC

- Plans: solo ($49/mo, 100 min, 1 agent, 50 SMS), starter ($297/mo, 400 min, 1 agent, 100 SMS, 50 outbound), growth ($497/mo, 2000 min, 3 agents, 1000 SMS, 500 outbound), pro ($2997/mo, 10000 min, unlimited agents), enterprise (custom). **Codebase tier names:** solo, growth, team, enterprise (see `src/lib/feature-gate/types.ts` and `src/lib/stripe-prices.ts`). Map starter→solo or add starter; team→pro for display as needed.
- Overage: voice at plan rate; SMS hard limit or add-on pack; outbound = 2x voice for billing.
- Add-ons: SMS pack, voice minutes pack, custom number, workflow automation, API access, priority support, white-label.
- Seat/location: per-plan agent limits, additional numbers, per-location billing optional.
- Free trial: 14 days, Pro-level features, auto-convert on day 15 if payment method on file.
- Stripe: one Product per tier, recurring Prices (monthly/annual), webhooks (invoice.payment_succeeded, invoice.payment_failed, customer.subscription.updated/deleted), billing portal, metered usage for overage.
- Upgrade: immediate, prorated. Downgrade: next cycle. Cancellation: access until end of period.

---

## 6. ANALYTICS / KPI REQUIREMENTS

- Response speed: avg response time, by channel, first response SLA, by time of day, by agent.
- Appointments: total booked, appointment rate, value, by channel/agent/campaign, show rate.
- No-show recovery: no-shows, rate, recovered count, recovery rate, recovery revenue.
- Reactivation: inactive count, campaigns sent, reactivated count, rate, revenue.
- Revenue influenced: total, by campaign/agent/channel, deal closed, deal size, win rate, cost per win, pipeline value.
- Pipeline: stage breakdown, stage duration, conversion, bottlenecks, velocity, forecast, at-risk.
- Usage: voice minutes, SMS, outbound, API, contacts, workflows, campaigns, peak times, forecast.
- Churn risk: usage decline, payment issues, no login, NPS, risk score, at-risk list.
- Agent performance: calls handled, duration, conversion, SMS response rate, quality score, booking rate, escalation, leaderboard.
- Campaign performance: target/sent/delivery/response/conversion rates, revenue, cost per conversion, A/B results, unsubscribe/spam.
- Dashboard structure: hero metric, 4 KPI cards, charts (volume, booking rate, revenue, stage), tables (leads, calls, campaigns, agents), filters, export.

---

## 7. INFRASTRUCTURE / COST-CONTROL

- Usage metering: event types (voice_call_started/ended, sms_sent, outbound, api_request, workflow_executed), per-tenant, idempotent, real-time buffer, daily reconciliation.
- Per-feature cost attribution: voice inbound/outbound, SMS, API, workflow, storage, transcription; cost_breakdown table; margin calculation.
- Caching: Redis for contacts/campaigns/workflows/session/rate limit/analytics; invalidation on update; fallback to DB.
- Batching: outbound SMS, recording processing, webhooks, report generation, usage sync to Stripe; job queue with retry and dead letter.
- Vendor abstraction: SMS (Twilio, SNS, Bandwidth), voice (Twilio, Connect, Vonage), transcription, LLM; adapter pattern; failover.
- Failure handling: voice/SMS retry, API timeout + cache, DB reconnect, payment failure + dunning, circuit breakers, graceful degradation.
- Cost alerts: daily cost, 80%/100% usage, overage, spend cap, spike detection, margin warning, underutilization.
- Margin protection: dynamic pricing floor, usage cap 125%, concurrency limits, cost review, profitability scoring.

---

## 8. ROLLOUT ORDER (Phases 1–6)

### Phase 1 (Week 1–2): Foundation
- Tables: accounts/users, contacts, calls, usage_meter.
- APIs: auth signup/login/me, account, contacts CRUD, calls list/log.
- UI: signup, login, dashboard (greeting, plan, call count), contacts table, calls table, settings/account.
- Features: JWT auth, Stripe subscription on signup, Twilio number provisioning, inbound call routing, basic transcription, contact CRUD, dashboard stats.
- Success: sign up, get number, make/receive calls, calls logged, 14-day trial works.

### Phase 2 (Week 3–4): Core Workflows
- Tables: contacts_tags, tags, workflows, workflow_runs, sms.
- APIs: workflows CRUD, execute, SMS send, SMS list, contacts tags, search.
- UI: workflows list/editor, contact detail (history, tags, call/SMS), SMS history, templates library.
- Features: workflow builder (trigger/delay/SMS/call/condition), execution engine, SMS via Twilio, contact tags, workflow templates, delivery tracking.
- Success: create workflows, execute, send SMS, tag and search contacts.

### Phase 3 (Month 2): Campaigns & Analytics
- Tables: campaigns, campaign_messages, campaign_results, analytics_daily.
- APIs: campaigns CRUD, results, analytics dashboard/KPIs, export.
- UI: campaigns list/create, campaign create wizard, analytics dashboard, campaign/agent analytics, export.
- Features: campaign builder (audience, sequence), segmentation, tracking, KPI dashboard, usage metering, revenue attribution, charts.
- Success: create/launch campaigns, track performance, dashboard shows KPIs, usage accurate.

### Phase 4 (Month 3): Integrations & Advanced
- Tables: integrations, team_members, billing_events.
- APIs: integrations OAuth/list/delete, team invite/list/update/remove, billing usage/upgrade/invoices.
- UI: integrations hub, connect flows, team list/invite/roles, billing usage/upgrade/invoices.
- Features: HubSpot/Salesforce sync, Google Calendar, webhooks, team roles, advanced workflow conditions, usage breakdown, plan upgrade.
- Success: CRM sync, team management, webhooks, billing UI, upgrades work.

### Phase 5 (Month 4–6): Scale & Optimization
- Tables: phone_numbers (multi), workflow_templates, cost_breakdown, churn_risk_score.
- APIs: phone-numbers CRUD, workflow-templates, analytics cost/churn-risk, cost-alerts.
- UI: settings/phone-numbers, workflow templates library, analytics cost/churn-risk, settings cost-guardrails.
- Features: multi-number, template library, cost breakdown, churn scoring, spend caps, cost forecast, agent coaching.
- Success: multi-number tested, 20+ templates, cost analytics, churn model.

### Phase 6 (Month 7–12): Enterprise & White-Label
- Tables: white_label_config, sub_accounts, audit_logs, sso_config, custom_integrations.
- APIs: white-label config, sub-accounts CRUD, audit-logs, SSO configure, API keys.
- UI: white-label, sub-accounts, SSO, API keys, audit logs, reseller analytics.
- Features: white-label branding, agency sub-accounts, SSO, API access, audit log, RBAC, SLA, custom webhooks, data export, 2FA, compliance.
- Success: white-label live, agencies manage sub-accounts, SSO and API working, audit comprehensive.

---

## 9. DESIGN DIRECTION

- Primary CTA: #2563EB (blue) per brief; project rules override to **white primary** (bg-white text-black) for main CTAs.
- Success #10B981, Warning #F59E0B, Danger #EF4444.
- Typography: Inter, H1 32px/700, H2 24px/600, H3 18px/600, body 14–16px/400.
- Buttons: primary 8px/16px padding, 6px radius; secondary border #E5E7EB; loading = spinner.
- Inputs: border 1px #E5E7EB, 8px padding, 6px radius; focus ring.
- Cards: white (or dark surface), border, 8px radius, 16px padding.
- Dark mode: bg #0F172A, surface #1E293B, text #F1F5F9 / #CBD5E1.
- Icons: Heroicons/Feather, 16/20/24px.
- Spacing: 4px base (4,8,12,16,24,32,40,48,64).
- Animations: 150ms hover, 200ms modal, 300ms page; respect prefers-reduced-motion.
- Empty: icon + heading + subheading + CTA. Loading: skeleton matching layout. Error: message + Retry + Go back. Success: toast or inline check.

---

## 10. BUILD PRIORITIES (Order)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Authentication (signup/login/JWT) | M | 10 |
| 2 | Twilio (number, call recording) | L | 10 |
| 3 | Calls table & logging | M | 9 |
| 4 | Contacts (CRUD, search, tags) | M | 9 |
| 5 | Stripe subscription | L | 9 |
| 6 | SMS sending (Twilio) | M | 8 |
| 7 | Workflow engine | XL | 9 |
| 8 | Analytics dashboard (KPIs, charts) | L | 8 |
| 9 | Campaign builder | L | 8 |
| 10 | Usage metering & billing accuracy | M | 8 |
| 11 | Call transcription | M | 7 |
| 12 | HubSpot integration | L | 7 |
| 13 | Free trial logic | M | 7 |
| 14 | Dashboard design | M | 7 |
| 15 | Settings/account | S | 6 |
| 16 | Email notifications | M | 6 |
| 17 | Team management | M | 6 |
| 18 | Multi-phone-number | M | 6 |
| 19 | Workflow templates | M | 6 |
| 20 | Dark mode | S | 5 |

**Critical path:** Auth → Twilio → Calls + Contacts → Stripe → Workflows → Campaigns + Analytics.

---

*When implementing, prefer this order: Phase 1 → Phase 2 → … → Phase 6, and within each phase follow the Build Priorities table. Resolve conflicts with existing .cursorrules (e.g. dark-only, white primary CTAs) by applying project rules.*
