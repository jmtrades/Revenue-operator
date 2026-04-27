/**
 * AI voice-agent competitor data for /compare/[competitor] dynamic pages.
 *
 * Phase 92 — buyers comparing AI phone agents Google "Vapi vs X,"
 * "Bland AI vs X," "Retell vs X" — and we weren't surfacing for those
 * searches. This file fronts the dynamic comparison template so each new
 * competitor is a single config entry, not a new bespoke page.
 *
 * Editorial note on tone: every competitor row pair must be defensibly
 * accurate at time of writing. Where we make a "we have it / they don't"
 * claim, the claim is grounded in either (a) a phase shipped in this
 * codebase, or (b) the competitor's public docs/pricing as of the date
 * stamped on the page. We don't make negative claims we can't defend —
 * better to leave a row out than risk a takedown.
 *
 * Bespoke pages already exist for: smith-ai, ruby, gohighlevel,
 * hiring-receptionist. This file covers the four direct AI-voice-agent
 * competitors that bespoke pages don't.
 */

export interface ComparisonRow {
  feature: string;
  ours: boolean;
  theirs: boolean;
  note?: string;
}

export interface AiCompetitor {
  /** URL slug — must be lowercase, hyphenated. */
  slug: string;
  /** Display name — used in copy ("vs Vapi"). */
  name: string;
  /** One-line positioning description of the competitor — neutral, accurate. */
  positioning: string;
  /** Their public pricing reference URL (for the as-of disclaimer). */
  pricingUrl: string;
  /** 2–3 sentence editorial hook for the page hero. Honest, not flame. */
  hook: string;
  /** Three positioning bullets contrasting our approach with theirs. */
  contrastBullets: string[];
  /** Feature matrix rows. */
  rows: ComparisonRow[];
}

