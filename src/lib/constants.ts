/** Phone marketplace + API: single source of truth for supported country codes */
export const SUPPORTED_PHONE_COUNTRIES = [
  "US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE",
  "NO", "DK", "FI", "IE", "AT", "CH", "BE", "PT", "JP", "BR",
  "MX", "IN", "SG", "HK", "NZ", "ZA", "IL", "PL", "CZ",
] as const;

export const ROUTES = {
  /** Core flow: Homepage → Start free → /activate → success → /app/onboarding → /app/activity */
  START: "/activate",
  SIGN_IN: "/sign-in",
  PRICING: "/pricing",
  PRODUCT: "/product",
  DOCS: "/docs",
  CONTACT: "/contact",
  DEMO: "/demo",
  ONBOARDING: "/onboarding",
  BOOK_DEMO: "/demo",
} as const;

export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, labelKey: "product" },
  { href: ROUTES.PRICING, labelKey: "pricing" },
  { href: ROUTES.DEMO, labelKey: "demo" },
  { href: ROUTES.DOCS, labelKey: "docs" },
] as const;

export const SOLUTIONS_LINKS = [
  { labelKey: "industryPlumbing", href: "/industries/plumbing-hvac" },
  { labelKey: "industryDental", href: "/industries/dental" },
  { labelKey: "industryLegal", href: "/industries/legal" },
  { labelKey: "industryRealEstate", href: "/industries/real-estate" },
  { labelKey: "industryHealthcare", href: "/industries/healthcare" },
  { labelKey: "allUseCases", href: "/activate" },
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
    priceMonthly: "$297",
    priceAnnual: "$247",
    period: "/mo",
    description: "Answer every call. One number, one agent.",
    features: [
      "400 inbound min included",
      "50 outbound calls",
      "100 SMS",
      "1 AI agent",
      "1 phone number",
      "Overage: $0.25/min",
    ],
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Growth",
    priceMonthly: "$497",
    priceAnnual: "$416",
    period: "/mo",
    description: "One recovered lead pays for the whole month",
    features: [
      "1,500 inbound min included",
      "500 outbound calls",
      "500 SMS",
      "3 AI agents",
      "3 numbers",
      "Appointment booking",
      "Follow-up sequences",
      "Analytics",
      "Overage: $0.18/min",
    ],
    cta: "Start free",
    href: "/activate",
    popular: true,
  },
  {
    name: "Scale",
    priceMonthly: "$2,400",
    priceAnnual: "$1,583",
    period: "/mo",
    description: "Full AI communication team for a fraction of one hire",
    features: [
      "5,000 inbound min included",
      "2,000 outbound calls",
      "Unlimited SMS",
      "Unlimited AI agents",
      "10 numbers",
      "Multi-location",
      "Compliance",
      "API",
      "Priority support",
      "Overage: $0.12/min",
    ],
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    period: "",
    description: "Custom pricing — white label, custom compliance, SSO, dedicated manager, SLA",
    features: [
      "White label",
      "Custom compliance",
      "SSO",
      "Dedicated manager",
      "SLA",
    ],
    cta: "Talk to sales",
    href: "/contact",
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
  { q: "How does the free trial work?", a: "14 days, full features, no credit card needed." },
  { q: "What if I exceed my minutes?", a: "Calls continue at overage rate, never cut off." },
  { q: "Can I keep my existing number?", a: "Yes, forward it to your Recall Touch number." },
  { q: "What voices are available?", a: "6 included, premium via add-on $29/mo." },
  { q: "Is there a contract?", a: "No, month-to-month, cancel anytime." },
  { q: "Do you support HIPAA?", a: "Yes, add-on $99/mo with BAA." },
  { q: "What integrations?", a: "Google Calendar, Outlook, HubSpot, Zapier. API on Scale+." },
  { q: "How is this different from an answering service?", a: "24/7, handles outbound, costs 90% less." },
  { q: "What happens after hours?", a: "Answers following your after-hours rules." },
  { q: "Can I try before buying?", a: "14-day trial or use the interactive demo right now." },
  { q: "How do I cancel?", a: "Settings → Billing → Cancel. Effective at period end." },
  { q: "How does billing work?", a: "Monthly or annual. Included minutes plus overage per minute." },
] as const;

export const COMPARISON_FEATURES = [
  { category: "Core", name: "Inbound min/mo", starter: "400", professional: "1,500", business: "5,000", enterprise: "Custom" },
  { category: "Core", name: "AI agents", starter: "1", professional: "3", business: "Unlimited", enterprise: "Custom" },
  { category: "Core", name: "Outbound calls/mo", starter: "50", professional: "500", business: "2,000", enterprise: "Custom" },
  { category: "Core", name: "SMS included", starter: "100", professional: "500", business: "Unlimited", enterprise: "Custom" },
  { category: "Features", name: "Inbox (unified messaging)", starter: "✓", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Knowledge base", starter: "✓", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Appointment booking", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Outbound campaigns", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "API access", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Compliance export", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
  { category: "Support", name: "Priority support", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
] as const;

/** Timezones grouped by region for workspace scheduling (Phase 1 Task 8) */
export const TIMEZONES_BY_REGION: { region: string; zones: string[] }[] = [
  { region: "Americas", zones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Toronto", "America/Vancouver", "America/Mexico_City", "America/Sao_Paulo", "America/Buenos_Aires"] },
  { region: "Europe", zones: ["Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Amsterdam", "Europe/Rome", "Europe/Stockholm", "Europe/Zurich"] },
  { region: "Asia Pacific", zones: ["Asia/Tokyo", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore", "Asia/Seoul", "Asia/Kolkata", "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland"] },
  { region: "UTC", zones: ["UTC"] },
];
