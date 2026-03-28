/** Phone marketplace + API: single source of truth for supported country codes */
export const SUPPORTED_PHONE_COUNTRIES = [
  "US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE",
  "NO", "DK", "FI", "IE", "AT", "CH", "BE", "PT", "JP", "BR",
  "MX", "IN", "SG", "HK", "NZ", "ZA", "IL", "PL", "CZ",
] as const;

export const ROUTES = {
  /** Core flow: Homepage → Start → /activate → success → /app/onboarding → /app/dashboard */
  START: "/activate",
  SIGN_IN: "/sign-in",
  PRICING: "/pricing",
  PRODUCT: "/product",
  DOCS: "/docs",
  CONTACT: "/contact",
  DEMO: "/demo",
  ONBOARDING: "/activate",
  BOOK_DEMO: "/demo",
} as const;

/** Single source of truth for marketing social proof stats.
 *  Update here — not in individual components. */
export const SOCIAL_PROOF = {
  businessCount: "12,400+",
  callsHandled: "8.7M+",
  revenueRecovered: "$340M+",
  industryCount: "200+",
  stateCount: "47",
} as const;

export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, labelKey: "product" },
  { href: ROUTES.PRICING, labelKey: "pricing" },
  { href: ROUTES.DEMO, labelKey: "demo" },
] as const;

export const SOLUTIONS_LINKS = [
  { labelKey: "industryPlumbing", href: "/industries/plumbing-hvac" },
  { labelKey: "industryDental", href: "/industries/dental" },
  { labelKey: "industryLegal", href: "/industries/legal" },
  { labelKey: "industryRealEstate", href: "/industries/real-estate" },
  { labelKey: "industryHealthcare", href: "/industries/healthcare" },
  { labelKey: "industryAutoRepair", href: "/industries/auto-repair" },
  { labelKey: "industryConstruction", href: "/industries/construction" },
  { labelKey: "industryInsurance", href: "/industries/insurance" },
  { labelKey: "viewAllIndustries", href: "/industries" },
] as const;

export const FOOTER_SOLUTIONS = [
  { labelKey: "solutions.plumbingHvac", href: "/industries/plumbing-hvac" },
  { labelKey: "solutions.dental", href: "/industries/dental" },
  { labelKey: "solutions.legal", href: "/industries/legal" },
  { labelKey: "solutions.realEstate", href: "/industries/real-estate" },
  { labelKey: "solutions.healthcare", href: "/industries/healthcare" },
] as const;

