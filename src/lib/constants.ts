export const ROUTES = {
  START: "/activate",
  SIGN_IN: "/sign-in",
  PRICING: "/pricing",
  PRODUCT: "/product",
  DOCS: "/docs",
  CONTACT: "/contact",
  DEMO: "/demo",
  ONBOARDING: "/onboarding",
  BOOK_DEMO: "/contact",
} as const;

export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, label: "Product" },
  { href: ROUTES.PRICING, label: "Pricing" },
  { href: ROUTES.DOCS, label: "Documentation" },
] as const;

export const PRICING_TIERS = [
  {
    name: "Starter",
    priceMonthly: "$49",
    priceAnnual: "$39",
    period: "/mo",
    description: "For solo operators",
    features: [
      "1 AI agent",
      "Unlimited inbound calls",
      "50 outbound calls/month",
      "Call recording + transcription",
      "AI summaries",
      "Lead capture + instant alerts",
      "100 texts/month",
      "1 phone number",
      "Mobile app",
    ],
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Professional",
    priceMonthly: "$149",
    priceAnnual: "$119",
    period: "/mo",
    description: "For growing businesses",
    features: [
      "3 AI agents",
      "Unlimited inbound + 500 outbound/month",
      "Appointment booking (calendar sync)",
      "Unlimited texts",
      "Emergency routing",
      "Custom AI training",
      "Follow-up sequences",
      "Campaign builder",
      "Team members (up to 5)",
      "Analytics",
      "Review requests",
      "Spam filtering",
    ],
    cta: "Start free",
    href: "/activate",
    popular: true,
  },
  {
    name: "Business",
    priceMonthly: "$349",
    priceAnnual: "$279",
    period: "/mo",
    description: "For established businesses",
    features: [
      "Unlimited AI agents",
      "Unlimited calls (inbound + outbound)",
      "Unlimited texts",
      "Everything in Professional",
      "Unlimited team members",
      "Multi-location support",
      "Compliance records + export",
      "CRM integrations",
      "API + webhooks",
      "Custom AI voices",
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
    description: "Custom",
    features: [
      "White label",
      "Custom compliance frameworks",
      "SSO + SAML",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "Volume pricing",
    ],
    cta: "Talk to sales",
    href: "/contact",
    popular: false,
  },
] as const;

export const FOOTER_PRODUCT = [
  { label: "Features", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
  { label: "Changelog", href: "/docs#changelog" },
  { label: "API", href: "/docs#api" },
] as const;

export const FOOTER_COMPANY = [
  { label: "About", href: "/product" },
  { label: "Contact", href: "/contact" },
] as const;

export const FOOTER_LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export const PRICING_FAQ = [
  { q: "Can I switch plans later?", a: "Yes. You can upgrade or downgrade at any time. Changes take effect at the start of the next billing period." },
  { q: "What counts as a governed call?", a: "Any voice call that is recorded, transcribed, and stored under your declared jurisdiction and compliance framework." },
  { q: "Is there a free trial?", a: "All plans include a 14-day free trial. No credit card required to start." },
  { q: "Do you offer annual billing?", a: "Annual billing is available for Growth and Team. Two months are applied without interruption on annual commitment." },
  { q: "What compliance frameworks are supported?", a: "Recall Touch supports jurisdiction-based controls (US, UK, EU) and configurable review depth (preview required, approval required, or standard)." },
  { q: "Can I export my records?", a: "Yes. All plans include an audit trail. Team plans include full export and API access for record retrieval." },
  { q: "What happens if I exceed my call limit?", a: "We will notify you before you reach your limit. You can upgrade your plan or add capacity. No automatic overage charges." },
  { q: "Do you offer volume discounts?", a: "Team and enterprise plans support custom pricing and volume discounts. Contact us for details." },
] as const;

export const COMPARISON_FEATURES = [
  { category: "Core", name: "AI agents", starter: "1", professional: "3", business: "Unlimited", enterprise: "Custom" },
  { category: "Core", name: "Outbound calls/mo", starter: "50", professional: "500", business: "Unlimited", enterprise: "Custom" },
  { category: "Features", name: "Appointment booking", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Campaign builder", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Compliance export", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
  { category: "Support", name: "Priority support", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
] as const;
