export const ROUTES = {
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
  { href: ROUTES.PRODUCT, label: "Product" },
  { href: ROUTES.PRICING, label: "Pricing" },
  { href: ROUTES.DEMO, label: "Demo" },
  { href: ROUTES.DOCS, label: "Docs" },
] as const;

export const PRICING_TIERS = [
  {
    name: "Starter",
    priceMonthly: "$97",
    priceAnnual: "$81",
    period: "/mo",
    description: "For solo operators",
    features: [
      "200 inbound min included",
      "25 outbound calls",
      "50 SMS",
      "1 AI agent",
      "Call recording + transcription",
      "Lead capture + instant alerts",
      "1 phone number",
      "Overage: $0.35/min inbound",
    ],
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Growth",
    priceMonthly: "$247",
    priceAnnual: "$206",
    period: "/mo",
    description: "For growing businesses",
    features: [
      "750 inbound min included",
      "200 outbound calls",
      "200 SMS",
      "3 AI agents",
      "Appointment booking",
      "Campaign builder",
      "Analytics",
      "Overage: $0.28/min inbound",
    ],
    cta: "Start free",
    href: "/activate",
    popular: true,
  },
  {
    name: "Scale",
    priceMonthly: "$497",
    priceAnnual: "$414",
    period: "/mo",
    description: "For established businesses",
    features: [
      "2,500 inbound min included",
      "750 outbound calls",
      "Unlimited SMS",
      "Unlimited AI agents",
      "Multi-location",
      "Compliance + export",
      "API + webhooks",
      "Priority support",
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
    description: "Volume pricing, min $997/mo",
    features: [
      "White label",
      "Custom compliance",
      "SSO + SAML",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Talk to sales",
    href: "/contact",
    popular: false,
  },
] as const;

export const FOOTER_PRODUCT = [
  { label: "Book a demo", href: "/demo" },
  { label: "Features", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
  { label: "Changelog", href: "/docs#changelog" },
  { label: "API", href: "/docs#api" },
] as const;

export const FOOTER_COMPANY = [
  { label: "About", href: "/contact" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

export const FOOTER_LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
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
  { category: "Core", name: "Inbound min/mo", starter: "200", professional: "750", business: "2,500", enterprise: "Custom" },
  { category: "Core", name: "AI agents", starter: "1", professional: "3", business: "Unlimited", enterprise: "Custom" },
  { category: "Core", name: "Outbound calls/mo", starter: "25", professional: "200", business: "750", enterprise: "Custom" },
  { category: "Features", name: "Appointment booking", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Campaign builder", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Compliance export", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
  { category: "Support", name: "Priority support", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
] as const;