export const PRICING_TIERS = [
  {
    name: "Starter",
    slug: "solo",
    priceMonthly: "$147",
    priceAnnual: "$117",
    period: "/mo",
    description: "One AI agent that answers and follows up.",
    features: [
      "1 AI agent",
      "1,000 voice minutes/month",
      "1 phone number",
      "Appointment booking",
      "Call transcripts",
      "SMS follow-up",
      "Email support",
    ],
    cta: "Get started today",
    href: "/activate",
    popular: false,
  },
  {
    name: "Growth",
    slug: "business",
    priceMonthly: "$297",
    priceAnnual: "$237",
    period: "/mo",
    description: "Multi-agent revenue operations.",
    features: [
      "5 AI agents",
      "3,000 voice minutes/month",
      "5 phone numbers",
      "No-show recovery",
      "Reactivation campaigns",
      "Industry templates",
      "SMS + email + voice",
      "Revenue analytics",
      "CRM webhook",
      "Priority support",
    ],
    cta: "Get started today",
    href: "/activate",
    popular: true,
  },
  {
    name: "Business",
    slug: "scale",
    priceMonthly: "$597",
    priceAnnual: "$477",
    period: "/mo",
    description: "Full-scale AI call center.",
    features: [
      "15 AI agents",
      "8,000 voice minutes/month",
      "15 phone numbers",
      "Outbound campaigns",
      "Speed-to-lead (60s callback)",
      "Advanced analytics",
      "API access",
      "Phone support",
    ],
    cta: "Get started today",
    href: "/activate",
    popular: false,
  },
  {
    name: "Agency",
    slug: "enterprise",
    priceMonthly: "$997",
    priceAnnual: "$797",
    period: "/mo",
    description: "White-label AI for your clients.",
    features: [
      "Unlimited AI agents",
      "15,000 voice minutes/month",
      "Unlimited phone numbers",
      "White-label branding",
      "Multi-client dashboard",
      "Custom voice training",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Get started today",
    href: "/activate",
    popular: false,
  },
] as const;

export const FOOTER_PRODUCT = [
  { labelKey: "productLinks.bookDemo", href: "/demo" },
  { labelKey: "productLinks.features", href: "/product" },
  { labelKey: "productLinks.pricing", href: "/pricing" },
  { labelKey: "productLinks.documentation", href: "/docs" },
  { labelKey: "productLinks.changelog", href: "/docs#changelog" },
  { labelKey: "productLinks.api", href: "/docs#api" },
] as const;

export const FOOTER_COMPANY = [
  { labelKey: "companyLinks.about", href: "/contact" },
  { labelKey: "companyLinks.blog", href: "/blog" },
  { labelKey: "companyLinks.contact", href: "/contact" },
] as const;

export const FOOTER_USE_CASES = [
  { labelKey: "useCases.inboundCalls", href: "/product#answers-every-call" },
  { labelKey: "useCases.outboundCampaigns", href: "/product#outbound" },
  { labelKey: "useCases.appointmentScheduling", href: "/product#appointments" },
  { labelKey: "useCases.leadFollowUp", href: "/product#leads" },
  { labelKey: "useCases.afterHoursCoverage", href: "/product" },
  { labelKey: "useCases.callScreening", href: "/product" },
] as const;

export const FOOTER_LEGAL = [
  { labelKey: "legal.privacy", href: "/privacy" },
  { labelKey: "legal.terms", href: "/terms" },
] as const;

export const PRICING_FAQ = [
  { q: "How does getting started work?", a: "Sign up, choose your plan, and your AI agent is live in minutes. All plans include full access to every feature." },
  { q: "What if I exceed my included minutes?", a: "Your calls never get cut off. Overage minutes are billed at your plan's per-minute rate. We alert you as you approach your limit." },
  { q: "Can I keep my existing phone number?", a: "Yes. Forward your existing number to your Recall Touch number. Your callers won't notice any difference." },
  { q: "What voices are available?", a: "6 natural-sounding voices included on all plans. Premium voices available as an add-on for $29/month." },
  { q: "Is there a contract?", a: "No. Month-to-month. Cancel anytime from your dashboard. Annual plans available at a 17% discount." },
  { q: "Do you support HIPAA?", a: "HIPAA-compliant configuration with BAA is available as an add-on for healthcare practices. Contact us for details." },
  { q: "What integrations are available?", a: "Google Calendar and Outlook on all plans. CRM webhook on Business+. Native CRM sync and API on Scale+." },
  { q: "How is this different from an AI answering service?", a: "AI answering services answer your phone. Recall Touch answers, then follows up, books appointments, sends reminders, recovers no-shows, and reactivates cold leads. The answering is just the beginning." },
  { q: "What happens after hours?", a: "Your AI answers 24/7 following your configured after-hours rules — take messages, offer booking, or handle specific call types." },
  { q: "How fast is setup?", a: "About 5 minutes. Select your industry, connect your phone, and your AI is live with pre-built knowledge and follow-up workflows." },
] as const;

export const COMPARISON_FEATURES = [
  { category: "Core", name: "Voice minutes / month", solo: "1,000", business: "3,000", scale: "8,000", enterprise: "15,000" },
  { category: "Core", name: "AI agents", solo: "1", business: "5", scale: "15", enterprise: "Unlimited" },
  { category: "Core", name: "Follow-ups", solo: "SMS + email", business: "SMS + email + voice", scale: "SMS + email + voice", enterprise: "Unlimited" },
  { category: "Core", name: "Team seats", solo: "1", business: "5", scale: "Unlimited", enterprise: "Unlimited" },
  { category: "Core", name: "Phone numbers", solo: "1", business: "5", scale: "15", enterprise: "Unlimited" },
  { category: "Features", name: "Appointment booking", solo: "✓", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Inbound call handling", solo: "✓", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "No-show recovery", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Reactivation campaigns", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Outbound campaigns", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Speed-to-lead (60s callback)", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Industry templates", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Revenue analytics", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Advanced analytics", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "CRM webhook", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Native CRM sync", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "API access", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "White-label branding", solo: "—", business: "—", scale: "—", enterprise: "✓" },
  { category: "Support", name: "Priority support", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Pricing", name: "Overage rate", solo: "$0.10/min", business: "$0.10/min", scale: "$0.08/min", enterprise: "$0.07/min" },
] as const;

/** Timezones grouped by region for workspace scheduling (Phase 1 Task 8) */
export const TIMEZONES_BY_REGION: { region: string; zones: string[] }[] = [
  { region: "Americas", zones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Toronto", "America/Vancouver", "America/Mexico_City", "America/Sao_Paulo", "America/Buenos_Aires"] },
  { region: "Europe", zones: ["Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Amsterdam", "Europe/Rome", "Europe/Stockholm", "Europe/Zurich"] },
  { region: "Asia Pacific", zones: ["Asia/Tokyo", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore", "Asia/Seoul", "Asia/Kolkata", "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland"] },
  { region: "UTC", zones: ["UTC"] },
];
