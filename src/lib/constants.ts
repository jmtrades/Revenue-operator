export const ROUTES = {
  START: "/sign-in?create=1",
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

export const SOLUTIONS_LINKS = [
  { label: "Plumbing & HVAC", href: "/industries/plumbing-hvac" },
  { label: "Dental", href: "/industries/dental" },
  { label: "Legal", href: "/industries/legal" },
  { label: "Real Estate", href: "/industries/real-estate" },
  { label: "Healthcare", href: "/industries/healthcare" },
  { label: "All use cases →", href: "/sign-in?create=1" },
] as const;

export const FOOTER_SOLUTIONS = [
  { label: "Plumbing & HVAC", href: "/industries/plumbing-hvac" },
  { label: "Dental", href: "/industries/dental" },
  { label: "Legal", href: "/industries/legal" },
  { label: "Real Estate", href: "/industries/real-estate" },
  { label: "Healthcare", href: "/industries/healthcare" },
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
    href: "/sign-in?create=1",
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
    href: "/sign-in?create=1",
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
    href: "/sign-in?create=1",
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

export const FOOTER_USE_CASES = [
  { label: "Inbound Calls", href: "/product#answers-every-call" },
  { label: "Outbound Campaigns", href: "/product#outbound" },
  { label: "Appointment Scheduling", href: "/product#appointments" },
  { label: "Lead Follow-Up", href: "/product#leads" },
  { label: "After-Hours Coverage", href: "/product" },
  { label: "Call Screening", href: "/product" },
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
