# Recall Touch — Master Strategy & Implementation Brief V3

This file mirrors the \"Master Strategy & Implementation Brief V3\" provided by the owner. It is the **top-level product and implementation contract**. When in doubt, follow V3 over earlier versions.

---

## 1. Strategy (Sections 1–25)

V3 affirms and expands the existing doctrine:

- **Category:** Revenue Execution OS (Section 2) — \"The AI Revenue Execution System\" with secondary lines: \"Every call answered. Every follow-up executed. Every opportunity captured.\"
- **Positioning:** Execution layer between existing tools and revenue; not CRM, not phone system, not chatbot, not generic AI assistant.
- **ICP hierarchy (Section 4):**
  - Tier 1 (first 6 months): home services (HVAC, plumbing, roofing, electrical, restoration), dental/medical practices, legal intake.
  - Tier 2 (6–12 months): med spas, real estate, agencies/resellers.
  - Tier 3 (12–24 months): multi‑location/franchise, solo/prosumer.
- **Competitors and differentiation (Section 5):**
  - Direct: Smith.ai, Ruby, Goodcall, Slang.ai, Synthflow, Air AI, Vapi, etc.
  - Adjacent: GoHighLevel, Podium, ServiceTitan/Housecall/Jobber, HubSpot/Salesforce, Calendly.
  - Differentiator: AI that **executes**, vertical intelligence, and revenue attribution (\"This month Recall Touch answered 127 calls you would have missed, booked 34 appointments, recovered 8 no‑shows, reactivated 12 past clients. Est. revenue: $47,800\").
- **Product diagnosis (Section 6):** V3 lists the highest-impact current gaps (vertical focus, quantified pain, revenue hero metric, vertical onboarding, social proof, pricing clarity, premium perception, habit loops, differentiation, pricing transparency) and ranks the top 10 fixes.
- **Modes (Section 9):** One codebase, three modes:
  - Business Mode (default, service businesses).
  - Sales Mode (setters/closers/manager workspaces).
  - Solo Mode (personal follow-up engine).
  Each mode changes onboarding defaults, dashboard layout, and templates.
- **Systems:** Solo system (Section 10), High-ticket Sales system (Section 11), Business/Service system (Section 12).
- **Website & brand (Section 13):** Homepage, value pillars, ROI calculator, nav structure, trust, messaging, visual design.
- **UI/UX & IA (Section 14):** FTU flow, dashboard, inbox, contacts, calls, sequences, campaigns, appointments, analytics, settings.
- **Monetization & unit economics (Sections 15–17):** Tier structure, add‑ons, ARPU/margin, CAC/LTV per segment, expansion paths, $100M ARR math.
- **Growth (Section 18):** 0–3 months (founder‑led), 3–12 months (content + agency + affiliate), 12–24 months (international + marketplace + enterprise), fastest path to $1M ARR.
- **Retention & moat (Sections 19–21):** Habit loops, embeddedness, switching costs, at‑risk signals & playbooks, win‑back flows, NRR targets, real vs fake moats, 12/36‑month moat plans.
- **What not to build (Section 22):** No full CRM, no email platform, no social manager, no website builder, no generic chatbot, no free tier, solo not primary, etc.
- **Roadmap (Sections 23–23):** 30‑day, 90‑day, 12‑month, 24‑month roadmaps; \"must build now\" vs \"never build unless forced\".
- **Acquisition attractiveness (Section 24):** Buyer categories, metrics for strategic vs replaceable, target metrics and valuation.
- **Final decision stack (Section 25):** Single best category/wedge/positioning/pricing structure/priority/mistake to avoid/moat move/path to $100M+/9‑figure acquisition/exact product shape.

This strategy supersedes V2; earlier docs remain for history but V3 is authoritative.

---

## 2. Implementation Brief (Cursor focus)

Sections 1–10 of the \"Implementation Brief for Cursor\" in V3 align closely with the existing `docs/IMPLEMENTATION-BRIEF-V2.md`. Key confirmations/changes:

- **Product surfaces (Section 1):** Same surfaces as V2 (Dashboard, Agents, Calls, Leads/Contacts, Inbox, Campaigns, Appointments, Analytics, Knowledge, Settings, Phone, Billing, Team, Integrations, Onboarding). Public pages also include `/compare/[competitor]` (already implemented).
- **Core data model (Section 2):** Confirms tables we have or recently added via migrations:
  - `workspaces`, `workspace_members`, `workspace_invites`.
  - `leads` as the concrete implementation of \"contacts\" (mapping preserved).
  - `agents`, `campaigns`, `appointments`, `messages`.
  - `phone_numbers`, `phone_configs`, usage/billing tables.
  - `follow_up_sequences`, `sequence_steps`, `sequence_enrollments`, `daily_metrics`, `industry_templates` (added in V2.5 migrations).
- **Backend/system requirements (Section 3):** Confirms the need for:
  - Event‑driven workflow engine (decision/plans layer already exists).
  - Scheduling engine (calendar sync, booking, reminders).
  - Event processing/webhooks/DLQ.
  - Conversation memory, lead scoring, analytics aggregation, billing meter events, RBAC, observability.
- **Frontend/UX (Section 4):** Emphasizes:
  - Onboarding wizard (multi‑step, industry‑first).
  - Mode selector (Business/Sales/Solo).
  - Three‑column inbox, contact timeline, workflow/campaign builders, analytics dashboard, billing/usage UI, team and integrations hubs.
- **Billing/pricing logic (Section 5):** Provides explicit plan objects (solo/starter/growth/scale). Our code currently uses `solo/growth/team/enterprise`—V3 clarifies naming, not core logic, and can be mapped.
- **Analytics/KPIs (Section 6):** Same KPI set as V2 (hero revenue impact, core call/appointment/follow‑up/no‑show/reactivation/usage/NRR metrics), tied to `daily_metrics`.
- **Infrastructure/cost control (Section 7):** Same principles as V2: metering, cost attribution, caching, batching, async jobs, vendor abstraction, failure handling, cost alerts.
- **Rollout order (Section 8):** Consolidates Phase 1–5 from V2, with the same critical path:
  - AI phone + provisioning + onboarding + dashboard + SMS → follow‑up engine + calendar/appointments/no‑show + templates → outbound, CRM, campaigns, analytics, agency system → workflow builder, multi‑location, white‑label, reactivation, API, lead scoring, SSO → optimization (custom pipeline, predictive analytics, benchmarks, extra integrations, compliance).
- **Design direction (Section 9):** Mirrors V2 design constraints (dark, premium, operational, high‑trust, outcome‑first).
- **Build priorities (Section 10):** Re‑orders V2 priorities into a stricter, explicit top‑10 list (AI phone reliability, onboarding, revenue dashboard, SMS missed‑call follow‑up, booking, templates, follow‑up engine, no‑show, CRM sync, agency system).

Use this V3 file together with:

- `docs/IMPLEMENTATION-BRIEF-V2.md` (detailed tables and rollout structure).
- `docs/GAP_ANALYSIS_V2_BRIEF.md` (what is already in the codebase vs missing).

V3 is **strategy + priorities**; V2 is detailed implementation scaffolding. When they diverge, obey V3’s intent and keep V2’s structure unless the owner directs specific refactors.

