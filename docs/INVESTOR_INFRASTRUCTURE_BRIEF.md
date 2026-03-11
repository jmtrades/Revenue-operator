# Investor Infrastructure Brief

**Revenue Operator — Commercial Execution Infrastructure**

Institutional summary. No hype. Fact-based.

---

## Category creation

The product defines and occupies a category: **Commercial Execution Infrastructure**.

The product is an AI phone communication platform that handles inbound/outbound calls, lead capture, appointment booking, follow-up, analytics, and CRM integrations. Standard product terminology is used throughout.

---

## Deterministic execution moat

- All outbound messages originate from approved **message templates**. No freeform AI text is ever sent.
- All execution flows through **action_intents** (send_message, place_outbound_call, schedule_followup, escalate_to_human, collect_payment, generate_contract, request_disclosure_confirmation, record_verbal_consent). No direct Twilio, Stripe, or voice API calls from the core pipeline.
- Work unit state transitions are **allowed_states**-bound. No probabilistic or AI-invented state transitions.
- Pipeline is **replay-safe**: idempotent ingestion, deduplication keys, claim atomicity. Execution can be reconstructed and audited.

---

## Compliance moat

- **Compliance pack** is required before send. No execution path bypasses it. Required disclosures, forbidden phrases, and jurisdiction rules are applied deterministically.
- **Approval modes**: autopilot, preview_required, approval_required, jurisdiction_locked. When approval_required or jurisdiction_locked is set, send is blocked until human or policy permits.
- **Message policy** and **compliance pack** are resolved per workspace, domain type, jurisdiction, and channel. Enterprise can enforce dual approval and compliance officer override.

---

## Replayable audit trail moat

- Connector ingest is **append-only**. No mutation deletes historical records.
- Action intents, work units, and message archive support **deterministic ordering** and audit export. Enterprise audit route and export behavior are part of the contract.

---

## Jurisdiction lock moat

- **Jurisdiction_locked** mode overrides autopilot. Script and template enforcement can be locked per jurisdiction.
- Domain packs define **required disclosures per jurisdiction**, quiet hours, and consent rules. Cross-region regulatory matrices are supported for enterprise.

---

## Domain pack moat

- Industry coverage is implemented via **domain packs** (strategy graph, objection tree, disclosures, escalation triggers, risk_flags, quiet hours, verbal consent, cross-party confirmation). No AI improvisation; all behavior is defined in pack configuration.
- Presets exist for real estate, insurance, solar, legal, high-ticket sales, financial services. Pack completeness and required fields are enforced by tests.

---

## Execution-intent abstraction moat

- All external effects (SMS, email, voice, payment) go through **action_intents**. The core system never calls Twilio or payment APIs directly. Executors (cron, webhook, or internal services) claim and complete intents. This provides a single abstraction for durability, retries, and audit.

---

## Infrastructure positioning

- The system is described as **infrastructure** that businesses depend on for revenue continuity, not as a tool they operate. Positioning emphasizes: governed execution, compliance-aware execution, jurisdiction-locked execution, deterministic execution, commitment-confirming infrastructure, operational continuity layer.

---

## TAM framing

- **TAM**: All industries where calls or conversations produce revenue: real estate acquisition, insurance underwriting, solar qualification, legal intake, high-ticket sales, financial suitability, healthcare intake, B2B appointment setting, debt negotiation, contract renewal, retention recovery, multi-party negotiations, franchise multi-location. Each vertical has regulated communication and commitment capture; infrastructure that enforces compliance and replayability has direct value.

---

## Path to $100M ARR

- **Solo** ($297/mo) and **Growth** ($497/mo) establish credibility and category education; **Team** ($2,400/mo) and **Enterprise** (contract) drive ARR scale.
- Monetization is tied to **reliability of outcomes and governance**, not usage-based channels or seats. Annual commitment is preferred; positioning supports operational continuity and renewal stability.
- Enterprise expansion: jurisdiction lock, dual approval, audit export, multi-location isolation, contract reference enforcement, SLA hooks. Infrastructure is scoped per organization.

---

## Enterprise expansion strategy

- Enterprise features: jurisdiction-locked script enforcement, dual approval chain, compliance officer override, audit export with deterministic ordering, multi-location isolation, cross-region regulatory matrices, role-based approval control, enterprise feature overrides via JSON config, contract reference enforcement, SLA monitoring hooks.
- Startup validation and fail-fast if jurisdiction pack is incomplete. Enterprise configuration is validated at startup.

---

## Regulatory defensibility

- No freeform AI to customers. Template-only messaging and structured JSON from AI. Disclosures and consent are pack-defined and policy-enforced. Append-only records support regulator audit. Jurisdiction lock and approval modes support regulated industries (insurance, legal, financial, healthcare-safe intake).

---

## AI safety posture

- AI is used for **structured classification only** (intent, emotional signals, risk flags, suggested state transition). No AI-generated message text is sent. All customer-facing text comes from approved templates and compliance-aware compilation. This reduces reputational and regulatory risk from generative AI in customer communication.

---

**Canonical system spec:** `docs/SYSTEM_SPEC.md`  
**Category and positioning:** `docs/CATEGORY_AND_POSITIONING.md`  
**Commercial execution:** `docs/COMMERCIAL_EXECUTION_INFRASTRUCTURE.md`