export const AI_COMPETITORS: AiCompetitor[] = [
  {
    slug: "vapi",
    name: "Vapi",
    positioning:
      "Developer-first AI voice infrastructure. SDKs, function-calling, and TTS pipelines for engineering teams to assemble their own agent.",
    pricingUrl: "https://vapi.ai/pricing",
    hook: "Vapi is voice infrastructure for engineers building their own agent. Revenue Operator is the agent built — fully wired with compliance, integrations, dashboards, and a non-technical configuration surface so a service-business owner ships in 5 minutes, not 5 weeks.",
    contrastBullets: [
      "Vapi gives you primitives. Revenue Operator gives you outcomes.",
      "TCPA + DNC + two-party recording compliance is shipped, not your problem.",
      "Configure scripts, FAQs, and follow-ups in plain English — no code, no engineering team needed.",
    ],
    rows: [
      { feature: "AI voice answering (24/7)", ours: true, theirs: true },
      { feature: "Out-of-the-box compliance (TCPA, DNC, two-party recording)", ours: true, theirs: false, note: "Vapi is infrastructure — compliance is the integrator's responsibility." },
      { feature: "Plain-English agent configuration (no code)", ours: true, theirs: false, note: "Vapi requires JS/TS configuration." },
      { feature: "Built-in CRM write-back (HubSpot, Salesforce, Pipedrive)", ours: true, theirs: false, note: "Vapi expects you to wire your own CRM via webhooks/functions." },
      { feature: "Built-in calendar integration", ours: true, theirs: false },
      { feature: "Outbound campaigns + multi-channel cadence", ours: true, theirs: false, note: "Vapi handles single-call invocation; campaigns are your build." },
      { feature: "Hallucination guard out of the box", ours: true, theirs: false },
      { feature: "Real-deal-value attribution dashboard", ours: true, theirs: false },
      { feature: "Bring-your-own LLM and TTS providers", ours: false, theirs: true, note: "Vapi optimises for provider choice; we optimise for outcome." },
      { feature: "Lowest-level TTS streaming control", ours: false, theirs: true },
      { feature: "Time to live agent on real calls", ours: true, theirs: false, note: "Revenue Operator: 5 minutes. Vapi: weeks of integration work." },
      { feature: "Pricing model", ours: true, theirs: true, note: "Both flat-rate; Vapi adds per-minute and per-token charges on top of platform fees." },
    ],
  },
  {
    slug: "bland-ai",
    name: "Bland AI",
    positioning:
      "AI phone-call platform with developer-first APIs for outbound and inbound voice. Pay-as-you-go per-minute pricing.",
    pricingUrl: "https://www.bland.ai/pricing",
    hook: "Bland is a phone-call API. Revenue Operator is a revenue operations platform that happens to use phone calls. The difference shows up the day a customer says STOP, the day a state-specific TCPA holiday hits, the day a missed call needs to land in HubSpot — Bland leaves those problems with you. We solve them.",
    contrastBullets: [
      "Bland charges per minute on top of integration cost. We bundle it into a flat monthly with usage caps you can see.",
      "We ship the operations layer (compliance, CRM writeback, calendar, follow-ups, dashboards). Bland ships the call.",
      "Revenue attribution out of the box — Bland leaves attribution to your data team.",
    ],
    rows: [
      { feature: "AI voice answering (24/7)", ours: true, theirs: true },
      { feature: "TCPA holiday + per-state calling-hours enforcement", ours: true, theirs: false, note: "Phase 11a. Bland's API does not block calls outside legal windows by default." },
      { feature: "STOP / opt-out kills outbound + ends active call", ours: true, theirs: false, note: "Phase 7 Tasks 7.2/7.3. Bland leaves opt-out plumbing to integrators." },
      { feature: "Two-party recording consent injection (CA, FL, IL, etc.)", ours: true, theirs: false },
      { feature: "Hallucination guard with safe-deflection fallback", ours: true, theirs: false },
      { feature: "Built-in CRM writeback (HubSpot, Salesforce, Pipedrive)", ours: true, theirs: false },
      { feature: "Calendar integration with real-availability booking", ours: true, theirs: false },
      { feature: "Multi-channel cadence (call → SMS → email)", ours: true, theirs: false },
      { feature: "Real recovered-revenue attribution on dashboard", ours: true, theirs: false },
      { feature: "Plain-English agent setup, no code required", ours: true, theirs: false },
      { feature: "Per-minute pricing with no platform fee", ours: false, theirs: true, note: "Bland's per-minute model wins below ~50 calls/mo; ours wins above that with predictable monthly." },
    ],
  },
  {
    slug: "retell-ai",
    name: "Retell AI",
    positioning:
      "Voice agent platform with low-latency conversational APIs. Developer-focused, function-calling first, TTS-quality emphasis.",
    pricingUrl: "https://www.retellai.com/pricing",
    hook: "Retell prioritises conversational latency and TTS quality — both excellent. Revenue Operator prioritises end-to-end revenue outcomes — the call is one step. The day your phone rings, Retell delivers a great voice. We deliver a logged lead, a booked meeting, a CRM record, an opt-out flag, and a recovered-$ attribution row.",
    contrastBullets: [
      "Retell ships the conversation. We ship the conversation plus what happens next.",
      "Compliance-by-default: STOP keywords, two-party recording, holiday-aware TCPA — all enforced server-side.",
      "Built-in dashboards proving recovered revenue per workspace; Retell expects you to build that yourself.",
    ],
    rows: [
      { feature: "AI voice answering (24/7)", ours: true, theirs: true },
      { feature: "Sub-second TTS first-token latency", ours: true, theirs: true },
      { feature: "TCPA holiday + per-state hour windows", ours: true, theirs: false },
      { feature: "STOP keyword ends active call", ours: true, theirs: false },
      { feature: "Hallucination guard (Phase 12c.5)", ours: true, theirs: false },
      { feature: "Plain-English configuration without code", ours: true, theirs: false },
      { feature: "Built-in CRM writeback (HubSpot/Salesforce/Pipedrive)", ours: true, theirs: false },
      { feature: "Calendar integration", ours: true, theirs: false },
      { feature: "Outbound multi-channel cadence", ours: true, theirs: false },
      { feature: "Real recovered-revenue dashboard", ours: true, theirs: false },
      { feature: "Direct LLM + TTS provider selection", ours: false, theirs: true },
      { feature: "Custom voice cloning workflow", ours: true, theirs: true },
    ],
  },
  {
    slug: "synthflow",
    name: "Synthflow",
    positioning:
      "No-code AI voice agent builder targeting SMBs with industry templates and a visual conversation editor.",
    pricingUrl: "https://synthflow.ai/pricing",
    hook: "Synthflow is the closest to us in approach — no-code, SMB-focused, template-driven. The differences are depth: compliance, the breadth of CRM integrations, the recovered-revenue attribution dashboard, and the AI-tailored unlimited-industry path so you're never stuck with a template that doesn't fit.",
    contrastBullets: [
      "Unlimited industries via AI tailoring. No template ceiling — type your industry and we generate the pack.",
      "Compliance shipped, not selectable: TCPA holidays, DNC, two-party recording all enforced.",
      "Real recovered-revenue attribution on the dashboard, not just call volume.",
    ],
    rows: [
      { feature: "AI voice answering (24/7)", ours: true, theirs: true },
      { feature: "No-code configuration", ours: true, theirs: true },
      { feature: "Industry templates", ours: true, theirs: true },
      { feature: "AI-tailored unlimited custom industries (Phase 82)", ours: true, theirs: false, note: "Type any industry; we generate the agent pack in seconds." },
      { feature: "TCPA holiday + per-state hours", ours: true, theirs: false },
      { feature: "STOP keyword + DNC enforcement", ours: true, theirs: false },
      { feature: "Two-party recording consent automation", ours: true, theirs: false },
      { feature: "Hallucination guard out of the box", ours: true, theirs: false },
      { feature: "CRM writeback (HubSpot/Salesforce/Pipedrive)", ours: true, theirs: true, note: "Both ship CRM integrations; ours covers more providers + has incremental sync cursors." },
      { feature: "Calendar integration", ours: true, theirs: true },
      { feature: "Real recovered-revenue dashboard", ours: true, theirs: false },
      { feature: "Visual conversation editor", ours: false, theirs: true, note: "Synthflow's visual editor is excellent for branching flows; we use plain-English editing instead." },
    ],
  },
];

export function getAiCompetitor(slug: string): AiCompetitor | null {
  return AI_COMPETITORS.find((c) => c.slug === slug) ?? null;
}
