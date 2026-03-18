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
    name: "Solo",
    priceMonthly: "$49",
    priceAnnual: "$39",
    period: "/mo",
    description: "For solo operators who need every call answered and every follow-up sent.",
    features: [
      "1 AI agent",
      "100 voice minutes/month",
      "10 active follow-ups",
      "Appointment booking",
      "Missed call recovery",
      "Call transcripts",
      "SMS follow-up",
      "Basic analytics",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: false,
  },
  {
    name: "Business",
    priceMonthly: "$297",
    priceAnnual: "$247",
    period: "/mo",
    description: "The complete revenue recovery system for service businesses.",
    features: [
      "3 AI agents",
      "500 voice minutes/month",
      "Unlimited follow-ups",
      "No-show recovery",
      "Outbound campaigns",
      "Reactivation sequences",
      "Industry templates",
      "SMS + email + voice follow-up",
      "Revenue analytics",
      "CRM webhook",
      "5 team seats",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: true,
  },
  {
    name: "Scale",
    priceMonthly: "$997",
    priceAnnual: "$847",
    period: "/mo",
    description: "For teams, high volume, multi-location, and agencies.",
    features: [
      "10 AI agents",
      "3,000 voice minutes/month",
      "Unlimited team seats",
      "Power dialer",
      "Advanced outbound campaigns",
      "Advanced analytics + benchmarks",
      "Custom workflows",
      "API access",
      "Native CRM sync",
      "Premium voice pack",
      "Priority support",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: false,
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    period: "",
    description: "White-label, SSO, custom compliance, dedicated manager, SLA.",
    features: [
      "White label",
      "Custom compliance",
      "SSO",
      "Dedicated success manager",
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
  { q: "How does the free trial work?", a: "14 days, full features on your selected plan, no credit card required. Connect your phone number and your AI starts handling calls immediately." },
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
  { category: "Core", name: "Voice minutes / month", solo: "100", business: "500", scale: "3,000", enterprise: "Custom" },
  { category: "Core", name: "AI agents", solo: "1", business: "3", scale: "10", enterprise: "Custom" },
  { category: "Core", name: "Follow-ups", solo: "10 active", business: "Unlimited", scale: "Unlimited", enterprise: "Unlimited" },
  { category: "Core", name: "Team seats", solo: "1", business: "5", scale: "Unlimited", enterprise: "Unlimited" },
  { category: "Core", name: "Phone numbers", solo: "1", business: "3", scale: "10", enterprise: "Custom" },
  { category: "Features", name: "Appointment booking", solo: "✓", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Missed call recovery", solo: "✓", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "No-show recovery", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Reactivation campaigns", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Outbound campaigns", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Power dialer", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Industry templates", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Revenue analytics", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Advanced analytics", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "CRM webhook", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Native CRM sync", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "API access", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Premium voices", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Support", name: "Priority support", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Pricing", name: "Overage rate", solo: "$0.30/min", business: "$0.20/min", scale: "$0.12/min", enterprise: "Negotiated" },
] as const;

/** Timezones grouped by region for workspace scheduling (Phase 1 Task 8) */
export const TIMEZONES_BY_REGION: { region: string; zones: string[] }[] = [
  { region: "Americas", zones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Toronto", "America/Vancouver", "America/Mexico_City", "America/Sao_Paulo", "America/Buenos_Aires"] },
  { region: "Europe", zones: ["Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Amsterdam", "Europe/Rome", "Europe/Stockholm", "Europe/Zurich"] },
  { region: "Asia Pacific", zones: ["Asia/Tokyo", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore", "Asia/Seoul", "Asia/Kolkata", "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland"] },
  { region: "UTC", zones: ["UTC"] },
];
